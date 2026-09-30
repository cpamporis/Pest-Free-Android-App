const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const source=read('src/services/apiService.js');
test('technician request upload uses the platform transport and active token',async()=>{
 const method=source.match(/async commercialSendRequest\(id, form\) \{([\s\S]*?)\n  \},/);assert.ok(method);
 const calls=[];const transport=async(...args)=>{calls.push(args);return {ok:true,json:async()=>({success:true,id:'request'})};};
 const normalized={normalized:true},form={image:'local'};const fn=vm.runInNewContext('(async(id,form)=>{'+method[1]+'})',{authStorageReady:Promise.resolve(),authToken:'session-token',API_BASE_URL:'https://api.test/api',fetch:transport,expoFetch:transport,normalizeNativeMultipartBody:()=>normalized});
 assert.equal((await fn('appointment / 1',form)).success,true);assert.equal(calls.length,1);const [url,options]=calls[0];assert.equal(url,'https://api.test/api/chargeable-materials/appointments/appointment%20%2F%201/requests');assert.equal(options.headers.Authorization,'Bearer session-token');assert.equal(options.body,source.includes('Pestify Web')?form:normalized);assert.equal(options.headers['Content-Type'],undefined);
});
test('service headers expose requests, and requests precede customer items',()=>{
 for(const name of ['MyocideScreen','CertificationServiceScreen','DisinfectionScreen','InsecticideScreen','SpecialServicesScreen'])assert.match(read('src/screens/Technician/'+name+'.js'),/<CommercialServicePanel appointmentId=\{session\?\.appointmentId\}/);
 const requests=read('src/screens/Admin/CustomerRequestScreen.js');assert.match(requests,/<TechnicianRequestsPanel/);assert.match(requests,/onOpenImages=\{openImageViewer\}/);
});
test('reports include commercial lines, business notes and areas',()=>{
 const report=read('src/screens/Technician/ReportScreen.js');for(const word of ['chargeableMaterials','businessNotes','treatedAreas'])assert.ok(report.includes(word),word);
});
