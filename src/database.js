const { Pool } = require('pg');
const crypto = require('crypto');

// Disable TLS validation for self-signed certificates (Supabase pooler requirement)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Initialise connection pool
// We support DATABASE_URL for Vercel/Supabase connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("WARNING: DATABASE_URL is not set in environment variables!");
}

const pool = new Pool({
  connectionString,
  ssl: connectionString ? { rejectUnauthorized: false } : false
});

// Encryption details (AES-256-CBC)
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'd6F3E506a5D24aE1b99B3f2c5D6e7F8a'; // 32-character key
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

// Helper to convert SQLite parameter placeholder '?' to PostgreSQL '$1', '$2', etc.
function convertParams(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Promisified Database methods mapping SQLite style to PostgreSQL Pool
const dbRun = async (sql, params = []) => {
  let pgSql = convertParams(sql);
  
  // Automate RETURNING id for PG inserts to mimic SQLite lastID
  const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
  const hasReturning = pgSql.toUpperCase().includes('RETURNING');
  if (isInsert && !hasReturning) {
    pgSql += ' RETURNING id';
  }

  const res = await pool.query(pgSql, params);
  
  return {
    id: res.rows && res.rows[0] ? res.rows[0].id : null,
    changes: res.rowCount
  };
};

const dbAll = async (sql, params = []) => {
  const pgSql = convertParams(sql);
  const res = await pool.query(pgSql, params);
  return res.rows;
};

const dbGet = async (sql, params = []) => {
  const pgSql = convertParams(sql);
  const res = await pool.query(pgSql, params);
  return res.rows[0] || null;
};

// PostgreSQL connection client transaction wrapper
async function dbTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const run = async (sql, params = []) => {
      let pgSql = convertParams(sql);
      const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
      const hasReturning = pgSql.toUpperCase().includes('RETURNING');
      if (isInsert && !hasReturning) {
        pgSql += ' RETURNING id';
      }
      const res = await client.query(pgSql, params);
      return {
        id: res.rows && res.rows[0] ? res.rows[0].id : null,
        changes: res.rowCount
      };
    };

    const all = async (sql, params = []) => {
      const pgSql = convertParams(sql);
      const res = await client.query(pgSql, params);
      return res.rows;
    };

    const get = async (sql, params = []) => {
      const pgSql = convertParams(sql);
      const res = await client.query(pgSql, params);
      return res.rows[0] || null;
    };

    const result = await fn({ run, all, get });
    
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Initialize PostgreSQL database tables
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Employees Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        nik VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        position VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL, -- PKWT, PKWTT
        ptkp VARCHAR(50) NOT NULL, -- TK/0 to K/I/3
        bank_name VARCHAR(50) NOT NULL,
        bank_account_encrypted TEXT NOT NULL,
        bpjs_ks_id VARCHAR(50),
        bpjs_tk_id VARCHAR(50),
        basic_salary_encrypted TEXT NOT NULL,
        allowance_fixed_encrypted TEXT NOT NULL,
        allowance_transport DOUBLE PRECISION DEFAULT 0,
        allowance_meal DOUBLE PRECISION DEFAULT 0,
        email VARCHAR(255) NOT NULL,
        birth_date VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Attendance Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        period VARCHAR(10) NOT NULL, -- YYYY-MM
        days_present INTEGER DEFAULT 0,
        days_late INTEGER DEFAULT 0,
        days_absent INTEGER DEFAULT 0,
        overtime_hours_first DOUBLE PRECISION DEFAULT 0,
        overtime_hours_next DOUBLE PRECISION DEFAULT 0,
        bonus DOUBLE PRECISION DEFAULT 0,
        insentif DOUBLE PRECISION DEFAULT 0,
        thr DOUBLE PRECISION DEFAULT 0,
        UNIQUE(employee_id, period)
      )
    `);

    // 3. Payroll Runs
    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll_runs (
        id SERIAL PRIMARY KEY,
        period VARCHAR(10) UNIQUE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, APPROVED
        submitted_by VARCHAR(255),
        submitted_at TIMESTAMP,
        approved_by VARCHAR(255),
        approved_at TIMESTAMP,
        rejection_notes TEXT
      )
    `);

    // 4. Payroll Details
    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll_details (
        id SERIAL PRIMARY KEY,
        payroll_run_id INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        basic_salary DOUBLE PRECISION NOT NULL,
        allowance_fixed DOUBLE PRECISION NOT NULL,
        allowance_variable DOUBLE PRECISION DEFAULT 0,
        overtime_pay DOUBLE PRECISION DEFAULT 0,
        bonus DOUBLE PRECISION DEFAULT 0,
        insentif DOUBLE PRECISION DEFAULT 0,
        thr DOUBLE PRECISION DEFAULT 0,
        gross_salary DOUBLE PRECISION NOT NULL,
        bpjs_ks_employee DOUBLE PRECISION DEFAULT 0,
        bpjs_ks_company DOUBLE PRECISION DEFAULT 0,
        bpjs_tk_jht_employee DOUBLE PRECISION DEFAULT 0,
        bpjs_tk_jht_company DOUBLE PRECISION DEFAULT 0,
        bpjs_tk_jp_employee DOUBLE PRECISION DEFAULT 0,
        bpjs_tk_jp_company DOUBLE PRECISION DEFAULT 0,
        bpjs_tk_jkk_company DOUBLE PRECISION DEFAULT 0,
        bpjs_tk_jkm_company DOUBLE PRECISION DEFAULT 0,
        pph21_rate DOUBLE PRECISION DEFAULT 0,
        pph21_amount DOUBLE PRECISION DEFAULT 0,
        net_salary DOUBLE PRECISION NOT NULL,
        payslip_path TEXT,
        UNIQUE(payroll_run_id, employee_id)
      )
    `);

    // 5. Audit Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        action VARCHAR(255) NOT NULL,
        ip_address VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        old_value TEXT,
        new_value TEXT
      )
    `);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Database schema init failed:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  encrypt,
  decrypt,
  dbRun,
  dbAll,
  dbGet,
  dbTransaction,
  initDb
};
