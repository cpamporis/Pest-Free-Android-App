const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
test("schedule has no customer classification selector or payload override",()=>{
 const screen=fs.readFileSync(path.join(__dirname,"../src/screens/Admin/AdminTechSchedule.js"),"utf8");
 const fields=fs.readFileSync(path.join(__dirname,"../src/components/AppointmentBusinessFields.js"),"utf8");
 assert.doesNotMatch(fields,/business.customerType|onCustomerTypeChange/);
 assert.match(fields,/if \(category !== "contract_service"\) return null/);
 assert.doesNotMatch(screen,/customerType: customerType|customerType:editCustomerType|onCustomerTypeChange=/);
 assert.match(screen,/setCustomerType\(selected\?\.customerType/);
});
