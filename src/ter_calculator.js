// PPh 21 TER (Tarif Efektif Rata-Rata) & Indonesian BPJS Calculator

// 1. PTKP Values per Year
const PTKP_VALUES = {
  'TK/0': 54000000,
  'TK/1': 58500000,
  'TK/2': 63000000,
  'TK/3': 67500000,
  'K/0': 58500000,
  'K/1': 63000000,
  'K/2': 67500000,
  'K/3': 72000000,
  'K/I/0': 108000000,
  'K/I/1': 112500000,
  'K/I/2': 117000000,
  'K/I/3': 121500000,
};

// 2. Map PTKP Status to TER Category (A, B, or C)
function getTERCategory(ptkp) {
  const status = String(ptkp).toUpperCase();
  if (['TK/0', 'TK/1', 'K/0'].includes(status)) {
    return 'A';
  } else if (['TK/2', 'TK/3', 'K/1', 'K/2', 'K/I/0', 'K/I/1', 'K/I/2'].includes(status)) {
    return 'B';
  } else if (['K/3', 'K/I/3'].includes(status)) {
    return 'C';
  }
  return 'A'; // Default fallback
}

// 3. TER Tables (PP 58/2023)
const TER_A_TABLE = [
  { max: 5400000, rate: 0 },
  { max: 5650000, rate: 0.0025 },
  { max: 5950000, rate: 0.005 },
  { max: 6300000, rate: 0.0075 },
  { max: 6750000, rate: 0.01 },
  { max: 7500000, rate: 0.0125 },
  { max: 8550000, rate: 0.015 },
  { max: 9650000, rate: 0.0175 },
  { max: 10050000, rate: 0.02 },
  { max: 10350000, rate: 0.0225 },
  { max: 10700000, rate: 0.025 },
  { max: 11250000, rate: 0.03 },
  { max: 11600000, rate: 0.035 },
  { max: 12000000, rate: 0.04 },
  { max: 12500000, rate: 0.05 },
  { max: 13000000, rate: 0.06 },
  { max: 15000000, rate: 0.07 },
  { max: 19000000, rate: 0.09 },
  { max: 21000000, rate: 0.10 },
  { max: 23000000, rate: 0.11 },
  { max: 25000000, rate: 0.12 },
  { max: 29000000, rate: 0.13 },
  { max: 35000000, rate: 0.14 },
  { max: 40000000, rate: 0.15 },
  { max: 45000000, rate: 0.17 },
  { max: 54000000, rate: 0.19 },
  { max: 67000000, rate: 0.21 },
  { max: 84000000, rate: 0.22 },
  { max: 110000000, rate: 0.23 },
  { max: 140000000, rate: 0.24 },
  { max: 180000000, rate: 0.25 },
  { max: 290000000, rate: 0.26 },
  { max: 430000000, rate: 0.27 },
  { max: 540000000, rate: 0.28 },
  { max: 690000000, rate: 0.29 },
  { max: 860000000, rate: 0.30 },
  { max: 1100000000, rate: 0.31 },
  { max: 1400000000, rate: 0.32 },
  { max: 2000000000, rate: 0.33 },
  { max: Infinity, rate: 0.34 }
];

