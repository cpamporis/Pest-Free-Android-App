const test = require("node:test");
const assert = require("node:assert/strict");
const {parseAmountCents, formatCents, appointmentOptionsValid, RECURRENCE_DAYS} = require("../src/utils/customerBilling");
test("currency input uses whole cents and accepts the Greek decimal separator", () => {
  for (const [input,expected] of [["100,24",10024],["0.01",1],[" 20,5 ",2050],["9999999.99",999999999]]) assert.equal(parseAmountCents(input),expected);
  for (const value of ["", "0", "-3", "1,234", "1.234,00", "1e2", "Infinity", "10000000", "1.2.3"]) assert.equal(parseAmountCents(value),null,value);
  assert.equal(formatCents(12345),"123.45");
});
test("customer type and explicit contract frequency are required", () => {
  assert.equal(appointmentOptionsValid("", "contract_service", 7),false);
  assert.equal(appointmentOptionsValid("business", "contract_service", null),false);
  assert.equal(appointmentOptionsValid("private", "contract_service", 31),false);
  for (const days of RECURRENCE_DAYS) assert.equal(appointmentOptionsValid("business", "contract_service", days),true);
  assert.equal(appointmentOptionsValid("private", "one_time", null),true);
});
