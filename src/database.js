const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Ensure database directory exists
const dbPath = path.resolve(__dirname, '../payroll.db');
const db = new sqlite3.Database(dbPath);

// Encryption details
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'd6F3E506a5D24aE1b99B3f2c5D6e7F8a'; // 32-character fallback key
const IV_LENGTH = 16;

if (ENCRYPTION_KEY.length !== 32) {
  console.error("WARNING: ENCRYPTION_KEY must be exactly 32 bytes. Currently:", ENCRYPTION_KEY.length);
}

// AES-256 Encryption Helpers
function encrypt(text) {
  if (text === null || text === undefined) return null;
  const textStr = String(text);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(textStr, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(ciphertext) {
  if (!ciphertext) return null;
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 2) return ciphertext; // Return as-is if not encrypted
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error("Decryption failed:", err.message);
    return ciphertext; // Fallback to raw text if decryption fails
  }
}

// Promisified Database methods
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve({ id: this.lastID, changes: this.changes });
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

// Initialize Database Tables
async function initDb() {
  // 1. Employees Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nik TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      status TEXT NOT NULL, -- PKWT, PKWTT
      ptkp TEXT NOT NULL, -- TK/0, TK/1, TK/2, TK/3, K/0, K/1, K/2, K/3, K/I/0, K/I/1, K/I/2, K/I/3
      bank_name TEXT NOT NULL, -- BCA, MANDIRI, BRI, BNI
      bank_account_encrypted TEXT NOT NULL,
      bpjs_ks_id TEXT,
      bpjs_tk_id TEXT,
      basic_salary_encrypted TEXT NOT NULL,
      allowance_fixed_encrypted TEXT NOT NULL,
      allowance_transport REAL DEFAULT 0, -- Transport allowance per day
      allowance_meal REAL DEFAULT 0, -- Meal allowance per day
      email TEXT NOT NULL,
      birth_date TEXT NOT NULL, -- YYYY-MM-DD
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Attendance Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      period TEXT NOT NULL, -- YYYY-MM
      days_present INTEGER DEFAULT 0,
      days_late INTEGER DEFAULT 0,
      days_absent INTEGER DEFAULT 0,
      overtime_hours_first REAL DEFAULT 0, -- First hour overtime (1.5x)
      overtime_hours_next REAL DEFAULT 0,  -- Next hours overtime (2x)
      bonus REAL DEFAULT 0,
      insentif REAL DEFAULT 0,
      thr REAL DEFAULT 0,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(employee_id, period)
    )
  `);

  // 3. Payroll Runs (Main Batch table)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period TEXT UNIQUE NOT NULL, -- YYYY-MM
      status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, APPROVED
      submitted_by TEXT,
      submitted_at DATETIME,
      approved_by TEXT,
      approved_at DATETIME,
      rejection_notes TEXT
    )
  `);

  // 4. Payroll Details (Results per employee)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS payroll_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_run_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      
      -- Salaries & Additions
      basic_salary REAL NOT NULL,
      allowance_fixed REAL NOT NULL,
      allowance_variable REAL DEFAULT 0, -- Transport + Meal (kehadiran aktual)
      overtime_pay REAL DEFAULT 0,
      bonus REAL DEFAULT 0,
      insentif REAL DEFAULT 0,
      thr REAL DEFAULT 0,
      gross_salary REAL NOT NULL,
      
      -- Deductions (BPJS & Tax)
      bpjs_ks_employee REAL DEFAULT 0,
      bpjs_ks_company REAL DEFAULT 0,
      bpjs_tk_jht_employee REAL DEFAULT 0,
      bpjs_tk_jht_company REAL DEFAULT 0,
      bpjs_tk_jp_employee REAL DEFAULT 0,
      bpjs_tk_jp_company REAL DEFAULT 0,
      bpjs_tk_jkk_company REAL DEFAULT 0,
      bpjs_tk_jkm_company REAL DEFAULT 0,
      
      -- Tax details
      pph21_rate REAL DEFAULT 0,
      pph21_amount REAL DEFAULT 0,
      
      -- Net Salary
      net_salary REAL NOT NULL,
      payslip_path TEXT,
      
      FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      UNIQUE(payroll_run_id, employee_id)
    )
  `);

  // 5. Audit Logs Table (Strictly Read-Only from app interface)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      old_value TEXT,
      new_value TEXT
    )
  `);
}

module.exports = {
  db,
  encrypt,
  decrypt,
  dbRun,
  dbAll,
  dbGet,
  initDb
};