const TER_B_TABLE = [
  { max: 6200000, rate: 0 },
  { max: 6500000, rate: 0.0025 },
  { max: 6850000, rate: 0.005 },
  { max: 7300000, rate: 0.0075 },
  { max: 9200000, rate: 0.01 },
  { max: 10750000, rate: 0.0125 },
  { max: 11250000, rate: 0.015 },
  { max: 11600000, rate: 0.0175 },
  { max: 12600000, rate: 0.02 },
  { max: 13100000, rate: 0.0225 },
  { max: 13600000, rate: 0.025 },
  { max: 14150000, rate: 0.03 },
  { max: 14650000, rate: 0.035 },
  { max: 15000000, rate: 0.04 },
  { max: 15500000, rate: 0.05 },
  { max: 17000000, rate: 0.06 },
  { max: 19500000, rate: 0.07 },
  { max: 22700000, rate: 0.09 },
  { max: 25000000, rate: 0.10 },
  { max: 27100000, rate: 0.11 },
  { max: 29050000, rate: 0.12 },
  { max: 31200000, rate: 0.13 },
  { max: 35800000, rate: 0.14 },
  { max: 40550000, rate: 0.15 },
  { max: 45300000, rate: 0.17 },
  { max: 54100000, rate: 0.19 },
  { max: 67150000, rate: 0.21 },
  { max: 84100000, rate: 0.22 },
  { max: 110150000, rate: 0.23 },
  { max: 140200000, rate: 0.24 },
  { max: 180250000, rate: 0.25 },
  { max: 290300000, rate: 0.26 },
  { max: 430400000, rate: 0.27 },
  { max: 540400000, rate: 0.28 },
  { max: 690500000, rate: 0.29 },
  { max: 860500000, rate: 0.30 },
  { max: 1100600000, rate: 0.31 },
  { max: 1400700000, rate: 0.32 },
  { max: 2000900000, rate: 0.33 },
  { max: Infinity, rate: 0.34 }
];

const TER_C_TABLE = [
  { max: 6600000, rate: 0 },
  { max: 6950000, rate: 0.0025 },
  { max: 7350000, rate: 0.005 },
  { max: 7800000, rate: 0.0075 },
  { max: 8850000, rate: 0.01 },
  { max: 9800000, rate: 0.0125 },
  { max: 10300000, rate: 0.015 },
  { max: 10800000, rate: 0.0175 },
  { max: 11300000, rate: 0.02 },
  { max: 11800000, rate: 0.0225 },
  { max: 12300000, rate: 0.025 },
  { max: 12800000, rate: 0.03 },
  { max: 13300000, rate: 0.035 },
  { max: 13800000, rate: 0.04 },
  { max: 14400000, rate: 0.05 },
  { max: 15400000, rate: 0.06 },
  { max: 17400000, rate: 0.07 },
  { max: 19600000, rate: 0.09 },
  { max: 22300000, rate: 0.10 },
  { max: 24400000, rate: 0.11 },
  { max: 26300000, rate: 0.12 },
  { max: 28100000, rate: 0.13 },
  { max: 30000000, rate: 0.14 },
  { max: 34200000, rate: 0.15 },
  { max: 38600000, rate: 0.17 },
  { max: 45400000, rate: 0.19 },
  { max: 54100000, rate: 0.21 },
  { max: 67200000, rate: 0.22 },
  { max: 84100000, rate: 0.23 },
  { max: 110200000, rate: 0.24 },
  { max: 140200000, rate: 0.25 },
  { max: 180300000, rate: 0.26 },
  { max: 290400000, rate: 0.27 },
  { max: 430500000, rate: 0.28 },
  { max: 540500000, rate: 0.29 },
  { max: 690600000, rate: 0.30 },
  { max: 860700000, rate: 0.31 },
  { max: 1100700000, rate: 0.32 },
  { max: 1400800000, rate: 0.33 },
  { max: Infinity, rate: 0.34 }
];

// Helper to look up TER rate
function getTERRate(category, grossSalary) {
  let table = TER_A_TABLE;
  if (category === 'B') table = TER_B_TABLE;
  if (category === 'C') table = TER_C_TABLE;

  const bracket = table.find(item => grossSalary <= item.max);
  return bracket ? bracket.rate : 0.34;
}

// 4. Overtime Calculation
function calculateOvertime(basicSalary, fixedAllowance, hoursFirst, hoursNext) {
  const hourlyRate = (basicSalary + fixedAllowance) / 173;
  const payFirst = hoursFirst * 1.5 * hourlyRate;
  const payNext = hoursNext * 2.0 * hourlyRate;
  return {
    hourlyRate,
    payFirst,
    payNext,
    totalOvertimePay: Math.round(payFirst + payNext)
  };
}

