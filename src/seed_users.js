require('dotenv').config();
const crypto = require('crypto');

// Load connection and helpers
const { initDb, dbTransaction, pool } = require('./database');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function seedUsersAndSettings() {
  console.log("=========================================");
  console.log("    SEEDING USERS & SYSTEM SETTINGS      ");
  console.log("=========================================\n");

  try {
    console.log("Initializing schema...");
    await initDb();

    await dbTransaction(async (tx) => {
      // 1. Seed Users
      console.log("Seeding default users...");
      
      // We will delete existing users to prevent conflicts on unique constraint
      await tx.run("DELETE FROM users");

      const defaultUsers = [
        {
          username: 'admin',
          password: 'password123',
          role: 'Super Admin / IT Tech',
          name: 'Admin Utama',
          email: 'admin@company.com'
        },
        {
          username: 'hr',
          password: 'password123',
          role: 'HR Payroll Specialist',
          name: 'Dewi Rahayu',
          email: 'dewi.rahayu@company.com'
        },
        {
          username: 'finance',
          password: 'password123',
          role: 'Finance / Accounting',
          name: 'Citra Lestari',
          email: 'citra.lestari@company.com'
        },
        {
          username: 'management',
          password: 'password123',
          role: 'Management / Direksi',
          name: 'Budi Santoso',
          email: 'budi.santoso@company.com'
        },
        {
          username: 'andi',
          password: 'password123',
          role: 'Karyawan',
          name: 'Andi Saputra',
          email: 'andi.saputra@company.com'
        }
      ];

      for (const u of defaultUsers) {
        const hash = hashPassword(u.password);
        await tx.run(`
          INSERT INTO users (username, password_hash, role, name, email)
          VALUES (?, ?, ?, ?, ?)
        `, [u.username, hash, u.role, u.name, u.email]);
        console.log(`- Created user: ${u.username} (${u.role})`);
      }

      // 2. Seed System Settings
      console.log("\nSeeding default system settings...");
      
      await tx.run("DELETE FROM system_settings");

      const defaultSettings = [
        // Work Hours & Fines
        { key: 'work_hour_start', value: '08:00' },
        { key: 'work_hour_end', value: '17:00' },
        { key: 'late_tolerance_minutes', value: '15' },
        { key: 'late_fine_per_minute', value: '1000' },
        { key: 'absent_fine_flat', value: '100000' },
        
        // BPJS Rates
        { key: 'bpjs_ks_employee_rate', value: '0.01' },
        { key: 'bpjs_ks_company_rate', value: '0.04' },
        { key: 'bpjs_ks_ceiling', value: '12000000' },
        { key: 'bpjs_tk_jht_employee_rate', value: '0.02' },
        { key: 'bpjs_tk_jht_company_rate', value: '0.037' },
        { key: 'bpjs_tk_jp_employee_rate', value: '0.01' },
        { key: 'bpjs_tk_jp_company_rate', value: '0.02' },
        { key: 'bpjs_tk_jp_ceiling', value: '10024400' },
        { key: 'bpjs_tk_jkk_rate', value: '0.0024' },
        { key: 'bpjs_tk_jkm_rate', value: '0.003' },

        // Company Profile
        { key: 'company_name', value: 'PT Solusi Utama Indonesia' },
        { key: 'company_address', value: 'Gedung Solusi IT, Jl. Antigravity No. 10, Jakarta Selatan' },
        { key: 'company_logo', value: 'https://images.unsplash.com/photo-1599305445671-ac291c95aba9?w=300' }, // premium mock logo
        { key: 'company_signatory_name', value: 'Dewi Rahayu' },
        { key: 'company_signatory_role', value: 'HR Payroll Specialist' }
      ];

      for (const s of defaultSettings) {
        await tx.run(`
          INSERT INTO system_settings (key, value)
          VALUES (?, ?)
        `, [s.key, s.value]);
      }
      console.log(`Seeded ${defaultSettings.length} settings records.`);
    });

    console.log("\nSeeding completed successfully!");
  } catch (err) {
    console.error("Seeding failed:", err.message);
  } finally {
    await pool.end();
  }
}

seedUsersAndSettings();
