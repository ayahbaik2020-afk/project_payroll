const { dbRun } = require('./database');

/**
 * Logs an event to the audit trail table.
 * Audit logs are read-only from the system interface.
 * 
 * @param {string} userId - ID of the user performing the action (e.g. 'admin', 'hr', 'finance', employee NIK)
 * @param {string} action - Description of the action (e.g., 'CREATE_EMPLOYEE', 'UPDATE_SALARY', 'APPROVE_PAYROLL')
 * @param {string|null} oldValue - Previous state/value
 * @param {string|null} newValue - New state/value
 * @param {object|null} req - Express request object to extract IP Address
 */
async function logAudit(userId, action, oldValue = null, newValue = null, req = null) {
  let ipAddress = '127.0.0.1';
  if (req) {
    // Check various headers or socket properties for IP
    ipAddress = req.headers['x-forwarded-for'] || 
                req.socket.remoteAddress || 
                req.ip || 
                '127.0.0.1';
    
    // Clean up IPv6 loopback notation
    if (ipAddress === '::1') {
      ipAddress = '127.0.0.1';
    }
  }

  try {
    await dbRun(
      `INSERT INTO audit_logs (user_id, action, ip_address, old_value, new_value, timestamp)
       VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      [
        userId,
        action,
        ipAddress,
        oldValue ? String(oldValue) : null,
        newValue ? String(newValue) : null
      ]
    );
  } catch (err) {
    console.error("Audit Logger Error:", err.message);
  }
}

module.exports = {
  logAudit
};