// 5. BPJS Calculations
function calculateBPJS(basicSalary, fixedAllowance, jkkRiskRate = 0.0024, settings = {}) {
  const baseSalary = basicSalary + fixedAllowance;

  // Read dynamic rates and ceilings from settings or use defaults
  const ksEmployeeRate = settings.bpjs_ks_employee_rate !== undefined ? parseFloat(settings.bpjs_ks_employee_rate) : 0.01;
  const ksCompanyRate = settings.bpjs_ks_company_rate !== undefined ? parseFloat(settings.bpjs_ks_company_rate) : 0.04;
  const ksCeiling = settings.bpjs_ks_ceiling !== undefined ? parseFloat(settings.bpjs_ks_ceiling) : 12000000;

  const jhtEmployeeRate = settings.bpjs_tk_jht_employee_rate !== undefined ? parseFloat(settings.bpjs_tk_jht_employee_rate) : 0.02;
  const jhtCompanyRate = settings.bpjs_tk_jht_company_rate !== undefined ? parseFloat(settings.bpjs_tk_jht_company_rate) : 0.037;

  const jpEmployeeRate = settings.bpjs_tk_jp_employee_rate !== undefined ? parseFloat(settings.bpjs_tk_jp_employee_rate) : 0.01;
  const jpCompanyRate = settings.bpjs_tk_jp_company_rate !== undefined ? parseFloat(settings.bpjs_tk_jp_company_rate) : 0.02;
  const jpCeiling = settings.bpjs_tk_jp_ceiling !== undefined ? parseFloat(settings.bpjs_tk_jp_ceiling) : 10024400;

  const jkkRate = settings.bpjs_tk_jkk_rate !== undefined ? parseFloat(settings.bpjs_tk_jkk_rate) : (parseFloat(jkkRiskRate) || 0.0024);
  const jkmRate = settings.bpjs_tk_jkm_rate !== undefined ? parseFloat(settings.bpjs_tk_jkm_rate) : 0.003;

  // BPJS Kesehatan limits
  const ksBase = Math.min(Math.max(baseSalary, 0), ksCeiling);
  const ksEmployee = Math.round(ksBase * ksEmployeeRate);
  const ksCompany = Math.round(ksBase * ksCompanyRate);

  // BPJS Ketenagakerjaan (JHT): base = baseSalary (no ceiling)
  const jhtEmployee = Math.round(baseSalary * jhtEmployeeRate);
  const jhtCompany = Math.round(baseSalary * jhtCompanyRate);

  // BPJS Ketenagakerjaan (JP): base limit ceiling
  const jpBase = Math.min(Math.max(baseSalary, 0), jpCeiling);
  const jpEmployee = Math.round(jpBase * jpEmployeeRate);
  const jpCompany = Math.round(jpBase * jpCompanyRate);

  // JKK and JKM: company only, based on baseSalary
  const jkkCompany = Math.round(baseSalary * jkkRate);
  const jkmCompany = Math.round(baseSalary * jkmRate);

  return {
    ksEmployee,
    ksCompany,
    jhtEmployee,
    jhtCompany,
    jpEmployee,
    jpCompany,
    jkkCompany,
    jkmCompany
  };
}

// 6. Progressive Pasal 17 Tax Calculation (for December annualized tax calculation)
function calculatePasal17Tax(pkp) {
  if (pkp <= 0) return 0;
  
  let tax = 0;
  let remaining = pkp;

  // Bracket 1: 5% for up to 60,000,000
  const b1 = Math.min(remaining, 60000000);
  tax += b1 * 0.05;
  remaining -= b1;

  if (remaining <= 0) return Math.round(tax);

  // Bracket 2: 15% for next 190,000,000 (from 60M to 250M)
  const b2 = Math.min(remaining, 190000000);
  tax += b2 * 0.15;
  remaining -= b2;

  if (remaining <= 0) return Math.round(tax);

  // Bracket 3: 25% for next 250,000,000 (from 250M to 500M)
  const b3 = Math.min(remaining, 250000000);
  tax += b3 * 0.25;
  remaining -= b3;

  if (remaining <= 0) return Math.round(tax);

  // Bracket 4: 30% for next 4,500,000,000 (from 500M to 5B)
  const b4 = Math.min(remaining, 4500000000);
  tax += b4 * 0.30;
  remaining -= b4;

  if (remaining <= 0) return Math.round(tax);

  // Bracket 5: 35% for any amount above 5,000,000,000
  tax += remaining * 0.35;

  return Math.round(tax);
}

