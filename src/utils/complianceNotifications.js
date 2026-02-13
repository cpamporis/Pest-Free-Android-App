// utils/complianceNotifications.js

function parseComplianceDate(value) {
  if (!value) return null;

  // If Postgres DATE comes as "YYYY-MM-DD", parse as UTC date (no timezone drift)
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function buildComplianceNotifications(customers) {
  // Normalize "today" to UTC midnight
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const expiring = [];
  const expired = [];

  customers.forEach(customer => {
    if (!customer?.complianceValidUntil) return;

    const expiry = parseComplianceDate(customer.complianceValidUntil);
    if (!expiry) return;

    // Normalize expiry to UTC midnight
    const expiryUTC = new Date(Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate()));

    const diffDays = Math.floor((expiryUTC - todayUTC) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 7) {
      expiring.push({
        customerId: customer.customerId,
        customerName: customer.customerName,
        validUntil: expiryUTC,
        daysRemaining: diffDays
      });
    } else if (diffDays < 0) {
      expired.push({
        customerId: customer.customerId,
        customerName: customer.customerName,
        expiredOn: expiryUTC
      });
    }
  });

  return { expiring, expired };
}
