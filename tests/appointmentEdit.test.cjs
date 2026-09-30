const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {recurrencePatch,editOptionsValid}=require('../src/utils/appointmentEdit');
test('price-only edits of standalone and legacy visits require no customer type or recurrence',()=>{
 for(const category of ['first_time','contract_service']){
 const original={appointmentCategory:category,recurrenceDays:null,recurrenceTotalVisits:null};
 assert.equal(editOptionsValid(original,'',category,null,null),true);assert.deepEqual(recurrencePatch(original,category,null,null),{});
 }
});
test('an existing contract preserves frequency/count without rescheduling the series',()=>{
 const original={appointment_category:'contract_service',recurrence_days:'30',recurrence_total_visits:'8'};
 assert.equal(editOptionsValid(original,'','contract_service',30,8),true);assert.deepEqual(recurrencePatch(original,'contract_service',30,8),{});
 assert.equal(editOptionsValid(original,'','contract_service',14,8),false);
});
test('new recurrence still requires valid customer classification and count',()=>{
 assert.equal(editOptionsValid({appointmentCategory:'first_time'},'business','contract_service',30,null),false);
 assert.deepEqual(recurrencePatch({appointmentCategory:'first_time'},'contract_service',30,6),{appointmentCategory:'contract_service',recurrenceDays:30,totalVisits:6});
});
test('normalization retains appointment details needed by the edit form',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/services/normalizeAppointment.js'),'utf8').replace('export function','function');
 const normalize=vm.runInNewContext(source+';normalizeAppointment');const result=normalize({id:'a',insecticide_details:'Kitchen',disinfection_details:'Storage',compliance_valid_until:'2027-01-01',special_service_subtype:'other',other_pest_name:'Pest',recurrence_days:30,recurrence_total_visits:8});
 assert.equal(result.insecticideDetails,'Kitchen');assert.equal(result.disinfectionDetails,'Storage');assert.equal(result.complianceValidUntil,'2027-01-01');assert.equal(result.recurrenceTotalVisits,8);
});