// 7. Standard Monthly Calculator (January - November)
function calculateMonthlyPayroll(employee, attendance, settings = {}) {
  const basicSalary = employee.basicSalary || 0;
  const allowanceFixed = employee.allowanceFixed || 0;
  const allowancePosition = employee.allowancePosition || 0;
  const allowanceFamily = employee.allowanceFamily || 0;
  const allowanceCommunication = employee.allowanceCommunication || 0;

  const deductionCooperative = employee.deductionCooperative || 0;
  const deductionLoan = employee.deductionLoan || 0;

  // Calculate late and absent fines dynamically
  const lateFineFlat = settings.late_fine_flat !== undefined ? parseFloat(settings.late_fine_flat) : 15000;
  const absentFineFlat = settings.absent_fine_flat !== undefined ? parseFloat(settings.absent_fine_flat) : 100000;
  const deductionLate = (attendance.days_late || 0) * lateFineFlat;
  const deductionAbsent = (attendance.days_absent || 0) * absentFineFlat;

  // Variable Allowances: based on actual present days
  const allowanceVariable = (attendance.days_present || 0) * ((employee.allowanceTransport || 0) + (employee.allowanceMeal || 0));

  // Overtime pay
  const overtime = calculateOvertime(
    basicSalary, 
    allowanceFixed, 
    attendance.overtime_hours_first || 0, 
    attendance.overtime_hours_next || 0
  );

  const jkkRiskRate = settings.bpjs_tk_jkk_rate !== undefined ? parseFloat(settings.bpjs_tk_jkk_rate) : 0.0024;

  // BPJS values
  const bpjs = calculateBPJS(basicSalary, allowanceFixed, jkkRiskRate, settings);

  // Gross Salary calculation:
  // Cash Gross = Basic + Fixed + Variable + Position + Family + Communication + Overtime + Bonus + Insentif + THR
  const cashGross = basicSalary + allowanceFixed + allowanceVariable + allowancePosition + allowanceFamily + allowanceCommunication + overtime.totalOvertimePay + (attendance.bonus || 0) + (attendance.insentif || 0) + (attendance.thr || 0);
  
  const taxablePremiumGross = bpjs.ksCompany + bpjs.jkkCompany + bpjs.jkmCompany;
  const taxGrossSalary = cashGross + taxablePremiumGross;

  // PPh 21 TER calculation
  const ptkpStatus = employee.ptkp || 'TK/0';
  const terCategory = getTERCategory(ptkpStatus);
  const pph21Rate = getTERRate(terCategory, taxGrossSalary);
  const pph21Amount = Math.round(taxGrossSalary * pph21Rate);

  // Net Salary = Cash Gross - BPJS Health employee - BPJS JHT employee - BPJS JP employee - PPh 21 - Other Deductions
  const totalBpjsEmployee = bpjs.ksEmployee + bpjs.jhtEmployee + bpjs.jpEmployee;
  const netSalary = cashGross - totalBpjsEmployee - pph21Amount - deductionCooperative - deductionLoan - deductionLate - deductionAbsent;

  return {
    basic_salary: basicSalary,
    allowance_fixed: allowanceFixed,
    allowance_position: allowancePosition,
    allowance_family: allowanceFamily,
    allowance_communication: allowanceCommunication,
    allowance_variable: allowanceVariable,
    overtime_pay: overtime.totalOvertimePay,
    bonus: attendance.bonus || 0,
    insentif: attendance.insentif || 0,
    thr: attendance.thr || 0,
    gross_salary: cashGross, // This is the employee's cash gross
    taxable_gross: taxGrossSalary, // Gross for tax calculation purposes
    bpjs_ks_employee: bpjs.ksEmployee,
    bpjs_ks_company: bpjs.ksCompany,
    bpjs_tk_jht_employee: bpjs.jhtEmployee,
    bpjs_tk_jht_company: bpjs.jhtCompany,
    bpjs_tk_jp_employee: bpjs.jpEmployee,
    bpjs_tk_jp_company: bpjs.jpCompany,
    bpjs_tk_jkk_company: bpjs.jkkCompany,
    bpjs_tk_jkm_company: bpjs.jkmCompany,
    pph21_rate: pph21Rate,
    pph21_amount: pph21Amount,
    deduction_cooperative: deductionCooperative,
    deduction_loan: deductionLoan,
    deduction_late: deductionLate,
    deduction_absent: deductionAbsent,
    net_salary: netSalary
  };
}

