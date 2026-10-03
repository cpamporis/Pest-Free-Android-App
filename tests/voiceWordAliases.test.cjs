const {test}=require('node:test');const assert=require('node:assert/strict');
const {parseNumber,parseGreekStationCommand}=require('../src/voice/parseGreekStationCommand');
const {parseStationFields}=require('../src/voice/parseStationFields');
const {normalizeVoiceWords}=require('../src/voice/normalizeVoiceWords');
test('split spellings represent the same exact integer',()=>{
 for(const phrase of ['πέντε','πε ντε','πεν τε','π έ ν τ ε'])assert.equal(parseNumber(phrase),5);
 for(const phrase of ['ηκοσυ','ηκωσι','εικοσι','ει κο σι'])assert.equal(parseNumber(phrase),20);
 for(const phrase of ['ε να','αινα','αι να','ενά'])assert.equal(parseNumber(phrase),1);
 assert.equal(parseNumber('ει κο σι πε ντε'),25);
 assert.equal(parseNumber('ε κα τον ει κο σι πε ντε'),125);
});
test('no digit concatenation, closest number or unsolicited substitutions',()=>{
 for(const phrase of ['5 0','2 5','πεντα','βιω','2.5','-5','δύο ή πέντε','πέντε 0'])assert.equal(parseNumber(phrase),null,phrase);
 assert.equal(parseNumber('50'),50);assert.equal(parseNumber('πενήντα'),50);
});
test('command variants and split numbers pass through actual station parser',()=>{
 for(const word of ['σταθμος','σταμος','σταβμος','στα μος','σταδμος'])assert.deepEqual(parseGreekStationCommand(`${word} πε ντε καταναλωση ηκωσι πεν τε`),{ok:true,stationNumber:5,consumption:25});
 assert.equal(parseStationFields('στα μος πε ντε προσ βα ση όχι').access,'No');
 assert.equal(parseStationFields('σταθμός πε ντε κα τα στα ση λείπει').condition,'Missing');
 for(const phrase of ['κατωψη','κατ οπσι','κάτοψη'])assert.equal(normalizeVoiceWords(phrase+' πε ντε'),'κατοψη πε ντε');
 assert.equal(parseStationFields('σταθμός 5 0 κατανάλωση 25').ok,false);
});
test('reported A71 comma-separated condition and joined station transcript',()=>{
 const result=parseStationFields('Σταθμος, εξι, Κατασταση, Κατεστραμμενο');
 assert.equal(result.ok,true);assert.equal(result.stationNumber,6);assert.equal(result.condition,'Damaged');assert.equal(result.terminal,true);assert.equal(result.consumption,null);
 assert.equal(parseStationFields('Σταθμός, εξ, κατάσταση, λείπει').condition,'Missing');
 assert.equal(parseStationFields('Σταθμός, έξι, πρόσβαση, όχι').access,'No');
 for(const keyword of ['κατλωση','καλωσι']){
  const r=parseStationFields(`σταφμοζεξι, ${keyword}, ει κο σι πε ντε`);
  assert.equal(r.ok,true);assert.equal(r.stationNumber,6);assert.equal(r.consumption,'25%');
 }
});
test('separator tolerance never turns decimal, signed or ambiguous station into another integer',()=>{
 for(const text of ['Σταθμός, 2,5, κατάσταση, λείπει','Σταθμός, -6, κατάσταση, λείπει','Σταθμός X κατάσταση λείπει','Σταθμός χ κατάσταση λείπει','Σταθμός, έξι, κατανάλωση, 2,5','Σταθμός, έξι, κατανάλωση, -25'])assert.equal(parseStationFields(text).ok,false,text);
});
test('reported missing/damaged spellings preserve station six and terminal form behavior',()=>{
 const cases=[['σταθμος εξι κατασταση λιπι','Missing'],['σταθμους εξι κατασταση κατεστραμενο','Damaged'],['σταθμος, εξι, κατασταση, κατεστραμενο','Damaged']];
 for(const [text,condition] of cases){const r=parseStationFields(text);assert.equal(r.ok,true,text);assert.equal(r.stationNumber,6);assert.equal(r.condition,condition);assert.equal(r.terminal,true);assert.equal(r.consumption,null);}
 assert.equal(parseStationFields('σταθμός 6 κατάσταση δεν λείπει').ok,false);
 assert.equal(parseStationFields('σταθμός 6 κατάσταση όχι κατεστραμενο').ok,false);
 assert.equal(parseStationFields('σταθμός 6 κατάσταση κατε στρα με νο').condition,'Damaged');
});
test('exact damaged utterance with exclamation is accepted',()=>{
 const r=parseStationFields('Σταθμός έξι κατάσταση κατεστραμένο!');
 assert.equal(r.ok,true);assert.equal(r.stationNumber,6);assert.equal(r.condition,'Damaged');assert.equal(r.terminal,true);
});
