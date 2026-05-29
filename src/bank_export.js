/**
 * Utility to generate corporate bank transfer files (bulk payment)
 * based on bank specifications (BCA, Mandiri, BRI, BNI).
 */

/**
 * Generates bank-clearing transfer file content.
 * 
 * @param {string} bankName - Target bank (BCA, MANDIRI, BRI, BNI)
 * @param {string} period - Payroll period (YYYY-MM)
 * @param {Array} details - List of payroll details (including employee profile and decrypted bank accounts)
 * @returns {object} { content: string, filename: string, mimeType: string }
 */
function generateBankFile(bankName, period, details) {
  const formattedBankName = String(bankName).toUpperCase();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  let content = '';
  let filename = '';
  let mimeType = 'text/plain';

  // Calculate totals
  const totalAmount = details.reduce((sum, d) => sum + d.net_salary, 0);
  const totalRecords = details.length;
  const sourceAccount = '1234567890'; // Corporate account simulation

  switch (formattedBankName) {
    case 'BCA':
      // BCA KlikBBS / corporate payroll format (.TXT or .CSV)
      // Header: P;[YYYYMMDD];[SourceAccount];[TotalRecords];[TotalAmount]
      // Details: [DestAccount];[DestName];[Amount];[Remark];[Email]
      filename = `BCA_PAYROLL_${period}_${dateStr}.txt`;
      mimeType = 'text/plain';
      content += `H;PAYROLL;${dateStr};${sourceAccount};${totalRecords};${totalAmount}\n`;
      details.forEach((d, index) => {
        // Clean account number (digits only)
        const cleanAccount = d.bank_account.replace(/\D/g, '');
        const cleanName = d.employee_name.replace(/;/g, '').slice(0, 30).toUpperCase();
        content += `D;${cleanAccount};${cleanName};${d.net_salary};Payroll ${period};${d.email}\n`;
      });
      break;

    case 'MANDIRI':
      // Mandiri Cash Management (MCM) CSV layout
      // Columns: Beneficiary Account, Beneficiary Name, Amount, Description, Beneficiary Email, etc.
      filename = `MANDIRI_PAYROLL_${period}_${dateStr}.csv`;
      mimeType = 'text/csv';
      content += `"Beneficiary Account","Beneficiary Name","Amount","Currency","Description","Beneficiary Email","Charge Type"\n`;
      details.forEach(d => {
        const cleanAccount = d.bank_account.replace(/\D/g, '');
        const cleanName = d.employee_name.replace(/"/g, '""').slice(0, 35).toUpperCase();
        content += `"${cleanAccount}","${cleanName}",${d.net_salary},"IDR","PAYROLL ${period}","${d.email}","OUR"\n`;
      });
      break;

    case 'BRI':
      // BRI CMS CSV payroll layout
      filename = `BRI_PAYROLL_${period}_${dateStr}.csv`;
      mimeType = 'text/csv';
      content += `No;Rekening Penerima;Nama Penerima;Nominal;Keterangan;Email Penerima\n`;
      details.forEach((d, index) => {
        const cleanAccount = d.bank_account.replace(/\D/g, '');
        const cleanName = d.employee_name.replace(/;/g, '').slice(0, 30).toUpperCase();
        content += `${index + 1};${cleanAccount};${cleanName};${d.net_salary};GAJI_${period};${d.email}\n`;
      });
      break;

    case 'BNI':
      // BNI Direct text file layout (Fixed width or CSV)
      // We implement BNI Direct CSV format
      filename = `BNI_PAYROLL_${period}_${dateStr}.csv`;
      mimeType = 'text/csv';
      content += `Transfer Type,Source Account,Destination Account,Recipient Name,Amount,Currency,Remark,Email\n`;
      details.forEach(d => {
        const cleanAccount = d.bank_account.replace(/\D/g, '');
        const cleanName = d.employee_name.replace(/,/g, '').slice(0, 30).toUpperCase();
        content += `BNI-to-BNI,${sourceAccount},${cleanAccount},${cleanName},${d.net_salary},IDR,PAYROLL ${period},${d.email}\n`;
      });
      break;

    default:
      // Generic fallback text format
      filename = `PAYROLL_EXPORT_${period}_${dateStr}.txt`;
      mimeType = 'text/plain';
      content += `=== PAYROLL EXPORT BATCH FOR ${formattedBankName} ===\n`;
      content += `Period: ${period}\n`;
      content += `Export Date: ${new Date().toLocaleString()}\n`;
      content += `Total Records: ${totalRecords}\n`;
      content += `Total Disbursed: Rp ${totalAmount.toLocaleString('id-ID')}\n`;
      content += `==========================================\n\n`;
      details.forEach((d, index) => {
        content += `${index + 1}. Account: ${d.bank_account} | Name: ${d.employee_name} | Amount: Rp ${d.net_salary.toLocaleString('id-ID')}\n`;
      });
  }

  return {
    content,
    filename,
    mimeType
  };
}

module.exports = {
  generateBankFile
};
