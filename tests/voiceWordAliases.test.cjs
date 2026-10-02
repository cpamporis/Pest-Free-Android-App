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
