"use strict";
async function requestAppointmentMaterials(api, request) {
  const capabilities = await api.commercialCapabilities();
  if (!capabilities?.success) throw Error(capabilities?.error || "Αποτυχία φόρτωσης υλικών. Δοκιμάστε ξανά.");
  const empty = {enabled:!!capabilities.enabled, materials:[], snapshotLines:[], revision:0};
  if (!empty.enabled || request.type !== "reschedule_request") return empty;
  if (!request.original_appointment_id) throw Error("Δεν βρέθηκε το αρχικό ραντεβού.");
  const result = await api.commercialAppointment(request.original_appointment_id);
  if (!result?.success || !Array.isArray(result.terms?.lines)) {
    throw Error(result?.error || "Δεν φορτώθηκαν τα υπάρχοντα υλικά. Δοκιμάστε ξανά.");
  }
  return {...empty, revision:result.revision, snapshotLines:result.terms.lines,
    materials:result.terms.lines.filter(l=>l.kind === "material").map(l=>({itemId:l.key, quantity:Number(l.quantity)})),
    appointment:result.appointment};
}
module.exports = {requestAppointmentMaterials};
