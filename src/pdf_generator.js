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
function generatePayslipPdf(employee, detail, period, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      // 1. Prepare password (birthdate YYYYMMDD)
      // If birth_date is YYYY-MM-DD, replace dashes
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

      // --- PDF Design & Layout ---

      // Header / Company Logo
      doc.fillColor('#2e3748')
         .fontSize(20)
         .text('PT payroll CORE ENGINE', 50, 50, { align: 'left', bold: true });
      
      doc.fontSize(8)
         .fillColor('#718096')
         .text('Gedung Solusi IT, Jl. Antigravity No. 10, Jakarta Selatan', 50, 75);
      
      doc.moveTo(50, 90).lineTo(545, 90).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // Slip Title & Period
      const [year, month] = period.split('-');
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthName = monthNames[parseInt(month, 10) - 1] || month;
      
      doc.fillColor('#1a202c')
         .fontSize(14)
         .text('SLIP GAJI KARYAWAN', 50, 110, { align: 'center', underline: true });
      
      doc.fontSize(10)
         .fillColor('#4a5568')
         .text(`Periode: ${monthName} ${year}`, 50, 128, { align: 'center' });

      // Employee Information (Grid)
      doc.fillColor('#2d3748').fontSize(9);
      
      // Column 1
      doc.text(`NIK`, 50, 160);
      doc.text(`: ${employee.nik}`, 140, 160);
      doc.text(`Nama Karyawan`, 50, 175);
      doc.text(`: ${employee.name}`, 140, 175);
      doc.text(`Jabatan`, 50, 190);
      doc.text(`: ${employee.position}`, 140, 190);

      // Column 2
      doc.text(`Status Pajak (PTKP)`, 300, 160);
      doc.text(`: ${employee.ptkp}`, 410, 160);
      doc.text(`Status Karyawan`, 300, 175);
      doc.text(`: ${employee.status}`, 410, 175);
      doc.text(`Bank / Rekening`, 300, 190);
      doc.text(`: ${employee.bank_name} - ${detail.bank_account || '***'}`, 410, 190);

      doc.moveTo(50, 210).lineTo(545, 210).strokeColor('#cbd5e0').stroke();

      // Salary Details Header
      doc.fillColor('#2d3748').fontSize(10);
      doc.text('PENERIMAAN (EARNINGS)', 50, 225, { bold: true });
      doc.text('POTONGAN (DEDUCTIONS)', 300, 225, { bold: true });

      doc.moveTo(50, 240).lineTo(545, 240).strokeColor('#e2e8f0').stroke();

      // Earnings & Deductions List
      doc.fontSize(9).fillColor('#4a5568');
      
      let y = 250;
      const formatRupiah = (val) => 'Rp ' + Math.round(val).toLocaleString('id-ID');

      // 1. Basic Salary
      doc.text('Gaji Pokok', 50, y);
      doc.text(formatRupiah(detail.basic_salary), 200, y, { align: 'right', width: 80 });

      // BPJS Kesehatan potongan (1%)
      doc.text('BPJS Kesehatan (1%)', 300, y);
      doc.text(formatRupiah(detail.bpjs_ks_employee), 450, y, { align: 'right', width: 95 });
      
      y += 18;

      // 2. Fixed Allowance
      doc.text('Tunjangan Tetap', 50, y);
      doc.text(formatRupiah(detail.allowance_fixed), 200, y, { align: 'right', width: 80 });

      // BPJS TK JHT potongan (2%)
      doc.text('BPJS TK JHT (2%)', 300, y);
      doc.text(formatRupiah(detail.bpjs_tk_jht_employee), 450, y, { align: 'right', width: 95 });

      y += 18;

      // 3. Variable Allowance (Transport + Meal)
      doc.text('Tunjangan Transport & Makan', 50, y);
      doc.text(formatRupiah(detail.allowance_variable), 200, y, { align: 'right', width: 80 });

      // BPJS TK JP potongan (1%)
      doc.text('BPJS TK JP (1%)', 300, y);
      doc.text(formatRupiah(detail.bpjs_tk_jp_employee), 450, y, { align: 'right', width: 95 });

      y += 18;

      // 4. Overtime
      doc.text('Uang Lembur', 50, y);
      doc.text(formatRupiah(detail.overtime_pay), 200, y, { align: 'right', width: 80 });

      // Tax PPh 21
      doc.text(`PPh 21 (Pajak ${detail.is_december_reconciliation ? 'Des' : 'TER'})`, 300, y);
      doc.text(formatRupiah(detail.pph21_amount), 450, y, { align: 'right', width: 95 });

      y += 18;

      // 5. Bonus
      doc.text('Bonus', 50, y);
      doc.text(formatRupiah(detail.bonus), 200, y, { align: 'right', width: 80 });
      y += 18;

      // 6. Insentif
      doc.text('Insentif Performa', 50, y);
      doc.text(formatRupiah(detail.insentif), 200, y, { align: 'right', width: 80 });
      y += 18;

      // 7. THR
      doc.text('Tunjangan Hari Raya (THR)', 50, y);
      doc.text(formatRupiah(detail.thr), 200, y, { align: 'right', width: 80 });

      doc.moveTo(50, y + 15).lineTo(280, y + 15).strokeColor('#e2e8f0').stroke();
      doc.moveTo(300, y + 15).lineTo(545, y + 15).strokeColor('#e2e8f0').stroke();
      y += 22;

      // Totals
      const totalEarnings = detail.basic_salary + detail.allowance_fixed + detail.allowance_variable + detail.overtime_pay + detail.bonus + detail.insentif + detail.thr;
      const totalDeductions = detail.bpjs_ks_employee + detail.bpjs_tk_jht_employee + detail.bpjs_tk_jp_employee + detail.pph21_amount;

      doc.fillColor('#2d3748').fontSize(9);
      doc.text('Total Penerimaan', 50, y, { bold: true });
      doc.text(formatRupiah(totalEarnings), 200, y, { align: 'right', width: 80, bold: true });

      doc.text('Total Potongan', 300, y, { bold: true });
      doc.text(formatRupiah(totalDeductions), 450, y, { align: 'right', width: 95, bold: true });

      doc.moveTo(50, y + 15).lineTo(545, y + 15).strokeColor('#a0aec0').lineWidth(1.5).stroke();
      y += 25;

      // Take Home Pay (Net Salary)
      doc.fillColor('#1a202c').fontSize(12);
      doc.text('TAKE HOME PAY (GAJI BERSIH)', 50, y, { bold: true });
      doc.text(formatRupiah(detail.net_salary), 400, y, { align: 'right', width: 145, bold: true });

      doc.moveTo(50, y + 18).lineTo(545, y + 18).strokeColor('#a0aec0').lineWidth(1.5).stroke();
      y += 30;

      // Company Paid Benefits Info (Informational, non-deductible)
      doc.fillColor('#718096').fontSize(8);
      doc.text('INFORMASI TUNJANGAN BPJS PERUSAHAAN (DIBAYARKAN OLEH PERUSAHAAN):', 50, y, { bold: true });
      y += 12;
      
      doc.text(`- BPJS Kesehatan (4%): ${formatRupiah(detail.bpjs_ks_company)}`, 60, y);
      doc.text(`- BPJS TK JHT (3.7%): ${formatRupiah(detail.bpjs_tk_jht_company)}`, 300, y);
      y += 12;
      doc.text(`- BPJS TK JP (2%): ${formatRupiah(detail.bpjs_tk_jp_company)}`, 60, y);
      doc.text(`- BPJS TK JKK (0.24%): ${formatRupiah(detail.bpjs_tk_jkk_company)}`, 300, y);
      y += 12;
      doc.text(`- BPJS TK JKM (0.3%): ${formatRupiah(detail.bpjs_tk_jkm_company)}`, 60, y);
      
      y += 35;

      // Signature Area
      doc.fillColor('#2d3748').fontSize(9);
      const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.text(`Jakarta, ${today}`, 380, y, { align: 'center', width: 150 });
      doc.text('Pemberi Kerja,', 380, y + 12, { align: 'center', width: 150 });
      doc.text('PT PAYROLL CORE ENGINE', 380, y + 24, { align: 'center', width: 150, bold: true });

      doc.text('( HR Payroll Specialist )', 380, y + 80, { align: 'center', width: 150 });

      // Note at bottom
      doc.fillColor('#a0aec0').fontSize(7);
      doc.text('Catatan: Slip gaji ini di-generate otomatis secara elektronik. Rahasia dan hanya untuk kalangan sendiri.', 50, 780, { align: 'center' });

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
