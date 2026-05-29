const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { 
  initDb, 
  encrypt, 
  decrypt, 
  dbRun, 
  dbAll, 
  dbGet,
  dbTransaction
} = require('../src/database');

const { 
  calculateMonthlyPayroll, 
  calculateDecemberPayroll 
} = require('../src/ter_calculator');

const { logAudit } = require('../src/audit_logger');
const { generateBankFile } = require('../src/bank_export');
const { generatePayslipPdf } = require('../src/pdf_generator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Simple Authorization Middleware using HTTP headers for multi-role simulation
function checkRole(allowedRoles) {
  return (req, res, next) => {
    const role = req.headers['x-role'] || 'Karyawan';
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    req.userRole = role;
    req.userId = userId;

    if (allowedRoles.includes('*') || allowedRoles.includes(role)) {
      return next();
    }
    
    return res.status(403).json({ 
      error: `Forbidden: Role '${role}' does not have access to this action.` 
    });
  };
}

// Ensure writeable payslip directory exists in /tmp (required for Serverless environments like Vercel)
const PAYSLIPS_DIR = path.join('/tmp', 'payslips');
if (!fs.existsSync(PAYSLIPS_DIR)) {
  fs.mkdirSync(PAYSLIPS_DIR, { recursive: true });
}

// ==========================================
// 1. DASHBOARD & ANALYTICS ENDPOINTS
// ==========================================

app.get('/api/dashboard/summary', checkRole(['*']), async (req, res) => {
  try {
    const empCount = await dbGet('SELECT COUNT(*) as count FROM employees');
    const lastRun = await dbGet('SELECT * FROM payroll_runs ORDER BY period DESC LIMIT 1');
    
    let totalPayrollCost = 0;
    let pendingApprovals = 0;

    if (lastRun) {
      const sumCost = await dbGet('SELECT SUM(net_salary) as sum FROM payroll_details WHERE payroll_run_id = ?', [lastRun.id]);
      totalPayrollCost = sumCost.sum || 0;
    }

    const pending = await dbAll("SELECT COUNT(*) as count FROM payroll_runs WHERE status = 'SUBMITTED'");
    pendingApprovals = pending[0].count;

    // Get trend data (last 6 months)
    const trend = await dbAll(`
      SELECT r.period, SUM(d.net_salary) as total_net, SUM(d.gross_salary) as total_gross
      FROM payroll_runs r
      JOIN payroll_details d ON r.id = d.payroll_run_id
      WHERE r.status = 'APPROVED'
      GROUP BY r.period
      ORDER BY r.period DESC
      LIMIT 6
    `);

    res.json({
      totalEmployees: empCount.count,
      lastPeriod: lastRun ? lastRun.period : 'None',
      lastPeriodStatus: lastRun ? lastRun.status : 'N/A',
      lastPeriodCost: totalPayrollCost,
      pendingApprovals,
      payrollTrend: trend.reverse()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. EMPLOYEE ENDPOINTS (CRUD)
// ==========================================

// Get all employees
app.get('/api/employees', checkRole(['Super Admin / IT Tech', 'HR Payroll Specialist', 'Finance / Accounting', 'Management / Direksi', 'Karyawan']), async (req, res) => {
  try {
    const role = req.userRole;
    const userId = req.userId;

    let rows;
    if (role === 'Karyawan') {
      // Employees can only see their own profile
      rows = await dbAll('SELECT * FROM employees WHERE nik = ?', [userId]);
    } else {
      rows = await dbAll('SELECT * FROM employees ORDER BY id DESC');
    }

    // Decrypt sensitive fields
    const decryptedRows = rows.map(emp => {
      const decryptedEmp = {
        ...emp,
        bank_account: decrypt(emp.bank_account_encrypted),
        basic_salary: parseFloat(decrypt(emp.basic_salary_encrypted) || '0'),
        allowance_fixed: parseFloat(decrypt(emp.allowance_fixed_encrypted) || '0')
      };
      
      // Delete encrypted fields before sending to client
      delete decryptedEmp.bank_account_encrypted;
      delete decryptedEmp.basic_salary_encrypted;
      delete decryptedEmp.allowance_fixed_encrypted;

      return decryptedEmp;
    });

    res.json(decryptedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single employee
app.get('/api/employees/:id', checkRole(['Super Admin / IT Tech', 'HR Payroll Specialist', 'Karyawan']), async (req, res) => {
  try {
    const emp = await dbGet('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    // Restrict employee access to their own record
    if (req.userRole === 'Karyawan' && emp.nik !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    emp.bank_account = decrypt(emp.bank_account_encrypted);
    emp.basic_salary = parseFloat(decrypt(emp.basic_salary_encrypted) || '0');
    emp.allowance_fixed = parseFloat(decrypt(emp.allowance_fixed_encrypted) || '0');
    
    delete emp.bank_account_encrypted;
    delete emp.basic_salary_encrypted;
    delete emp.allowance_fixed_encrypted;

    res.json(emp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create employee
app.post('/api/employees', checkRole(['Super Admin / IT Tech', 'HR Payroll Specialist']), async (req, res) => {
  const { 
    nik, name, position, status, ptkp, bank_name, bank_account, 
    bpjs_ks_id, bpjs_tk_id, basic_salary, allowance_fixed, 
    allowance_transport, allowance_meal, email, birth_date 
  } = req.body;

  // Validation Rules (EPIC 7 Validation)
  if (!/^\d+$/.test(bank_account)) {
    return res.status(400).json({ error: 'Nomor Rekening harus berupa angka saja!' });
  }

  const validPTKP = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3', 'K/I/0', 'K/I/1', 'K/I/2', 'K/I/3'];
  let finalizedPTKP = ptkp;
  if (!validPTKP.includes(ptkp)) {
    finalizedPTKP = 'TK/0'; // Default to TK/0 if invalid
  }

  if (Number(basic_salary) <= 0) {
    return res.status(400).json({ error: 'Gaji Pokok tidak boleh bernilai 0 atau negatif!' });
  }

  try {
    // Encrypt sensitive data
    const bank_account_encrypted = encrypt(bank_account);
    const basic_salary_encrypted = encrypt(basic_salary);
    const allowance_fixed_encrypted = encrypt(allowance_fixed);

    const result = await dbRun(`
      INSERT INTO employees (
        nik, name, position, status, ptkp, bank_name, bank_account_encrypted,
        bpjs_ks_id, bpjs_tk_id, basic_salary_encrypted, allowance_fixed_encrypted,
        allowance_transport, allowance_meal, email, birth_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nik, name, position, status, finalizedPTKP, bank_name, bank_account_encrypted,
      bpjs_ks_id, bpjs_tk_id, basic_salary_encrypted, allowance_fixed_encrypted,
      allowance_transport || 0, allowance_meal || 0, email, birth_date
    ]);

    // Audit log
    await logAudit(
      req.userId, 
      'CREATE_EMPLOYEE', 
      null, 
      JSON.stringify({ id: result.id, nik, name }), 
      req
    );

    res.status(201).json({ id: result.id, message: 'Employee created successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Karyawan dengan NIK tersebut sudah terdaftar!' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update employee
app.put('/api/employees/:id', checkRole(['Super Admin / IT Tech', 'HR Payroll Specialist']), async (req, res) => {
  const { 
    nik, name, position, status, ptkp, bank_name, bank_account, 
    bpjs_ks_id, bpjs_tk_id, basic_salary, allowance_fixed, 
    allowance_transport, allowance_meal, email, birth_date 
  } = req.body;

  // Validation Rules
  if (bank_account && !/^\d+$/.test(bank_account)) {
    return res.status(400).json({ error: 'Nomor Rekening harus berupa angka saja!' });
  }

  if (basic_salary !== undefined && Number(basic_salary) <= 0) {
    return res.status(400).json({ error: 'Gaji Pokok tidak boleh bernilai 0 atau negatif!' });
  }

  try {
    const oldEmp = await dbGet('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!oldEmp) return res.status(404).json({ error: 'Employee not found' });

    // Decrypt old values for auditing
    const decryptedOldEmp = {
      nik: oldEmp.nik,
      name: oldEmp.name,
      basic_salary: parseFloat(decrypt(oldEmp.basic_salary_encrypted) || '0'),
      bank_account: decrypt(oldEmp.bank_account_encrypted)
    };

    // Encrypt updated values
    const bank_account_encrypted = bank_account ? encrypt(bank_account) : oldEmp.bank_account_encrypted;
    const basic_salary_encrypted = basic_salary !== undefined ? encrypt(basic_salary) : oldEmp.basic_salary_encrypted;
    const allowance_fixed_encrypted = allowance_fixed !== undefined ? encrypt(allowance_fixed) : oldEmp.allowance_fixed_encrypted;

    await dbRun(`
      UPDATE employees SET
        nik = ?, name = ?, position = ?, status = ?, ptkp = ?, bank_name = ?,
        bank_account_encrypted = ?, bpjs_ks_id = ?, bpjs_tk_id = ?, 
        basic_salary_encrypted = ?, allowance_fixed_encrypted = ?,
        allowance_transport = ?, allowance_meal = ?, email = ?, birth_date = ?
      WHERE id = ?
    `, [
      nik || oldEmp.nik, 
      name || oldEmp.name, 
      position || oldEmp.position, 
      status || oldEmp.status, 
      ptkp || oldEmp.ptkp, 
      bank_name || oldEmp.bank_name, 
      bank_account_encrypted, 
      bpjs_ks_id || oldEmp.bpjs_ks_id, 
      bpjs_tk_id || oldEmp.bpjs_tk_id, 
      basic_salary_encrypted, 
      allowance_fixed_encrypted,
      allowance_transport !== undefined ? allowance_transport : oldEmp.allowance_transport, 
      allowance_meal !== undefined ? allowance_meal : oldEmp.allowance_meal, 
      email || oldEmp.email, 
      birth_date || oldEmp.birth_date,
      req.params.id
    ]);

    // Audit log
    await logAudit(
      req.userId, 
      'UPDATE_EMPLOYEE', 
      JSON.stringify(decryptedOldEmp), 
      JSON.stringify({ nik, name, basic_salary, bank_account }), 
      req
    );

    res.json({ message: 'Employee updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete employee
app.delete('/api/employees/:id', checkRole(['Super Admin / IT Tech']), async (req, res) => {
  try {
    const oldEmp = await dbGet('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!oldEmp) return res.status(404).json({ error: 'Employee not found' });

    await dbRun('DELETE FROM employees WHERE id = ?', [req.params.id]);

    // Audit log
    await logAudit(
      req.userId, 
      'DELETE_EMPLOYEE', 
      JSON.stringify({ id: oldEmp.id, nik: oldEmp.nik, name: oldEmp.name }), 
      null, 
      req
    );

    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 3. ATTENDANCE ENDPOINTS
// ==========================================

// Get attendance records for period
app.get('/api/attendance', checkRole(['Super Admin / IT Tech', 'HR Payroll Specialist', 'Finance / Accounting']), async (req, res) => {
  const period = req.query.period;
  if (!period) return res.status(400).json({ error: 'Period parameter (YYYY-MM) is required' });

  try {
    // Left join ensures all active employees show up, even if attendance isn't filled yet
    const rows = await dbAll(`
      SELECT e.id as employee_id, e.nik, e.name, e.position,
             a.id as attendance_id, a.days_present, a.days_late, a.days_absent,
             a.overtime_hours_first, a.overtime_hours_next, a.bonus, a.insentif, a.thr
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.period = ?
      ORDER BY e.id DESC
    `, [period]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save or sync attendance (batch/individual upsert)
app.post('/api/attendance', checkRole(['Super Admin / IT Tech', 'HR Payroll Specialist']), async (req, res) => {
  const { period, records } = req.body;
  if (!period || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Invalid payload. Period and records array required.' });
  }

  try {
    // Check if payroll run for this period is already approved (locked)
    const run = await dbGet('SELECT status FROM payroll_runs WHERE period = ?', [period]);
    if (run && run.status === 'APPROVED') {
      return res.status(400).json({ error: `Cannot update attendance. Payroll for ${period} is already approved and locked.` });
    }

    for (const rec of records) {
      await dbRun(`
        INSERT INTO attendance (
          employee_id, period, days_present, days_late, days_absent,
          overtime_hours_first, overtime_hours_next, bonus, insentif, thr
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(employee_id, period) DO UPDATE SET
          days_present = excluded.days_present,
          days_late = excluded.days_late,
          days_absent = excluded.days_absent,
          overtime_hours_first = excluded.overtime_hours_first,
          overtime_hours_next = excluded.overtime_hours_next,
          bonus = excluded.bonus,
          insentif = excluded.insentif,
          thr = excluded.thr
      `, [
        rec.employee_id, period, rec.days_present || 0, rec.days_late || 0, rec.days_absent || 0,
        rec.overtime_hours_first || 0, rec.overtime_hours_next || 0, rec.bonus || 0, rec.insentif || 0, rec.thr || 0
      ]);
    }

    await logAudit(
      req.userId, 
      'SAVE_ATTENDANCE', 
      null, 
      `Saved ${records.length} records for period ${period}`, 
      req
    );

    res.json({ message: 'Attendance records updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 4. PAYROLL PROCESSING ENGINE
// ==========================================

// List payroll runs
app.get('/api/payroll/runs', checkRole(['*']), async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM payroll_runs ORDER BY period DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate batch payroll (one-click engine)
app.post('/api/payroll/runs/generate', checkRole(['Super Admin / IT Tech', 'HR Payroll Specialist']), async (req, res) => {
  const { period } = req.body;
  if (!period) return res.status(400).json({ error: 'Period (YYYY-MM) is required' });

  try {
    // 1. Check lock status
    const run = await dbGet('SELECT * FROM payroll_runs WHERE period = ?', [period]);
    if (run && run.status === 'APPROVED') {
      return res.status(400).json({ error: `Payroll for period ${period} is already approved and locked.` });
    }

    // 2. Fetch all employees
    const employees = await dbAll('SELECT * FROM employees');
    if (employees.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data karyawan di sistem.' });
    }

    // 3. Upsert payroll run record
    let runId;
    await dbTransaction(async (tx) => {
      if (run) {
        runId = run.id;
        // Reset status to DRAFT on regeneration
        await tx.run("UPDATE payroll_runs SET status = 'DRAFT', rejection_notes = NULL WHERE id = ?", [runId]);
        // Clear old details
        await tx.run('DELETE FROM payroll_details WHERE payroll_run_id = ?', [runId]);
      } else {
        const newRun = await tx.run('INSERT INTO payroll_runs (period, status) VALUES (?, ?)', [period, 'DRAFT']);
        runId = newRun.id;
      }

      // Identify if it's December (Annual progressive calculation)
      const isDecember = period.endsWith('-12');

      // 4. Batch Calculate for each employee
      for (const emp of employees) {
        // Decrypt credentials
        const employeeData = {
          id: emp.id,
          nik: emp.nik,
          name: emp.name,
          position: emp.position,
          ptkp: emp.ptkp,
          status: emp.status,
          basicSalary: parseFloat(decrypt(emp.basic_salary_encrypted) || '0'),
          allowanceFixed: parseFloat(decrypt(emp.allowance_fixed_encrypted) || '0'),
          allowanceTransport: emp.allowance_transport || 0,
          allowanceMeal: emp.allowance_meal || 0,
          birth_date: emp.birth_date
        };

        // Fetch attendance
        let att = await tx.get('SELECT * FROM attendance WHERE employee_id = ? AND period = ?', [emp.id, period]);
        if (!att) {
          // Fallback default attendance if not synced
          att = {
            days_present: 20,
            days_late: 0,
            days_absent: 0,
            overtime_hours_first: 0,
            overtime_hours_next: 0,
            bonus: 0,
            insentif: 0,
            thr: 0
          };
        }

        let calcResult;
        
        if (isDecember) {
          // Retrieve prior period history (Jan-Nov of current year)
          const yearPrefix = period.split('-')[0];
          const history = await tx.all(`
            SELECT pd.* 
            FROM payroll_details pd
            JOIN payroll_runs pr ON pd.payroll_run_id = pr.id
            WHERE pd.employee_id = ? 
              AND pr.period LIKE ?
              AND pr.period < ?
              AND pr.status = 'APPROVED'
          `, [emp.id, `${yearPrefix}-%`, period]);

          calcResult = calculateDecemberPayroll(employeeData, att, history);
        } else {
          // Standard Month
          calcResult = calculateMonthlyPayroll(employeeData, att);
        }

        // Save calculation results
        await tx.run(`
          INSERT INTO payroll_details (
            payroll_run_id, employee_id, basic_salary, allowance_fixed, allowance_variable,
            overtime_pay, bonus, insentif, thr, gross_salary,
            bpjs_ks_employee, bpjs_ks_company, bpjs_tk_jht_employee, bpjs_tk_jht_company,
            bpjs_tk_jp_employee, bpjs_tk_jp_company, bpjs_tk_jkk_company, bpjs_tk_jkm_company,
            pph21_rate, pph21_amount, net_salary
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          runId, emp.id, 
          calcResult.basic_salary, calcResult.allowance_fixed, calcResult.allowance_variable,
          calcResult.overtime_pay, calcResult.bonus, calcResult.insentif, calcResult.thr, calcResult.gross_salary,
          calcResult.bpjs_ks_employee, calcResult.bpjs_ks_company, 
          calcResult.bpjs_tk_jht_employee, calcResult.bpjs_tk_jht_company,
          calcResult.bpjs_tk_jp_employee, calcResult.bpjs_tk_jp_company,
          calcResult.bpjs_tk_jkk_company, calcResult.bpjs_tk_jkm_company,
          calcResult.pph21_rate, calcResult.pph21_amount, calcResult.net_salary
        ]);
      }
    });

    await logAudit(
      req.userId, 
      'GENERATE_PAYROLL', 
      null, 
      `Generated payroll draft for period ${period}. Total employees processed: ${employees.length}`, 
      req
    );

    res.json({ 
      message: `Payroll for period ${period} generated successfully in draft mode.`,
      runId 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit payroll to finance (requires HR)
app.post('/api/payroll/runs/submit', checkRole(['Super Admin / IT Tech', 'HR Payroll Specialist']), async (req, res) => {
  const { period } = req.body;
  
  try {
    const run = await dbGet('SELECT * FROM payroll_runs WHERE period = ?', [period]);
    if (!run) return res.status(404).json({ error: 'Payroll run not found.' });
    if (run.status !== 'DRAFT') {
      return res.status(400).json({ error: `Cannot submit. Payroll is already in ${run.status} status.` });
    }

    await dbRun(`
      UPDATE payroll_runs 
      SET status = 'SUBMITTED', submitted_by = ?, submitted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.userId, run.id]);

    await logAudit(req.userId, 'SUBMIT_PAYROLL', 'DRAFT', 'SUBMITTED', req);
    res.json({ message: `Payroll for ${period} submitted to Finance successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve payroll (requires Management/Direksi)
app.post('/api/payroll/runs/approve', checkRole(['Super Admin / IT Tech', 'Management / Direksi']), async (req, res) => {
  const { period } = req.body;
  
  try {
    const run = await dbGet('SELECT * FROM payroll_runs WHERE period = ?', [period]);
    if (!run) return res.status(404).json({ error: 'Payroll run not found.' });
    if (run.status !== 'SUBMITTED') {
      return res.status(400).json({ error: `Cannot approve. Payroll status is ${run.status} (must be SUBMITTED).` });
    }

    // Update status to APPROVED
    await dbRun(`
      UPDATE payroll_runs 
      SET status = 'APPROVED', approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.userId, run.id]);

    // EPIC 5: Automated Payslip Generation on approval
    // Get all calculated details
    const details = await dbAll('SELECT pd.*, e.nik, e.name, e.position, e.ptkp, e.status, e.bank_name, e.bank_account_encrypted, e.birth_date, e.email FROM payroll_details pd JOIN employees e ON pd.employee_id = e.id WHERE pd.payroll_run_id = ?', [run.id]);

    for (const d of details) {
      const employeeInfo = {
        nik: d.nik,
        name: d.name,
        position: d.position,
        ptkp: d.ptkp,
        status: d.status,
        bank_name: d.bank_name,
        birth_date: d.birth_date,
        email: d.email
      };

      const detailInfo = {
        ...d,
        bank_account: decrypt(d.bank_account_encrypted)
      };

      const slipFilename = `payslip_${d.nik}_${period}.pdf`;
      const slipPath = path.join(PAYSLIPS_DIR, period, slipFilename);

      // Generate secure encrypted PDF
      await generatePayslipPdf(employeeInfo, detailInfo, period, slipPath);

      // Update path in database
      const dbRelativePath = `/api/payroll/payslip/${d.employee_id}/${period}`;
      await dbRun('UPDATE payroll_details SET payslip_path = ? WHERE id = ?', [dbRelativePath, d.id]);
    }

    await logAudit(req.userId, 'APPROVE_PAYROLL', 'SUBMITTED', 'APPROVED', req);
    res.json({ message: `Payroll for ${period} approved. Slip Gaji PDF berhasil di-generate.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject payroll draft with notes (requires Finance or Management)
app.post('/api/payroll/runs/reject', checkRole(['Super Admin / IT Tech', 'Finance / Accounting', 'Management / Direksi']), async (req, res) => {
  const { period, notes } = req.body;
  if (!notes) return res.status(400).json({ error: 'Rejection notes are required.' });
  
  try {
    const run = await dbGet('SELECT * FROM payroll_runs WHERE period = ?', [period]);
    if (!run) return res.status(404).json({ error: 'Payroll run not found.' });
    if (run.status !== 'SUBMITTED') {
      return res.status(400).json({ error: `Cannot reject. Payroll status is ${run.status}.` });
    }

    await dbRun(`
      UPDATE payroll_runs 
      SET status = 'DRAFT', rejection_notes = ?, submitted_by = NULL, submitted_at = NULL
      WHERE id = ?
    `, [notes, run.id]);

    await logAudit(req.userId, 'REJECT_PAYROLL', 'SUBMITTED', `DRAFT (Notes: ${notes})`, req);
    res.json({ message: `Payroll for ${period} rejected and returned to draft mode.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get payroll run details (lists calculations per employee)
app.get('/api/payroll/runs/:period/details', checkRole(['Super Admin / IT Tech', 'HR Payroll Specialist', 'Finance / Accounting', 'Management / Direksi']), async (req, res) => {
  try {
    const run = await dbGet('SELECT * FROM payroll_runs WHERE period = ?', [req.params.period]);
    if (!run) return res.status(404).json({ error: 'Payroll run not found.' });

    const details = await dbAll(`
      SELECT d.*, e.nik, e.name, e.position, e.ptkp, e.bank_name, e.bank_account_encrypted
      FROM payroll_details d
      JOIN employees e ON d.employee_id = e.id
      WHERE d.payroll_run_id = ?
      ORDER BY e.name ASC
    `, [run.id]);

    // Decrypt bank account information
    const decryptedDetails = details.map(d => {
      const dec = {
        ...d,
        bank_account: decrypt(d.bank_account_encrypted)
      };
      delete dec.bank_account_encrypted;
      return dec;
    });

    res.json({
      run,
      details: decryptedDetails
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 5. EXPORT & DOWNLOAD ENDPOINTS
// ==========================================

// Export bank clearing file
app.get('/api/payroll/runs/:period/export/:bank', checkRole(['Super Admin / IT Tech', 'Finance / Accounting']), async (req, res) => {
  const { period, bank } = req.params;

  try {
    const run = await dbGet('SELECT * FROM payroll_runs WHERE period = ?', [period]);
    if (!run) return res.status(404).json({ error: 'Payroll run not found.' });
    if (run.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Cannot export. Bank file is only available for APPROVED/LOCKED payroll.' });
    }

    const details = await dbAll(`
      SELECT d.net_salary, e.name as employee_name, e.bank_account_encrypted, e.email, e.bank_name
      FROM payroll_details d
      JOIN employees e ON d.employee_id = e.id
      WHERE d.payroll_run_id = ?
    `, [run.id]);

    const formattedDetails = details.map(d => ({
      net_salary: d.net_salary,
      employee_name: d.employee_name,
      bank_account: decrypt(d.bank_account_encrypted),
      email: d.email
    }));

    // Generate bank file
    const bankFile = generateBankFile(bank, period, formattedDetails);

    // Set headers for download
    res.setHeader('Content-Type', bankFile.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${bankFile.filename}"`);
    
    // Log audit trail
    await logAudit(req.userId, `EXPORT_BANK_FILE_${bank.toUpperCase()}`, null, `Exported bank transfer file for period ${period}. Total disbursed: ${details.reduce((sum, x) => sum + x.net_salary, 0)}`, req);

    res.send(bankFile.content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download secure PDF payslip
app.get('/api/payroll/payslip/:employeeId/:period', checkRole(['Super Admin / IT Tech', 'HR Payroll Specialist', 'Finance / Accounting', 'Karyawan']), async (req, res) => {
  const { employeeId, period } = req.params;

  try {
    // Fetch employee data
    const emp = await dbGet('SELECT * FROM employees WHERE id = ?', [employeeId]);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    // Restrict Karyawan role to their own payslip
    if (req.userRole === 'Karyawan' && emp.nik !== req.userId) {
      return res.status(403).json({ error: 'Access denied: You can only view your own payslips.' });
    }

    const slipFilename = `payslip_${emp.nik}_${period}.pdf`;
    const fileLocation = path.join(PAYSLIPS_DIR, period, slipFilename);

    if (!fs.existsSync(fileLocation)) {
      return res.status(404).json({ error: 'Payslip PDF not generated yet. Ensure payroll for this period is approved.' });
    }

    // Set headers for inline rendering or download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${slipFilename}"`);

    await logAudit(req.userId, 'DOWNLOAD_PAYSLIP', null, `Downloaded payslip for employee NIK: ${emp.nik}, period: ${period}`, req);

    res.sendFile(fileLocation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 6. AUDIT TRAIL LOG ENDPOINTS
// ==========================================

app.get('/api/audit-logs', checkRole(['Super Admin / IT Tech']), async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expose Express app for Vercel Serverless Functions
module.exports = app;

// Start server only when running locally (not in serverless environment)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  async function start() {
    try {
      console.log("Initializing Database...");
      await initDb();
      
      app.listen(PORT, () => {
        console.log(`==================================================`);
        console.log(`   PAYROLL SYSTEM SERVER IS RUNNING ON PORT ${PORT}`);
        console.log(`   Local URL: http://localhost:${PORT}`);
        console.log(`==================================================`);
      });
    } catch (err) {
      console.error("Failed to start local server:", err.message);
      process.exit(1);
    }
  }
  start();
}
