//normalizeAppointment.js
export function normalizeAppointment(a) {
  let dateValue = a.appointment_date || a.date;
  let formattedDate = '';

  if (dateValue) {
    try {
      const d = new Date(dateValue);
      if (!isNaN(d.getTime())) {
        formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    } catch {}
  }

  return {
    id: a.id,

    // 🔥 CRITICAL FIX
    technicianId:
      a.technician_id ??
      a.technicianId ??
      a.technician?.id ??
      null,

    technician_username:
      a.technician_username ??
      a.technician?.username ??
      null,

    customerId:
      a.customer_id ??
      a.customerId ??
      null,

    legacyCustomerKey:
      a.legacy_customer_key ??
      a.legacyCustomerKey ??
      null,

    appointmentCategory:
      a.appointment_category ??
      a.appointmentCategory ??
      null,

    date: formattedDate,
    time: a.appointment_time || a.time,
    serviceType: a.service_type || a.serviceType,
    status: a.status || "scheduled",

    specialServiceSubtype:
      a.special_service_subtype ?? null,

    otherPestName:
      a.other_pest_name ?? null,

    visitId:
      a.visit_id ?? null
  };
}
