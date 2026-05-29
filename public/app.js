// Frontend App Logic - Payroll Core Engine Dashboard

// Current State
let currentRole = 'HR Payroll Specialist';
let currentUserId = 'admin-hr';
let activeView = 'dashboard';
let employeesList = [];

// API Headers Helper
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-role': currentRole,
    'x-user-id': currentUserId
  };
}

// Format Rupiah helper
function formatRupiah(value) {
  return 'Rp ' + Math.round(value).toLocaleString('id-ID');
}

// Show System Toast Notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('notification-toast');
  const toastText = document.getElementById('toast-text');
  const toastIcon = document.getElementById('toast-icon');
  
  toastText.textContent = message;
  
  // Set icons based on message types
  toastIcon.className = 'fa-solid';
  if (type === 'success') {
    toastIcon.classList.add('fa-circle-check');
    toastIcon.style.color = '#10b981';
  } else if (type === 'error') {
    toastIcon.classList.add('fa-circle-xmark');
    toastIcon.style.color = '#ef4444';
  } else {
    toastIcon.classList.add('fa-circle-info');
    toastIcon.style.color = '#6366f1';
  }

  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// Document Ready
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupEventListeners();
});

// Initialise Application Data
function initApp() {
  // Init views
  switchView('dashboard');
  
  // Load initial data
  refreshData();
}

// Refresh all components based on active role
function refreshData() {
  updateRoleVisuals();
  
  if (activeView === 'dashboard') {
    loadDashboardSummary();
  } else if (activeView === 'employees') {
    loadEmployees();
  } else if (activeView === 'attendance') {
    loadAttendance();
  } else if (activeView === 'payroll') {
    loadPayrollDetails();
    loadPayrollRuns();
  } else if (activeView === 'audit-logs') {
    loadAuditLogs();
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Navigation
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      switchView(view);
    });
  });

  // Role Simulator dropdown
  const roleSelect = document.getElementById('role-simulator');
  const nikInput = document.getElementById('employee-nik-simulator');
  
  roleSelect.addEventListener('change', (e) => {
    currentRole = e.target.value;
    
    // Toggle NIK input box if role is Karyawan
    const simulatorBox = document.getElementById('employee-simulator-box');
    if (currentRole === 'Karyawan') {
      simulatorBox.style.display = 'flex';
      currentUserId = nikInput.value || 'NIK1001';
    } else {
      simulatorBox.style.display = 'none';
      currentUserId = currentRole === 'Super Admin / IT Tech' ? 'admin-tech' : 'admin-hr';
    }
    
    showToast(`Beralih ke hak akses: ${currentRole}`, 'info');
    refreshData();
  });

  nikInput.addEventListener('input', (e) => {
    if (currentRole === 'Karyawan') {
      currentUserId = e.target.value || 'NIK1001';
      refreshData();
    }
  });

  // Employee actions
  document.getElementById('btn-add-employee').addEventListener('click', () => {
    openEmployeeModal();
  });
  
  document.getElementById('btn-close-employee-modal').addEventListener('click', () => {
    closeEmployeeModal();
  });
  
  document.getElementById('btn-cancel-employee').addEventListener('click', () => {
    closeEmployeeModal();
  });

  document.getElementById('form-employee').addEventListener('submit', (e) => {
    e.preventDefault();
    saveEmployee();
  });

  // Attendance actions
  document.getElementById('btn-load-attendance').addEventListener('click', () => {
    loadAttendance();
  });

  document.getElementById('form-attendance').addEventListener('submit', (e) => {
    e.preventDefault();
    saveAttendance();
  });

  // Payroll actions
  document.getElementById('btn-generate-payroll').addEventListener('click', () => {
    generatePayroll();
  });

  document.getElementById('btn-submit-payroll').addEventListener('click', () => {
    submitPayroll();
  });

  document.getElementById('btn-approve-payroll').addEventListener('click', () => {
    approvePayroll();
  });

  document.getElementById('btn-reject-payroll').addEventListener('click', () => {
    document.getElementById('modal-reject-notes').classList.add('active');
  });

  document.getElementById('btn-close-reject-modal').addEventListener('click', () => {
    document.getElementById('modal-reject-notes').classList.remove('active');
  });

  document.getElementById('btn-cancel-reject').addEventListener('click', () => {
    document.getElementById('modal-reject-notes').classList.remove('active');
  });

  document.getElementById('btn-submit-reject').addEventListener('click', () => {
    rejectPayroll();
  });

  document.getElementById('btn-export-bank').addEventListener('click', () => {
    exportBankFile();
  });

  // Period inputs triggers reload
  document.getElementById('attendance-period').addEventListener('change', () => {
    if (activeView === 'attendance') loadAttendance();
  });

  document.getElementById('payroll-period').addEventListener('change', () => {
    if (activeView === 'payroll') {
      loadPayrollRuns();
      loadPayrollDetails();
    }
  });
}

