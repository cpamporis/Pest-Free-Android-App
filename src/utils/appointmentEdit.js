const {appointmentOptionsValid} = require('./customerBilling');
const value = v => v == null || v === '' ? null : Number(v);
function recurrencePatch(original, category, days, visits) {
 const oldCategory=original.appointmentCategory ?? original.appointment_category ?? 'first_time';
 const oldDays=value(original.recurrenceDays ?? original.recurrence_days);
 const oldVisits=value(original.recurrenceTotalVisits ?? original.recurrence_total_visits);
 if(category===oldCategory && (category!=='contract_service' || (value(days)===oldDays && value(visits)===oldVisits))) return {};
 if(category!=='contract_service') return {appointmentCategory:category,...(oldDays!==null?{recurrenceDays:null,totalVisits:null}:{})};
 return {appointmentCategory:category,recurrenceDays:value(days),totalVisits:value(visits)};
}
function editOptionsValid(original,type,category,days,visits) {
 const patch=recurrencePatch(original,category,days,visits);
 return !Object.keys(patch).length || category!=='contract_service' || appointmentOptionsValid(type,category,days,visits);
}
module.exports={recurrencePatch,editOptionsValid};
