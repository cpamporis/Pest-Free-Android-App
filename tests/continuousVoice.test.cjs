const {test}=require('node:test');const assert=require('node:assert/strict');
const {hasCommandIntent}=require('../src/voice/voiceCommandIntent');
const {parseNumber}=require('../src/voice/parseGreekStationCommand');
test('relevance gate keeps malformed field commands audible but ignores unrelated output',()=>{
 for(const s of ['σταθμός άγνωστο','κάτοψη δέκα','σταθμός 4 κατάσταση κάτι','κατανάλωση λάθος','αλέρτ'])assert.equal(hasCommandIntent(s),true,s);
 for(const s of ['', '...', 'Ευχαριστώ', 'Υπότιτλοι', 'Μουσική'])assert.equal(hasCommandIntent(s),false,s);
 assert.equal(parseNumber('X'),null);assert.equal(parseNumber('τέσρα'),4);
});
