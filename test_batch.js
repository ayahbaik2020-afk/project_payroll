const { initDb, encrypt, dbRun, dbAll, dbGet } = require('./src/database');
const { calculateMonthlyPayroll } = require('./src/ter_calculator');

async function runPerformanceTest() {
  console.log("==================================================");
  console.log("   PAYROLL ENGINE PERFORMANCE & LOGIC VERIFICATION");
  console.log("==================================================\n");

  // 1. Initialize DB
  console.log("Initializing database...");
  await initDb();

  // Clear existing test data
  console.log("Clearing old test data...");
  await dbRun("DELETE FROM employees");
  await dbRun("DELETE FROM attendance");
  await dbRun("DELETE FROM payroll_runs");
  await dbRun("DELETE FROM payroll_details");

  // 2. Seed 1,000 employees
  console.log("Seeding 1,000 mock employees...");
  
  const seedStartTime = Date.now();
  
  // Use a transaction for fast inserts
  await dbRun("BEGIN TRANSACTION");
  
  const ptkpOptions = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'];
  const bankOptions = ['BCA', 'MANDIRI', 'BRI', 'BNI'];
  const positions = ['Software Engineer', 'Product Manager', 'Data Analyst', 'HR Specialist', 'Finance Officer', 'Director'];

  for (let i = 1; i <= 1000; i++) {
    const nik = `NIK${1000 + i}`;
    const name = `Employee Mock Number ${i}`;
    const pos = positions[i % positions.length];
    const status = i % 10 === 0 ? 'PKWT' : 'PKWTT';
    const ptkp = ptkpOptions[i % ptkpOptions.length];
    const bank = bankOptions[i % bankOptions.length];
    const email = `employee.${i}@company.com`;
    const birthDate = `199${i % 10}-0${(i % 9) + 1}-1${i % 9}`;
    
    // Sensitive data to encrypt
    const bankAccount = `123456${1000 + i}`;
    const basicSalary = 5000000 + (i * 15000); // Salries range from 5M to 20M
    const allowanceFixed = 500000 + (i * 2000);

    const bank_account_encrypted = encrypt(bankAccount);
    const basic_salary_encrypted = encrypt(basicSalary.toString());
    const allowance_fixed_encrypted = encrypt(allowanceFixed.toString());

    await dbRun(`
      INSERT INTO employees (
        nik, name, position, status, ptkp, bank_name, bank_account_encrypted,
        bpjs_ks_id, bpjs_tk_id, basic_salary_encrypted, allowance_fixed_encrypted,
        allowance_transport, allowance_meal, email, birth_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nik, name, pos, status, ptkp, bank, bank_account_encrypted,
      `BPJSKS${1000000 + i}`, `BPJSTK${1000000 + i}`, basic_salary_encrypted, allowance_fixed_encrypted,
      50000, 20000, email, birthDate
    ]);
  }
  await dbRun("COMMIT");
  
  console.log(`Seeded 1,000 employees in ${((Date.now() - seedStartTime) / 1000).toFixed(2)}s.`);

  // 3. Seed Attendance for 1,000 employees
  console.log("Seeding attendance records for 1,000 employees...");
  const attStartTime = Date.now();
  
  const employees = await dbAll("SELECT id FROM employees");
  
  await dbRun("BEGIN TRANSACTION");
  for (const emp of employees) {
    await dbRun(`
      INSERT INTO attendance (
        employee_id, period, days_present, days_late, days_absent,
        overtime_hours_first, overtime_hours_next, bonus, insentif, thr
      ) VALUES (?, '2026-05', 21, 1, 0, 2, 4, 100000, 50000, 0)
    `, [emp.id]);
  }
  await dbRun("COMMIT");
  console.log(`Seeded attendance in ${((Date.now() - attStartTime) / 1000).toFixed(2)}s.`);

  // 4. Run Batch Payroll processing and measure execution time
  console.log("\nStarting Batch Payroll processing for 1,000 employees...");
  
  const payrollStartTime = Date.now();
  
  // Create run record
  const runResult = await dbRun("INSERT INTO payroll_runs (period, status) VALUES ('2026-05', 'DRAFT')");
  const runId = runResult.id;

  // Process batch
  await dbRun("BEGIN TRANSACTION");
  const allEmployees = await dbAll("SELECT * FROM employees");
  const allAttendance = await dbAll("SELECT * FROM attendance WHERE period = '2026-05'");
  
  // Map attendance by employee_id for fast lookup
  const attMap = {};
  allAttendance.forEach(a => {
    attMap[a.employee_id] = a;
  });

  const { decrypt } = require('./src/database');
  
  for (const emp of allEmployees) {
    const basicSalary = parseFloat(decrypt(emp.basic_salary_encrypted));
    const allowanceFixed = parseFloat(decrypt(emp.allowance_fixed_encrypted));
    
    const employeeData = {
      basicSalary,
      allowanceFixed,
      allowanceTransport: emp.allowance_transport,
      allowanceMeal: emp.allowance_meal,
      ptkp: emp.ptkp
    };

    const att = attMap[emp.id];

    // Compute monthly payroll
    const calc = calculateMonthlyPayroll(employeeData, att);

    // Save
    await dbRun(`
      INSERT INTO payroll_details (
        payroll_run_id, employee_id, basic_salary, allowance_fixed, allowance_variable,
        overtime_pay, bonus, insentif, thr, gross_salary,
        bpjs_ks_employee, bpjs_ks_company, bpjs_tk_jht_employee, bpjs_tk_jht_company,
        bpjs_tk_jp_employee, bpjs_tk_jp_company, bpjs_tk_jkk_company, bpjs_tk_jkm_company,
        pph21_rate, pph21_amount, net_salary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      runId, emp.id, 
      calc.basic_salary, calc.allowance_fixed, calc.allowance_variable,
      calc.overtime_pay, calc.bonus, calc.insentif, calc.thr, calc.gross_salary,
      calc.bpjs_ks_employee, calc.bpjs_ks_company, 
      calc.bpjs_tk_jht_employee, calc.bpjs_tk_jht_company,
      calc.bpjs_tk_jp_employee, calc.bpjs_tk_jp_company,
      calc.bpjs_tk_jkk_company, calc.bpjs_tk_jkm_company,
      calc.pph21_rate, calc.pph21_amount, calc.net_salary
    ]);
  }
  await dbRun("COMMIT");

  const payrollDurationMs = Date.now() - payrollStartTime;
  const payrollDurationSec = payrollDurationMs / 1000;

  console.log(`==================================================`);
  console.log(`BATCH PROCESS COMPLETED`);
  console.log(`Processed: 1,000 Employees`);
  console.log(`Execution Time: ${payrollDurationSec.toFixed(2)} seconds (${payrollDurationMs} ms)`);
  
  if (payrollDurationSec < 60) {
    console.log(`Status NFR-2.1: PASSED (Execution time < 60 seconds)`);
  } else {
    console.log(`Status NFR-2.1: FAILED (Execution time >= 60 seconds)`);
  }
  console.log(`==================================================\n`);

  // 5. TAX LOGIC VERIFICATION (PPh 21 TER)
  console.log("Verifying Tax Logic (PPh 21 TER) accuracy...");

  // Sample employee data matching specific bracket
  const testEmployee = {
    basicSalary: 5500000,
    allowanceFixed: 0,
    allowanceTransport: 0,
    allowanceMeal: 0,
    ptkp: 'TK/0' // Kategori A
  };
  
  // Case: Gross = 6,000,000. Under TER Kategori A:
  // Bracket: > 5,950,000 s.d. 6,300,000 -> Rate: 0.75%
  // BPJS Health (company paid 4% of 5.5M = 220,000)
  // BPJS JKK (company paid 0.24% of 5.5M = 13,200)
  // BPJS JKM (company paid 0.3% of 5.5M = 16,500)
  // Taxable premium gross = 249,700
  // Basic Cash Gross = 5.5M (basic) + 500k (bonus) = 6M
  // Tax Gross = 6M + 249,700 = 6,249,700
  // Since 6,249,700 is inside range (5,950,000 - 6,300,000], the rate is 0.75%
  // PPh 21 = 6,249,700 * 0.75% = 46,873 (rounded to 46,873)
  
  const testAttendance = {
    days_present: 20,
    overtime_hours_first: 0,
    overtime_hours_next: 0,
    bonus: 500000,
    insentif: 0,
    thr: 0
  };

  const testCalc = calculateMonthlyPayroll(testEmployee, testAttendance);
  
  console.log(`Test employee: TK/0, Cash Gross: Rp 6.000.000`);
  console.log(`Taxable Premium (BPJS Company): Rp ${testCalc.bpjs_ks_company + testCalc.bpjs_tk_jkk_company + testCalc.bpjs_tk_jkm_company}`);
  console.log(`Total Taxable Gross: Rp ${testCalc.taxable_gross.toLocaleString('id-ID')}`);
  console.log(`Expected TER Rate: 0.75% | Actual: ${(testCalc.pph21_rate * 100).toFixed(2)}%`);
  console.log(`Expected Tax: Rp 46.873 | Actual: Rp ${testCalc.pph21_amount.toLocaleString('id-ID')}`);
  
  if (testCalc.pph21_rate === 0.0075 && testCalc.pph21_amount === 46873) {
    console.log("Tax Logic Verification: PASSED (100% Accuracy)");
  } else {
    console.log("Tax Logic Verification: FAILED (Accuracy error)");
  }
  
  console.log("\nTests finished.");
  process.exit(0);
}

runPerformanceTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
