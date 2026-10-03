const {test}=require('node:test');
const assert=require('node:assert/strict');
const {scoreWord,matchVoiceWord}=require('../src/voice/phoneticVoiceWords');
const {parseStationFields}=require('../src/voice/parseStationFields');
const {normalizeVoiceWords}=require('../src/voice/normalizeVoiceWords');
test('orthography and specified consonant confusions',()=>{
 for(const word of ['στάθμος','σταθμώς','σταδμός','σταβμός','σταφμός'])assert.notEqual(scoreWord(word,'σταθμός'),null,word);
 for(const word of ['κάτοψη','κατόψη','κατοψή','κατοπσι','κατοβσι','κατοβζι','κατοπζι'])assert.notEqual(scoreWord(word,'κάτοψη'),null,word);
 assert.equal(scoreWord('κατεστραμένο','κατεστραμμένο'),0);
 assert.equal(scoreWord('λίπι','λείπει'),0);
});
test('ordered syllable thresholds and constrained substitutions',()=>{
 assert.equal(scoreWord('στα','σταθμός'),null);
 assert.notEqual(scoreWord('καψη','κάτοψη'),null);
 assert.notEqual(scoreWord('κατασι','κατάσταση'),null);
 assert.equal(scoreWord('κατα','κατάσταση'),null);
 assert.equal(scoreWord('ψηκατο','κάτοψη'),null);
 assert.equal(scoreWord('καβζι','κάτοψη'),null);
 assert.equal(matchVoiceWord('σταδμος',[{word:'σταθμός',value:'a'},{word:'σταφμός',value:'b'}]),null);
});
test('actual commands use matcher but retain numbers and negation',()=>{
 assert.equal(parseStationFields('σταδμωσ έξι κατάσταση κατεστραμενω').condition,'Damaged');
 assert.equal(parseStationFields('σταθμός έξι κατάσταση καμενο').ok,false);
 assert.equal(parseStationFields('σταθμός έξι κατάσταση κατεστρανο').condition,'Damaged');
 assert.equal(normalizeVoiceWords('κατοβζι 2'),'κατοψη 2');
 for(const text of ['σταθμός 6 κατάσταση δεν λείπει','σταθμός 6 κατάσταση όχι κατεστραμμένο','σταθμός 6 κατάσταση μάλλον λείπει','σταθμός X κατανάλωση 25','σταθμός 6 πρόσβαση ίσως'])assert.equal(parseStationFields(text).ok,false,text);
});