// View switching
function switchView(viewName) {
  activeView = viewName;
  
  // Update sidebar active state
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update views visible
  const views = document.querySelectorAll('.content-view');
  views.forEach(view => {
    if (view.id === `view-${viewName}`) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  // Update Headers / Metadata
  const viewTitle = document.getElementById('view-title');
  const viewSubtitle = document.getElementById('view-subtitle');

  switch (viewName) {
    case 'dashboard':
      viewTitle.textContent = 'Dashboard Utama';
      viewSubtitle.textContent = 'Ikhtisar data operasional dan perhitungan gaji terbaru.';
      break;
    case 'employees':
      viewTitle.textContent = 'Manajemen Master Data';
      viewSubtitle.textContent = 'Kelola detail profil, perbankan, dan data PTKP pajak karyawan.';
      break;
    case 'attendance':
      viewTitle.textContent = 'Kehadiran & Upah Lembur';
      viewSubtitle.textContent = 'Rekap absensi bulanan dan input variabel bonus/insentif.';
      break;
    case 'payroll':
      viewTitle.textContent = 'Pemrosesan Payroll Core Engine';
      viewSubtitle.textContent = 'Batch generate payroll bulanan dan integrasi alur persetujuan.';
      break;
    case 'audit-logs':
      viewTitle.textContent = 'Laporan Audit Kepatuhan (Audit Trail)';
      viewSubtitle.textContent = 'Log aktivitas read-only absolut demi akuntabilitas audit keuangan.';
      break;
  }

  refreshData();
}

// UI controls depending on Role
function updateRoleVisuals() {
  document.getElementById('user-display-name').textContent = currentRole.split(' ')[0];
  document.getElementById('user-display-role').textContent = currentRole;

  // Show/Hide Audit Trail tab
  const navAudit = document.getElementById('nav-audit-logs');
  if (currentRole === 'Super Admin / IT Tech') {
    navAudit.style.display = 'flex';
  } else {
    navAudit.style.display = 'none';
    if (activeView === 'audit-logs') {
      switchView('dashboard');
    }
  }

  // Show/Hide employee modification triggers
  const btnAddEmp = document.getElementById('btn-add-employee');
  if (currentRole === 'Super Admin / IT Tech' || currentRole === 'HR Payroll Specialist') {
    btnAddEmp.style.visibility = 'visible';
  } else {
    btnAddEmp.style.visibility = 'hidden';
  }

  // Show/Hide attendance save button
  const btnSaveAtt = document.getElementById('btn-save-attendance');
  if (currentRole === 'Super Admin / IT Tech' || currentRole === 'HR Payroll Specialist') {
    btnSaveAtt.style.display = 'flex';
  } else {
    btnSaveAtt.style.display = 'none';
  }

  // Adjust operational controls in Payroll Section
  const hrBox = document.getElementById('btn-generate-payroll');
  const submitBox = document.getElementById('btn-submit-payroll');
  const approvalBox = document.getElementById('approval-actions-box');
  const disbursalBox = document.getElementById('disbursal-actions-box');

  // Defaults
  hrBox.style.display = 'none';
  submitBox.style.display = 'none';
  approvalBox.style.display = 'none';
  disbursalBox.style.display = 'none';

  if (currentRole === 'Super Admin / IT Tech' || currentRole === 'HR Payroll Specialist') {
    hrBox.style.display = 'block';
  }

  if (currentRole === 'Super Admin / IT Tech' || currentRole === 'Management / Direksi') {
    approvalBox.style.display = 'block';
  }

  if (currentRole === 'Super Admin / IT Tech' || currentRole === 'Finance / Accounting') {
    disbursalBox.style.display = 'block';
  }
}

// ==========================================
// 1. DASHBOARD CONTROLS
// ==========================================
async function loadDashboardSummary() {
  try {
    const res = await fetch('/api/dashboard/summary', { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    
    const data = await res.json();
    
    document.getElementById('stat-total-employees').textContent = data.totalEmployees;
    document.getElementById('stat-last-payroll').textContent = formatRupiah(data.lastPeriodCost);
    document.getElementById('stat-last-period').textContent = `Periode Gaji: ${data.lastPeriod}`;
    document.getElementById('stat-pending-approvals').textContent = data.pendingApprovals;

    // Render trend chart bars
    const trendContainer = document.getElementById('trend-bars');
    trendContainer.innerHTML = '';

    if (data.payrollTrend && data.payrollTrend.length > 0) {
      // Find max value to scale heights
      const maxVal = Math.max(...data.payrollTrend.map(x => x.total_net), 1000000);
      
      data.payrollTrend.forEach(t => {
        const percentage = (t.total_net / maxVal) * 100;
        
        const barWrapper = document.createElement('div');
        barWrapper.className = 'chart-bar-wrapper';
        
        const [year, month] = t.period.split('-');
        const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const label = `${shortMonths[parseInt(month, 10)-1]} ${year.slice(2)}`;
        
        barWrapper.innerHTML = `
          <div class="chart-bar" style="height: ${percentage}%">
            <span class="chart-bar-tooltip">${formatRupiah(t.total_net)}</span>
          </div>
          <span class="chart-bar-label">${label}</span>
        `;
        trendContainer.appendChild(barWrapper);
      });
    } else {
      trendContainer.innerHTML = '<div class="no-data-placeholder">Belum ada pengeluaran payroll yang disetujui.</div>';
    }
  } catch (err) {
    console.error("Dashboard error:", err.message);
  }
}

// ==========================================
// 2. EMPLOYEE MASTER CONTROLS
// ==========================================
async function loadEmployees() {
  try {
    const res = await fetch('/api/employees', { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    
    employeesList = await res.json();
    const tbody = document.querySelector('#table-employees tbody');
    tbody.innerHTML = '';

    if (employeesList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center">Tidak ada data karyawan.</td></tr>`;
      return;
    }

    employeesList.forEach(emp => {
      const tr = document.createElement('tr');
      
      // Role restricted employee data viewing
      let actionButtons = '';
      if (currentRole === 'Super Admin / IT Tech' || currentRole === 'HR Payroll Specialist') {
        actionButtons += `<button class="btn btn-secondary btn-icon-only mr-2" onclick="editEmployee(${emp.id})" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>`;
      }
      if (currentRole === 'Super Admin / IT Tech') {
        actionButtons += `<button class="btn btn-danger btn-icon-only" onclick="deleteEmployee(${emp.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>`;
      }

      tr.innerHTML = `
        <td><strong>${emp.nik}</strong></td>
        <td>${emp.name}</td>
        <td>${emp.position}</td>
        <td><span class="badge ${emp.status === 'PKWTT' ? 'badge-success' : 'badge-warning'}">${emp.status}</span></td>
        <td>${emp.ptkp}</td>
        <td>${formatRupiah(emp.basic_salary)}</td>
        <td>${formatRupiah(emp.allowance_fixed)}</td>
        <td>${emp.bank_name} - ${emp.bank_account}</td>
        <td>${actionButtons || '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(`Gagal memuat karyawan: ${err.message}`, 'error');
  }
}

// Modal handling
function openEmployeeModal(title = 'Tambah Karyawan Baru') {
  document.getElementById('employee-modal-title').textContent = title;
  document.getElementById('form-employee').reset();
  document.getElementById('emp-id').value = '';
  document.getElementById('emp-nik').disabled = false;
  document.getElementById('modal-employee').classList.add('active');
}

function closeEmployeeModal() {
  document.getElementById('modal-employee').classList.remove('active');
}

async function saveEmployee() {
  const id = document.getElementById('emp-id').value;
  const payload = {
    nik: document.getElementById('emp-nik').value,
    name: document.getElementById('emp-name').value,
    email: document.getElementById('emp-email').value,
    birth_date: document.getElementById('emp-birthdate').value,
    position: document.getElementById('emp-position').value,
    status: document.getElementById('emp-status').value,
    ptkp: document.getElementById('emp-ptkp').value,
    basic_salary: parseFloat(document.getElementById('emp-basic-salary').value),
    allowance_fixed: parseFloat(document.getElementById('emp-allowance-fixed').value),
    allowance_transport: parseFloat(document.getElementById('emp-allowance-transport').value) || 0,
    allowance_meal: parseFloat(document.getElementById('emp-allowance-meal').value) || 0,
    bank_name: document.getElementById('emp-bank-name').value,
    bank_account: document.getElementById('emp-bank-account').value,
    bpjs_ks_id: document.getElementById('emp-bpjs-ks-id').value,
    bpjs_tk_id: document.getElementById('emp-bpjs-tk-id').value
  };

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/employees/${id}` : '/api/employees';

  try {
    const res = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    showToast(id ? 'Data karyawan berhasil diperbarui!' : 'Karyawan baru berhasil ditambahkan!', 'success');
    closeEmployeeModal();
    loadEmployees();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.editEmployee = async function(id) {
  try {
    const res = await fetch(`/api/employees/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    
    const emp = await res.json();
    
    document.getElementById('emp-id').value = emp.id;
    document.getElementById('emp-nik').value = emp.nik;
    document.getElementById('emp-nik').disabled = true; // Cannot edit NIK once created
    document.getElementById('emp-name').value = emp.name;
    document.getElementById('emp-email').value = emp.email;
    document.getElementById('emp-birthdate').value = emp.birth_date;
    document.getElementById('emp-position').value = emp.position;
    document.getElementById('emp-status').value = emp.status;
    document.getElementById('emp-ptkp').value = emp.ptkp;
    document.getElementById('emp-basic-salary').value = emp.basic_salary;
    document.getElementById('emp-allowance-fixed').value = emp.allowance_fixed;
    document.getElementById('emp-allowance-transport').value = emp.allowance_transport;
    document.getElementById('emp-allowance-meal').value = emp.allowance_meal;
    document.getElementById('emp-bank-name').value = emp.bank_name;
    document.getElementById('emp-bank-account').value = emp.bank_account;
    document.getElementById('emp-bpjs-ks-id').value = emp.bpjs_ks_id;
    document.getElementById('emp-bpjs-tk-id').value = emp.bpjs_tk_id;

    openEmployeeModal('Edit Data Karyawan');
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.deleteEmployee = async function(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus data karyawan ini? Seluruh data riwayat kehadiran dan gaji akan terpengaruh.')) return;

  try {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!res.ok) throw new Error(await res.text());

    showToast('Data karyawan berhasil dihapus!', 'success');
    loadEmployees();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ==========================================
// 3. ATTENDANCE CONTROLS
// ==========================================
async function loadAttendance() {
  const period = document.getElementById('attendance-period').value;
  try {
    const res = await fetch(`/api/attendance?period=${period}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    
    const data = await res.json();
    const tbody = document.querySelector('#table-attendance tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" class="text-center">Silakan tambahkan data karyawan terlebih dahulu.</td></tr>`;
      return;
    }

    data.forEach(row => {
      const tr = document.createElement('tr');
      // Inputs are disabled if role doesn't have HR/Admin rights
      const disabledAttr = (currentRole === 'Super Admin / IT Tech' || currentRole === 'HR Payroll Specialist') ? '' : 'readonly disabled';
      
      tr.innerHTML = `
        <td><strong>${row.nik}</strong></td>
        <td>${row.name}</td>
        <td><small>${row.position}</small></td>
        <td>
          <input type="number" min="0" max="31" class="glass-input-small" style="width: 60px;" 
                 name="days_present_${row.employee_id}" value="${row.days_present !== null ? row.days_present : 20}" ${disabledAttr}>
        </td>
        <td>
          <input type="number" min="0" max="31" class="glass-input-small" style="width: 60px;" 
                 name="days_late_${row.employee_id}" value="${row.days_late || 0}" ${disabledAttr}>
        </td>
        <td>
          <input type="number" min="0" max="31" class="glass-input-small" style="width: 60px;" 
                 name="days_absent_${row.employee_id}" value="${row.days_absent || 0}" ${disabledAttr}>
        </td>
        <td>
          <input type="number" min="0" step="0.5" class="glass-input-small" style="width: 70px;" 
                 name="ot_first_${row.employee_id}" value="${row.overtime_hours_first || 0}" ${disabledAttr}>
        </td>
        <td>
          <input type="number" min="0" step="0.5" class="glass-input-small" style="width: 70px;" 
                 name="ot_next_${row.employee_id}" value="${row.overtime_hours_next || 0}" ${disabledAttr}>
        </td>
        <td>
          <input type="number" min="0" class="glass-input-small" style="width: 100px;" 
                 name="bonus_${row.employee_id}" value="${row.bonus || 0}" ${disabledAttr}>
        </td>
        <td>
          <input type="number" min="0" class="glass-input-small" style="width: 100px;" 
                 name="insentif_${row.employee_id}" value="${row.insentif || 0}" ${disabledAttr}>
        </td>
        <td>
          <input type="number" min="0" class="glass-input-small" style="width: 100px;" 
                 name="thr_${row.employee_id}" value="${row.thr || 0}" ${disabledAttr}>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveAttendance() {
  const period = document.getElementById('attendance-period').value;
  const tbody = document.querySelector('#table-attendance tbody');
  const rows = tbody.querySelectorAll('tr');
  const records = [];

  rows.forEach(tr => {
    const inputs = tr.querySelectorAll('input');
    if (inputs.length > 0) {
      // Find employee id from input name (e.g. days_present_2)
      const empId = inputs[0].name.split('_').pop();
      records.push({
        employee_id: parseInt(empId, 10),
        days_present: parseInt(inputs[0].value, 10) || 0,
        days_late: parseInt(inputs[1].value, 10) || 0,
        days_absent: parseInt(inputs[2].value, 10) || 0,
        overtime_hours_first: parseFloat(inputs[3].value) || 0,
        overtime_hours_next: parseFloat(inputs[4].value) || 0,
        bonus: parseFloat(inputs[5].value) || 0,
        insentif: parseFloat(inputs[6].value) || 0,
        thr: parseFloat(inputs[7].value) || 0
      });
    }
  });

  try {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ period, records })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    showToast('Data kehadiran berhasil disimpan!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// 4. PAYROLL PROCESSING CONTROLS
// ==========================================
async function loadPayrollRuns() {
  const period = document.getElementById('payroll-period').value;
  const runStatusText = document.getElementById('run-status-text');
  const runStatusBadge = document.getElementById('run-status-badge');
  const runSubmittedBy = document.getElementById('run-submitted-by');
  const runApprovedBy = document.getElementById('run-approved-by');
  const rejectNotesBox = document.getElementById('rejection-notes-box');
  const rejectNotesText = document.getElementById('rejection-notes-text');
  const btnSubmit = document.getElementById('btn-submit-payroll');

  try {
    const res = await fetch('/api/payroll/runs', { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    
    const runs = await res.json();
    const currentRun = runs.find(r => r.period === period);

    // Update buttons state
    btnSubmit.style.display = 'none';

    if (currentRun) {
      runStatusText.textContent = currentRun.status;
      runStatusBadge.textContent = currentRun.status;
      
      // Update badge class
      runStatusBadge.className = 'status-badge';
      if (currentRun.status === 'APPROVED') {
        runStatusBadge.classList.add('badge-success');
      } else if (currentRun.status === 'SUBMITTED') {
        runStatusBadge.classList.add('badge-warning');
      } else {
        runStatusBadge.classList.add('badge-neutral');
        // If it's draft, HR can submit it
        if (currentRole === 'Super Admin / IT Tech' || currentRole === 'HR Payroll Specialist') {
          btnSubmit.style.display = 'block';
        }
      }

      runSubmittedBy.textContent = currentRun.submitted_by ? `${currentRun.submitted_by} (${new Date(currentRun.submitted_at).toLocaleDateString()})` : '-';
      runApprovedBy.textContent = currentRun.approved_by ? `${currentRun.approved_by} (${new Date(currentRun.approved_at).toLocaleDateString()})` : '-';
      
      if (currentRun.rejection_notes) {
        rejectNotesBox.style.display = 'block';
        rejectNotesText.textContent = currentRun.rejection_notes;
      } else {
        rejectNotesBox.style.display = 'none';
      }
    } else {
      runStatusText.textContent = 'Belum Diproses';
      runStatusBadge.textContent = 'BELUM DIPROSES';
      runStatusBadge.className = 'status-badge badge-neutral';
      runSubmittedBy.textContent = '-';
      runApprovedBy.textContent = '-';
      rejectNotesBox.style.display = 'none';
    }
  } catch (err) {
    console.error(err.message);
  }
}

async function loadPayrollDetails() {
  const period = document.getElementById('payroll-period').value;
  const tbody = document.querySelector('#table-payroll-details tbody');
  tbody.innerHTML = '<tr><td colspan="10" class="text-center">Memuat rincian payroll...</td></tr>';

  try {
    const res = await fetch(`/api/payroll/runs/${period}/details`, { headers: getHeaders() });
    
    if (res.status === 404) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center">Belum ada perhitungan payroll untuk periode ini. Tekan tombol 'Generate' untuk menghitung.</td></tr>`;
      return;
    }
    
    if (!res.ok) throw new Error(await res.text());
    
    const data = await res.json();
    tbody.innerHTML = '';

    data.details.forEach(row => {
      const tr = document.createElement('tr');
      
      const totalDeductions = row.bpjs_ks_employee + row.bpjs_tk_jht_employee + row.bpjs_tk_jp_employee + row.pph21_amount;
      
      // Payslip access trigger
      let slipAction = '-';
      if (data.run.status === 'APPROVED') {
        slipAction = `<button class="btn btn-secondary btn-icon-only" onclick="downloadPayslip(${row.employee_id}, '${period}')" title="Unduh Slip Gaji (PDF)"><i class="fa-solid fa-file-pdf" style="color: #ef4444;"></i></button>`;
      }

      tr.innerHTML = `
        <td><strong>${row.nik}</strong></td>
        <td>${row.name}</td>
        <td>${formatRupiah(row.gross_salary)}</td>
        <td>${formatRupiah(row.bpjs_ks_employee)}</td>
        <td>${formatRupiah(row.bpjs_tk_jht_employee)}</td>
        <td>${formatRupiah(row.bpjs_tk_jp_employee)}</td>
        <td>${formatRupiah(row.pph21_amount)}</td>
        <td><span style="color: var(--danger);">${formatRupiah(totalDeductions)}</span></td>
        <td><span style="color: var(--success); font-weight:700;">${formatRupiah(row.net_salary)}</span></td>
        <td>${slipAction}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center" style="color: var(--danger);">${err.message}</td></tr>`;
  }
}

async function generatePayroll() {
  const period = document.getElementById('payroll-period').value;
  showToast('Memproses kalkulasi batch payroll...', 'info');

  try {
    const res = await fetch('/api/payroll/runs/generate', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ period })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    showToast(data.message, 'success');
    loadPayrollRuns();
    loadPayrollDetails();
    loadDashboardSummary();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitPayroll() {
  const period = document.getElementById('payroll-period').value;
  try {
    const res = await fetch('/api/payroll/runs/submit', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ period })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    showToast(data.message, 'success');
    loadPayrollRuns();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function approvePayroll() {
  const period = document.getElementById('payroll-period').value;
  if (!confirm(`Apakah Anda yakin ingin menyetujui anggaran payroll periode ${period}? Hal ini akan MENGUNCI data keuangan dan men-generate berkas slip gaji PDF terenkripsi.`)) return;

  showToast('Menyetujui & membuat slip PDF terenkripsi...', 'info');

  try {
    const res = await fetch('/api/payroll/runs/approve', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ period })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    showToast(data.message, 'success');
    loadPayrollRuns();
    loadPayrollDetails();
    loadDashboardSummary();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function rejectPayroll() {
  const period = document.getElementById('payroll-period').value;
  const notes = document.getElementById('reject-notes').value;

  if (!notes) {
    showToast('Catatan penolakan harus diisi!', 'error');
    return;
  }

  try {
    const res = await fetch('/api/payroll/runs/reject', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ period, notes })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    showToast(data.message, 'success');
    document.getElementById('modal-reject-notes').classList.remove('active');
    loadPayrollRuns();
    loadPayrollDetails();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Download PDF payslip helper
window.downloadPayslip = function(employeeId, period) {
  window.open(`/api/payroll/payslip/${employeeId}/${period}?x-role=${encodeURIComponent(currentRole)}&x-user-id=${encodeURIComponent(currentUserId)}`, '_blank');
};

// Export Bank Clearing file download helper
function exportBankFile() {
  const period = document.getElementById('payroll-period').value;
  const bank = document.getElementById('export-bank-select').value;
  
  window.open(`/api/payroll/runs/${period}/export/${bank}?x-role=${encodeURIComponent(currentRole)}&x-user-id=${encodeURIComponent(currentUserId)}`, '_blank');
}


// ==========================================
// 5. AUDIT LOGS CONTROLS
// ==========================================
async function loadAuditLogs() {
  if (currentRole !== 'Super Admin / IT Tech') return;

  try {
    const res = await fetch('/api/audit-logs', { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    
    const logs = await res.json();
    const tbody = document.querySelector('#table-audit-logs tbody');
    tbody.innerHTML = '';

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">Belum ada aktivitas audit log.</td></tr>`;
      return;
    }

    logs.forEach(log => {
      const tr = document.createElement('tr');
      
      tr.innerHTML = `
        <td><small>${new Date(log.timestamp).toLocaleString()}</small></td>
        <td><span class="badge badge-neutral">${log.user_id}</span></td>
        <td><strong>${log.action}</strong></td>
        <td><code>${log.ip_address}</code></td>
        <td><small class="text-muted" style="word-break: break-all; max-width: 150px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(log.old_value)}">${log.old_value || '-'}</small></td>
        <td><small class="text-muted" style="word-break: break-all; max-width: 150px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(log.new_value)}">${log.new_value || '-'}</small></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Utility to escape HTML entities
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
