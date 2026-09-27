const RECURRENCE_DAYS = [7, 14, 30, 90, 180, 365];
function parseAmountCents(value) {
  const input = String(value ?? "").trim().replace(",", ".");
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(input)) return null;
  const [whole, fraction = ""] = input.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return result > 0 && result <= 999999999 ? result : null;
}
function formatCents(value) {
  return Number.isSafeInteger(Number(value)) ? (Number(value) / 100).toFixed(2) : "—";
}
function newPaymentReference() {
  return `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}
function appointmentOptionsValid(type, category, days) {
  return ["private", "business"].includes(type) &&
    (category !== "contract_service" || RECURRENCE_DAYS.includes(Number(days)));
}
module.exports = { RECURRENCE_DAYS, parseAmountCents, formatCents, newPaymentReference, appointmentOptionsValid };
