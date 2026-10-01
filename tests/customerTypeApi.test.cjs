const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the actual API adapter without loading device-specific auth storage.
const source = fs.readFileSync(path.join(__dirname, '../src/services/apiService.js'), 'utf8');
const method = source.match(/async getCustomers\(\) \{([\s\S]*?)\n\s*\},\s*\n\s*async getCustomerById/);
assert.ok(method, 'Customer API adapter is available');
function getCustomers(response) {
  return vm.runInNewContext('(async () => {' + method[1] + '\n})', {
    request: async () => response, console: {error(){}},
    getCustomerAmaNumbers: customer => customer.amaNumbers || []
  })();
}
test('customer categories survive API normalization for scheduling and certification', async () => {
  const rows = await getCustomers({success:true,data:[
    {id:'private-id',name:'Private',customerType:'private',amaNumbers:['123']},
    {id:'business-id',name:'Business',customer_type:'business'},
    {id:'old-id',name:'Unclassified'}
  ]});
  assert.deepEqual(JSON.parse(JSON.stringify(rows.map(c => [c.customerId,c.customerType]))),
    [['private-id','private'],['business-id','business'],['old-id',null]]);
  assert.equal(rows[0].ama,'123');
  assert.equal(rows[1].ama,'');
});
test('an API error cannot be mistaken for a customer list', async () => {
  assert.equal((await getCustomers({success:false,error:'Unauthorized'})).length,0);
});
