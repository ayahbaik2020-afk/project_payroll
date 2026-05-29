require('dotenv').config();
const { initDb, encrypt, dbTransaction, pool } = require('./src/database');

async function seed() {
  console.log("Seeding initial realistic payroll data with complete profiles...");
  await initDb();

  await dbTransaction(async (tx) => {
    await tx.run("DELETE FROM payroll_details");
    await tx.run("DELETE FROM payroll_runs");
    await tx.run("DELETE FROM attendance");
    await tx.run("DELETE FROM employees");

    const initialEmployees = [
      {
        nik: 'NIK1001',
        name: 'Andi Saputra',
        position: 'Senior Software Engineer',
        department: 'Engineering',
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
        allowance_position: 500000,
        allowance_family: 250000,
        allowance_communication: 150000,
        deduction_cooperative: 50000,
        deduction_loan: 200000,
        email: 'andi.saputra@company.com',
        birth_date: '1995-04-12',
        hire_date: '2020-03-01',
        // Extended profile
        nik_ktp: '3174052604950001',
        npwp: '12.345.678.9-012.000',
        phone: '+62 812-3456-7890',
        address: 'Jl. Kebon Jeruk Raya No. 15, RT 003/RW 005, Kebon Jeruk, Jakarta Barat 11530',
        photo_url: 'https://api.dicebear.com/8.x/personas/svg?seed=AndiSaputra&backgroundColor=b6e3f4',
        emergency_contact_name: 'Siti Rahayu',
        emergency_contact_phone: '+62 813-9876-5432'
      },
      {
        nik: 'NIK1002',
        name: 'Budi Santoso',
        position: 'Product Manager',
        department: 'Product',
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
        allowance_position: 1200000,
        allowance_family: 500000,
        allowance_communication: 150000,
        deduction_cooperative: 50000,
        deduction_loan: 0,
        email: 'budi.santoso@company.com',
        birth_date: '1988-09-21',
        hire_date: '2018-07-15',
        nik_ktp: '3175012109880002',
        npwp: '98.765.432.1-021.000',
        phone: '+62 821-9876-5432',
        address: 'Jl. TB Simatupang Blok A No. 8, Lebak Bulus, Cilandak, Jakarta Selatan 12440',
        photo_url: 'https://api.dicebear.com/8.x/personas/svg?seed=BudiSantoso&backgroundColor=c0aede',
        emergency_contact_name: 'Rina Santoso',
        emergency_contact_phone: '+62 822-1234-5678'
      },
      {
        nik: 'NIK1003',
        name: 'Citra Lestari',
        position: 'Finance Specialist',
        department: 'Finance',
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
        allowance_position: 500000,
        allowance_family: 250000,
        allowance_communication: 150000,
        deduction_cooperative: 50000,
        deduction_loan: 0,
        email: 'citra.lestari@company.com',
        birth_date: '1997-12-05',
        hire_date: '2021-01-10',
        nik_ktp: '3204290512970003',
        npwp: '11.222.333.4-031.000',
        phone: '+62 857-1122-3344',
        address: 'Jl. Margonda Raya No. 45, Beji, Depok, Jawa Barat 16424',
        photo_url: 'https://api.dicebear.com/8.x/personas/svg?seed=CitraLestari&backgroundColor=ffdfbf',
        emergency_contact_name: 'Hendra Lestari',
        emergency_contact_phone: '+62 811-9988-7766'
      },
      {
        nik: 'NIK1004',
        name: 'Dewi Rahayu',
        position: 'HR Coordinator',
        department: 'Human Resources',
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
        allowance_position: 500000,
        allowance_family: 250000,
        allowance_communication: 150000,
        deduction_cooperative: 50000,
        deduction_loan: 0,
        email: 'dewi.rahayu@company.com',
        birth_date: '1990-07-15',
        hire_date: '2019-05-20',
        nik_ktp: '3671241507900004',
        npwp: '55.666.777.8-041.000',
        phone: '+62 878-5544-3322',
        address: 'Perum. Bumi Serpong Damai Sektor 7, Blok D5 No. 12, Tangerang Selatan 15310',
        photo_url: 'https://api.dicebear.com/8.x/personas/svg?seed=DewiRahayu&backgroundColor=d1d4f9',
        emergency_contact_name: 'Agus Rahayu',
        emergency_contact_phone: '+62 815-3344-5566'
      },
      {
        nik: 'NIK1005',
        name: 'Eko Prasetyo',
        position: 'Junior Business Analyst',
        department: 'Analyst',
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
        allowance_position: 500000,
        allowance_family: 250000,
        allowance_communication: 150000,
        deduction_cooperative: 50000,
        deduction_loan: 0,
        email: 'eko.prasetyo@company.com',
        birth_date: '2000-01-30',
        hire_date: '2023-02-01',
        nik_ktp: '3578043001000005',
        npwp: '22.333.444.5-051.000',
        phone: '+62 895-6677-8899',
        address: 'Jl. Raya Bekasi Timur No. 88, RT 002/RW 008, Jatinegara, Bekasi Timur 17111',
        photo_url: 'https://api.dicebear.com/8.x/personas/svg?seed=EkoPrasetyo&backgroundColor=ffd5dc',
        emergency_contact_name: 'Slamet Prasetyo',
        emergency_contact_phone: '+62 819-7788-9900'
      }
    ];

    for (const emp of initialEmployees) {
      const bank_account_encrypted = encrypt(emp.bank_account);
      const basic_salary_encrypted = encrypt(emp.basic_salary.toString());
      const allowance_fixed_encrypted = encrypt(emp.allowance_fixed.toString());
      const allowance_position_encrypted = encrypt(emp.allowance_position.toString());
      const allowance_family_encrypted = encrypt(emp.allowance_family.toString());
      const allowance_communication_encrypted = encrypt(emp.allowance_communication.toString());
      const deduction_cooperative_encrypted = encrypt(emp.deduction_cooperative.toString());
      const deduction_loan_encrypted = encrypt(emp.deduction_loan.toString());

      const result = await tx.run(`
        INSERT INTO employees (
          nik, name, position, department, status, ptkp, bank_name, bank_account_encrypted,
          bpjs_ks_id, bpjs_tk_id, basic_salary_encrypted, allowance_fixed_encrypted,
          allowance_transport, allowance_meal, email, birth_date, hire_date,
          allowance_position_encrypted, allowance_family_encrypted, allowance_communication_encrypted,
          deduction_cooperative_encrypted, deduction_loan_encrypted,
          nik_ktp, npwp, phone, address, photo_url,
          emergency_contact_name, emergency_contact_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        emp.nik, emp.name, emp.position, emp.department, emp.status, emp.ptkp,
        emp.bank_name, bank_account_encrypted,
        emp.bpjs_ks_id, emp.bpjs_tk_id, basic_salary_encrypted, allowance_fixed_encrypted,
        emp.allowance_transport, emp.allowance_meal, emp.email, emp.birth_date, emp.hire_date,
        allowance_position_encrypted, allowance_family_encrypted, allowance_communication_encrypted,
        deduction_cooperative_encrypted, deduction_loan_encrypted,
        emp.nik_ktp, emp.npwp, emp.phone, emp.address, emp.photo_url,
        emp.emergency_contact_name, emp.emergency_contact_phone
      ]);

      // Attendance May 2026
      let otFirst = 0, otNext = 0, bonus = 0, insentif = 0;
      if (emp.nik === 'NIK1001') { otFirst = 2; otNext = 4; bonus = 300000; insentif = 200000; }
      else if (emp.nik === 'NIK1002') { bonus = 1500000; insentif = 1000000; }
      else if (emp.nik === 'NIK1005') { otFirst = 4; otNext = 6; }

      await tx.run(`
        INSERT INTO attendance (
          employee_id, period, days_present, days_late, days_absent,
          overtime_hours_first, overtime_hours_next, bonus, insentif, thr
        ) VALUES (?, '2026-05', 21, 1, 0, ?, ?, ?, ?, 0)
      `, [result.id, otFirst, otNext, bonus, insentif]);

      console.log(`  ✓ ${emp.name} (${emp.nik}) — ${emp.department}`);
    }
  });

  console.log("\nSeeding complete. 5 karyawan dengan profil lengkap dan foto berhasil diseed.");
  await pool.end();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await pool.end();
  process.exit(1);
});
