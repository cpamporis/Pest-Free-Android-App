const {test}=require('node:test');const assert=require('node:assert/strict');
const {letterSimilarity,matchVoiceWord}=require('../src/voice/phoneticVoiceWords');
const {parseNumber}=require('../src/voice/parseGreekStationCommand');
const {parseStationFields}=require('../src/voice/parseStationFields');
test('80 percent ordered similarity accepts user example',()=>{
 assert.ok(letterSimilarity('τεσρα','τεσσερα')>=0.8);
 for(const word of ['τεσρα','τέσρα','τεσσερα'])assert.equal(parseNumber(word),4);
 assert.equal(parseNumber('πεντα'),5);
 assert.equal(parseStationFields('Αριθμός τέσρα κατανάλωση πενήντα').stationNumber,4);
 assert.equal(parseNumber('δεκατρ'),null); // Below threshold.
});
test('condition punctuation and protected negation',()=>{
 assert.equal(parseStationFields('Σταθμός τέσσερα, κατάσταση κατεστραμένο !').condition,'Damaged');
 assert.equal(parseStationFields('Σταθμός τέσρα κατάσταση κατεστραμένο !').condition,'Damaged');
 for(const value of ['όχι κατεστραμενο','δεν λείπει','μη κατεστραμμένο'])assert.equal(parseStationFields('σταθμός 4 κατάσταση '+value).ok,false);
 assert.equal(parseStationFields('σταθμός 4 πρόσβαση προσβάσιμο').access,'Yes');
 assert.equal(parseStationFields('σταθμός 4 πρόσβαση μη προσβάσιμο').ok,false);
 for(const value of ['να','οχ','νι'])assert.equal(parseStationFields('σταθμός 4 πρόσβαση '+value).ok,false);
});
test('ambiguous matches and numbers remain rejected',()=>{
 assert.equal(matchVoiceWord('σταδμος',[{word:'σταθμος',value:'a'},{word:'σταφμος',value:'b'}]),null);
 for(const value of ['X','5 0','-4','2.5','δύο ή πέντε'])assert.equal(parseNumber(value),null);
 const config=require('../src/voice/fieldVoiceConfig');assert.ok(config.stopPhrases.includes('Ακείρο'));assert.ok(config.stopPhrases.length<=8);
});
