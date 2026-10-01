"use strict";
const test=require("node:test"), assert=require("node:assert/strict");
const {appointmentOptionsValid}=require("../src/utils/customerBilling");
test("only contracts require customer classification and recurrence",()=>{
 for(const category of ["first_time","follow_up","one_time","emergency","inspection","installation"]) {
  for(const type of ["",null,undefined,"private","business"])
   assert.equal(appointmentOptionsValid(type,category,null,null),true,category);
 }
 assert.equal(appointmentOptionsValid("","contract_service",7,3),false);
 assert.equal(appointmentOptionsValid("business","contract_service",null,null),false);
 assert.equal(appointmentOptionsValid("business","contract_service",7,null),false);
 assert.equal(appointmentOptionsValid("business","contract_service",7,3),true);
});
