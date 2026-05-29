require('dotenv').config();
const { initDb, encrypt, dbTransaction, pool } = require('./src/database');

async function seed() {
  console.log("Seeding initial realistic payroll data...");
  await initDb();

  // Clear and seed within transaction
  await dbTransaction(async (tx) => {
    await tx.run("DELETE FROM employees");
    await tx.run("DELETE FROM attendance");
    await tx.run("DELETE FROM payroll_runs");
    await tx.run("DELETE FROM payroll_details");

    const initialEmployees = [
      {
        nik: 'NIK1001',
        name: 'Andi Saputra',
        position: 'Senior Software Engineer',
        status: 'PKWTT',
        ptkp: 'TK/0',
        bank_name: 'BCA',
        bank_account: '8012345678',
        bpjs_ks_id: '0001122334455',
        bpjs_tk_id: '11223344556',
        basic_salary: 9500000,
        allowance_fixed: 1500000,
        allowance_transport: 40000,
        allowance_meal: 20000,
        email: 'andi.saputra@company.com',
        birth_date: '1995-04-12'
      },
      {
        nik: 'NIK1002',
        name: 'Budi Santoso',
        position: 'Product Manager',
        status: 'PKWTT',
        ptkp: 'K/1',
        bank_name: 'MANDIRI',
        bank_account: '1370012345678',
        bpjs_ks_id: '0002233445566',
        bpjs_tk_id: '22334455667',
        basic_salary: 16000000,
        allowance_fixed: 2500000,
        allowance_transport: 50000,
        allowance_meal: 25000,
        email: 'budi.santoso@company.com',
        birth_date: '1988-09-21'
      },
      {
        nik: 'NIK1003',
        name: 'Citra Lestari',
        position: 'Finance Specialist',
        status: 'PKWTT',
        ptkp: 'TK/1',
        bank_name: 'BRI',
        bank_account: '001201234567890',
        bpjs_ks_id: '0003344556677',
        bpjs_tk_id: '33445566778',
        basic_salary: 8000000,
        allowance_fixed: 800000,
        allowance_transport: 30000,
        allowance_meal: 20000,
        email: 'citra.lestari@company.com',
        birth_date: '1997-12-05'
      },
      {
        nik: 'NIK1004',
        name: 'Dewi Rahayu',
        position: 'HR Coordinator',
        status: 'PKWTT',
        ptkp: 'K/2',
        bank_name: 'BNI',
        bank_account: '0123456789',
        bpjs_ks_id: '0004455667788',
        bpjs_tk_id: '44556677889',
        basic_salary: 10500000,
        allowance_fixed: 1200000,
        allowance_transport: 40000,
        allowance_meal: 20000,
        email: 'dewi.rahayu@company.com',
        birth_date: '1990-07-15'
      },
      {
        nik: 'NIK1005',
        name: 'Eko Prasetyo',
        position: 'Junior Analyst',
        status: 'PKWT',
        ptkp: 'TK/0',
        bank_name: 'BCA',
        bank_account: '8019876543',
        bpjs_ks_id: '0005566778899',
        bpjs_tk_id: '55667788990',
        basic_salary: 5800000,
        allowance_fixed: 500000,
        allowance_transport: 30000,
        allowance_meal: 20000,
        email: 'eko.prasetyo@company.com',
        birth_date: '2000-01-30'
      }
    ];

    for (const emp of initialEmployees) {
      const bank_account_encrypted = encrypt(emp.bank_account);
      const basic_salary_encrypted = encrypt(emp.basic_salary.toString());
      const allowance_fixed_encrypted = encrypt(emp.allowance_fixed.toString());

      const result = await tx.run(`
        INSERT INTO employees (
          nik, name, position, status, ptkp, bank_name, bank_account_encrypted,
          bpjs_ks_id, bpjs_tk_id, basic_salary_encrypted, allowance_fixed_encrypted,
          allowance_transport, allowance_meal, email, birth_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        emp.nik, emp.name, emp.position, emp.status, emp.ptkp, emp.bank_name, bank_account_encrypted,
        emp.bpjs_ks_id, emp.bpjs_tk_id, basic_salary_encrypted, allowance_fixed_encrypted,
        emp.allowance_transport, emp.allowance_meal, emp.email, emp.birth_date
      ]);

      let otFirst = 0;
      let otNext = 0;
      let bonus = 0;
      let insentif = 0;

      if (emp.nik === 'NIK1001') {
        otFirst = 2; otNext = 4; bonus = 300000; insentif = 200000;
      } else if (emp.nik === 'NIK1002') {
        bonus = 1500000; insentif = 1000000;
      } else if (emp.nik === 'NIK1005') {
        otFirst = 4; otNext = 6;
      }

      await tx.run(`
        INSERT INTO attendance (
          employee_id, period, days_present, days_late, days_absent,
          overtime_hours_first, overtime_hours_next, bonus, insentif, thr
        ) VALUES (?, '2026-05', 21, 1, 0, ?, ?, ?, ?, 0)
      `, [result.id, otFirst, otNext, bonus, insentif]);
    }
  });

  console.log("Seeding complete. 5 employees and May 2026 attendance seeded successfully.");
  await pool.end();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await pool.end();
  process.exit(1);
});