// 8. December Annualized Recalculation
function calculateDecemberPayroll(employee, attendance, historyRecords, settings = {}) {
  // 1. Calculate December monthly values first
  const decCalc = calculateMonthlyPayroll(employee, attendance, settings);

  // 2. Sum up historical values (Jan - Nov)
  let sumGross = decCalc.taxable_gross; // Start with December taxable gross
  let sumJhtEmployee = decCalc.bpjs_tk_jht_employee;
  let sumJpEmployee = decCalc.bpjs_tk_jp_employee;
  let sumPph21Paid = 0;

  historyRecords.forEach(rec => {
    // Reconstruct gross for tax of past months
    const pastCashGross = rec.basic_salary + rec.allowance_fixed + rec.allowance_variable + 
      (rec.allowance_position || 0) + (rec.allowance_family || 0) + (rec.allowance_communication || 0) +
      rec.overtime_pay + rec.bonus + rec.insentif + rec.thr;
    const pastTaxableGross = pastCashGross + rec.bpjs_ks_company + rec.bpjs_tk_jkk_company + rec.bpjs_tk_jkm_company;
    
    sumGross += pastTaxableGross;
    sumJhtEmployee += rec.bpjs_tk_jht_employee;
    sumJpEmployee += rec.bpjs_tk_jp_employee;
    sumPph21Paid += rec.pph21_amount;
  });

  // 3. Annualized Tax Calculations
  const annualGross = sumGross;
  
  // Deductions:
  // a. Biaya Jabatan: 5% of gross, max 500k/month (6M/year)
  const biayaJabatan = Math.min(annualGross * 0.05, 6000000);
  // b. BPJS TK JHT and JP employee setahun
  const totalDeductions = biayaJabatan + sumJhtEmployee + sumJpEmployee;
  
  // Net Annual Income
  const annualNet = Math.max(annualGross - totalDeductions, 0);

  // PTKP deduction
  const ptkpLimit = PTKP_VALUES[employee.ptkp] || 54000000;
  
  // Taxable Income (PKP)
  const pkp = Math.max(annualNet - ptkpLimit, 0);

  // PPh 21 Terutang Setahun
  const annualPph21 = calculatePasal17Tax(pkp);

  // PPh 21 for December = PPh 21 Setahun - PPh 21 Paid (Jan-Nov)
  const decPph21 = annualPph21 - sumPph21Paid;

  // Recalculate December Net Salary based on the adjusted PPh 21
  const cashGross = decCalc.basic_salary + decCalc.allowance_fixed + decCalc.allowance_variable + 
    decCalc.allowance_position + decCalc.allowance_family + decCalc.allowance_communication +
    decCalc.overtime_pay + decCalc.bonus + decCalc.insentif + decCalc.thr;
  
  const totalBpjsEmployee = decCalc.bpjs_ks_employee + decCalc.bpjs_tk_jht_employee + decCalc.bpjs_tk_jp_employee;
  const decNetSalary = cashGross - totalBpjsEmployee - decPph21 - 
    decCalc.deduction_cooperative - decCalc.deduction_loan - decCalc.deduction_late - decCalc.deduction_absent;

  return {
    ...decCalc,
    pph21_rate: pkp > 0 ? Number((annualPph21 / pkp).toFixed(4)) : 0, // Reference rate
    pph21_amount: decPph21, // Overwrite with December adjusted PPh 21
    net_salary: decNetSalary,
    is_december_reconciliation: true,
    annual_gross: annualGross,
    annual_pkp: pkp,
    annual_pph21_total: annualPph21,
    pph21_paid_jan_nov: sumPph21Paid
  };
}

module.exports = {
  PTKP_VALUES,
  getTERCategory,
  getTERRate,
  calculateOvertime,
  calculateBPJS,
  calculatePasal17Tax,
  calculateMonthlyPayroll,
  calculateDecemberPayroll
};
