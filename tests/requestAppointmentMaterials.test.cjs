const test=require('node:test'),assert=require('node:assert/strict');
const {requestAppointmentMaterials:load}=require('../src/utils/requestAppointmentMaterials');
test('new request starts without materials; disabled feature does not fetch terms',async()=>{
 const api={commercialCapabilities:async()=>({success:true,enabled:true}),commercialAppointment:()=>{throw Error('unexpected read');}};
 assert.deepEqual((await load(api,{type:'service_request'})).materials,[]);
 api.commercialCapabilities=async()=>({success:true,enabled:false});assert.equal((await load(api,{type:'reschedule_request'})).enabled,false);
});
test('rescheduling preloads quantities and original price snapshots',async()=>{
 const lines=[{kind:'material',key:'item',quantity:'3',unitNetCents:1300,vatBasisPoints:1300}];
 const result=await load({commercialCapabilities:async()=>({success:true,enabled:true}),commercialAppointment:async id=>{assert.equal(id,'old');return {success:true,revision:4,terms:{lines},appointment:{service_net_price:'100'}};}},{type:'reschedule_request',original_appointment_id:'old'});
 assert.deepEqual(result.materials,[{itemId:'item',quantity:3}]);assert.deepEqual(result.snapshotLines,lines);assert.equal(result.revision,4);
});
test('loading failures cannot silently turn existing materials into an empty selection',async()=>{
 const api={commercialCapabilities:async()=>({success:true,enabled:true}),commercialAppointment:async()=>({success:false,error:'LOAD_FAILED'})};
 await assert.rejects(()=>load(api,{type:'reschedule_request',original_appointment_id:'old'}),/LOAD_FAILED/);
 api.commercialCapabilities=async()=>({success:false,error:'CAPABILITIES_FAILED'});await assert.rejects(()=>load(api,{}),/CAPABILITIES_FAILED/);
});
