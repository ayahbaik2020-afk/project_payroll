const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates a password-protected payslip PDF for an employee.
 * 
 * @param {object} employee - Employee profile data (name, NIK, position, ptkp, birth_date, etc.)
 * @param {object} detail - Calculated payroll details (basic_salary, allowances, taxes, net_salary, etc.)
 * @param {string} period - Payroll period (YYYY-MM)
 * @param {string} outputPath - Destination file path
 * @returns {Promise<string>} Resolve with output path on success
 */
function generatePayslipPdf(employee, detail, period, outputPath, settings = {}) {
  return new Promise((resolve, reject) => {
    try {
      // 1. Prepare password (birthdate YYYYMMDD)
      const password = String(employee.birth_date).replace(/\D/g, '');
      if (password.length !== 8) {
        console.warn(`WARNING: Invalid birth date format for NIK ${employee.nik}: ${employee.birth_date}. Password might not be YYYYMMDD.`);
      }

      // 2. Initialize PDF Document with encryption
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        userPassword: password, // Protect file with birth_date YYYYMMDD
        ownerPassword: 'payroll_super_secret_owner_key_2026',
        permissions: {
          printing: 'highResolution',
          modifying: false,
          copying: false
        }
      });

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // --- Company Info from Settings ---
      const companyName = settings.company_name || 'PT Solusi Utama Indonesia';
      const companyAddress = settings.company_address || 'Gedung Solusi IT, Jl. Antigravity No. 10, Jakarta Selatan';
      const signatoryName = settings.company_signatory_name || 'Dewi Rahayu';
      const signatoryRole = settings.company_signatory_role || 'HR Payroll Specialist';

      // --- PDF Design & Layout ---

      // Header / Company Name
      doc.fillColor('#2e3748')
         .fontSize(16)
         .text(companyName, 50, 50, { align: 'left', bold: true });
      
      doc.fontSize(8)
         .fillColor('#718096')
         .text(companyAddress, 50, 70);
      
      doc.moveTo(50, 85).lineTo(545, 85).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // Slip Title & Period
      const [year, month] = period.split('-');
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthName = monthNames[parseInt(month, 10) - 1] || month;
      
      doc.fillColor('#1a202c')
         .fontSize(12)
         .text('SLIP GAJI KARYAWAN', 50, 100, { align: 'center', underline: true });
      
      doc.fontSize(9)
         .fillColor('#4a5568')
         .text(`Periode: ${monthName} ${year}`, 50, 115, { align: 'center' });

      // Employee Information (Grid)
      doc.fillColor('#2d3748').fontSize(8.5);
      
      // Column 1
      doc.text(`NIK`, 50, 140);
      doc.text(`: ${employee.nik}`, 140, 140);
      doc.text(`Nama Karyawan`, 50, 153);
      doc.text(`: ${employee.name}`, 140, 153);
      doc.text(`Jabatan`, 50, 166);
      doc.text(`: ${employee.position}`, 140, 166);

      // Column 2
      doc.text(`Status Pajak (PTKP)`, 300, 140);
      doc.text(`: ${employee.ptkp}`, 410, 140);
      doc.text(`Status Karyawan`, 300, 153);
      doc.text(`: ${employee.status}`, 410, 153);
      doc.text(`Bank / Rekening`, 300, 166);
      doc.text(`: ${employee.bank_name} - ${detail.bank_account || '***'}`, 410, 166);

      doc.moveTo(50, 182).lineTo(545, 182).strokeColor('#cbd5e0').stroke();

      // Salary Details Header
      doc.fillColor('#2d3748').fontSize(9);
      doc.text('PENERIMAAN (EARNINGS)', 50, 195, { bold: true });
      doc.text('POTONGAN (DEDUCTIONS)', 300, 195, { bold: true });

      doc.moveTo(50, 208).lineTo(545, 208).strokeColor('#e2e8f0').stroke();

      // Earnings & Deductions List
      doc.fontSize(8).fillColor('#4a5568');
      
      let y = 215;
      const formatRupiah = (val) => 'Rp ' + Math.round(val || 0).toLocaleString('id-ID');

      // 1. Basic Salary & BPJS Health
      doc.text('Gaji Pokok', 50, y);
      doc.text(formatRupiah(detail.basic_salary), 200, y, { align: 'right', width: 80 });

      doc.text('BPJS Kesehatan (Karyawan)', 300, y);
      doc.text(formatRupiah(detail.bpjs_ks_employee), 450, y, { align: 'right', width: 95 });
      y += 14;

      // 2. Fixed Allowance & BPJS TK JHT
      doc.text('Tunjangan Tetap', 50, y);
      doc.text(formatRupiah(detail.allowance_fixed), 200, y, { align: 'right', width: 80 });

      doc.text('BPJS TK JHT (Karyawan)', 300, y);
      doc.text(formatRupiah(detail.bpjs_tk_jht_employee), 450, y, { align: 'right', width: 95 });
      y += 14;

      // 3. Allowance Position & BPJS TK JP
      doc.text('Tunjangan Jabatan', 50, y);
      doc.text(formatRupiah(detail.allowance_position), 200, y, { align: 'right', width: 80 });

      doc.text('BPJS TK JP (Karyawan)', 300, y);
      doc.text(formatRupiah(detail.bpjs_tk_jp_employee), 450, y, { align: 'right', width: 95 });
      y += 14;

      // 4. Allowance Family & PPh 21
      doc.text('Tunjangan Keluarga', 50, y);
      doc.text(formatRupiah(detail.allowance_family), 200, y, { align: 'right', width: 80 });

      doc.text(`PPh 21 (Pajak ${detail.is_december_reconciliation ? 'Des' : 'TER'})`, 300, y);
      doc.text(formatRupiah(detail.pph21_amount), 450, y, { align: 'right', width: 95 });
      y += 14;

      // 5. Allowance Communication & Potongan Koperasi
      doc.text('Tunjangan Komunikasi', 50, y);
      doc.text(formatRupiah(detail.allowance_communication), 200, y, { align: 'right', width: 80 });

      doc.text('Potongan Koperasi', 300, y);
      doc.text(formatRupiah(detail.deduction_cooperative), 450, y, { align: 'right', width: 95 });
      y += 14;

      // 6. Variable Allowance (Transport & Makan) & Potongan Pinjaman
      doc.text('Tunjangan Transport & Makan', 50, y);
      doc.text(formatRupiah(detail.allowance_variable), 200, y, { align: 'right', width: 80 });

      doc.text('Potongan Pinjaman', 300, y);
      doc.text(formatRupiah(detail.deduction_loan), 450, y, { align: 'right', width: 95 });
      y += 14;

      // 7. Overtime & Denda Keterlambatan
      doc.text('Uang Lembur', 50, y);
      doc.text(formatRupiah(detail.overtime_pay), 200, y, { align: 'right', width: 80 });

      doc.text('Denda Keterlambatan', 300, y);
      doc.text(formatRupiah(detail.deduction_late), 450, y, { align: 'right', width: 95 });
      y += 14;

      // 8. Bonus & Potongan Absen
      doc.text('Bonus', 50, y);
      doc.text(formatRupiah(detail.bonus), 200, y, { align: 'right', width: 80 });

      doc.text('Potongan Mangkir/Absen', 300, y);
      doc.text(formatRupiah(detail.deduction_absent), 450, y, { align: 'right', width: 95 });
      y += 14;

      // 9. Insentif
      doc.text('Insentif Performa', 50, y);
      doc.text(formatRupiah(detail.insentif), 200, y, { align: 'right', width: 80 });
      y += 14;

      // 10. THR
      doc.text('Tunjangan Hari Raya (THR)', 50, y);
      doc.text(formatRupiah(detail.thr), 200, y, { align: 'right', width: 80 });

      doc.moveTo(50, y + 12).lineTo(280, y + 12).strokeColor('#e2e8f0').stroke();
      doc.moveTo(300, y + 12).lineTo(545, y + 12).strokeColor('#e2e8f0').stroke();
      y += 18;

      // Totals
      const totalEarnings = (detail.basic_salary || 0) + (detail.allowance_fixed || 0) + (detail.allowance_variable || 0) +
        (detail.allowance_position || 0) + (detail.allowance_family || 0) + (detail.allowance_communication || 0) +
        (detail.overtime_pay || 0) + (detail.bonus || 0) + (detail.insentif || 0) + (detail.thr || 0);

      const totalDeductions = (detail.bpjs_ks_employee || 0) + (detail.bpjs_tk_jht_employee || 0) + (detail.bpjs_tk_jp_employee || 0) +
        (detail.pph21_amount || 0) + (detail.deduction_cooperative || 0) + (detail.deduction_loan || 0) +
        (detail.deduction_late || 0) + (detail.deduction_absent || 0);

      doc.fillColor('#2d3748').fontSize(8.5);
      doc.text('Total Penerimaan', 50, y, { bold: true });
      doc.text(formatRupiah(totalEarnings), 200, y, { align: 'right', width: 80, bold: true });

      doc.text('Total Potongan', 300, y, { bold: true });
      doc.text(formatRupiah(totalDeductions), 450, y, { align: 'right', width: 95, bold: true });

      doc.moveTo(50, y + 12).lineTo(545, y + 12).strokeColor('#a0aec0').lineWidth(1).stroke();
      y += 20;

      // Take Home Pay (Net Salary)
      doc.fillColor('#1a202c').fontSize(11);
      doc.text('TAKE HOME PAY (GAJI BERSIH)', 50, y, { bold: true });
      doc.text(formatRupiah(detail.net_salary), 400, y, { align: 'right', width: 145, bold: true });

      doc.moveTo(50, y + 15).lineTo(545, y + 15).strokeColor('#a0aec0').lineWidth(1).stroke();
      y += 22;

      // Company Paid Benefits Info
      doc.fillColor('#718096').fontSize(7.5);
      doc.text('INFORMASI TUNJANGAN BPJS PERUSAHAAN (DIBAYARKAN OLEH PERUSAHAAN):', 50, y, { bold: true });
      y += 10;
      
      doc.text(`- BPJS Kesehatan (4%): ${formatRupiah(detail.bpjs_ks_company)}`, 60, y);
      doc.text(`- BPJS TK JHT (3.7%): ${formatRupiah(detail.bpjs_tk_jht_company)}`, 300, y);
      y += 10;
      doc.text(`- BPJS TK JP (2%): ${formatRupiah(detail.bpjs_tk_jp_company)}`, 60, y);
      doc.text(`- BPJS TK JKK (Risk): ${formatRupiah(detail.bpjs_tk_jkk_company)}`, 300, y);
      y += 10;
      doc.text(`- BPJS TK JKM (0.3%): ${formatRupiah(detail.bpjs_tk_jkm_company)}`, 60, y);
      
      y += 20;

      // Signature Area
      doc.fillColor('#2d3748').fontSize(8.5);
      const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.text(`Jakarta, ${today}`, 380, y, { align: 'center', width: 150 });
      doc.text('Pemberi Kerja,', 380, y + 11, { align: 'center', width: 150 });
      doc.text(companyName.toUpperCase(), 380, y + 22, { align: 'center', width: 150, bold: true });

      doc.text(`( ${signatoryName} )`, 380, y + 70, { align: 'center', width: 150 });
      doc.fontSize(8).text(signatoryRole, 380, y + 80, { align: 'center', width: 150 });

      // Note at bottom
      doc.fillColor('#a0aec0').fontSize(6.5);
      doc.text('Catatan: Slip gaji ini di-generate otomatis secara elektronik. Rahasia dan hanya untuk kalangan sendiri.', 50, 785, { align: 'center' });

      // Close the document
      doc.end();

      writeStream.on('finish', () => {
        resolve(outputPath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePayslipPdf
};
