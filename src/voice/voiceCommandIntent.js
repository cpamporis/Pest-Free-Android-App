'use strict';
const {normalizeVoiceWords}=require('./normalizeVoiceWords');
// Unrelated decoder output is not a malformed field command. Never persist this text.
function hasCommandIntent(text) {
 const value=normalizeVoiceWords(text);
 return /(^|[^\p{L}\p{N}])(?:σταθμοσ|κατοψη|καταναλωση|κατασταση|προσβαση)(?=$|[^\p{L}\p{N}])/u.test(value);
}
module.exports={hasCommandIntent};
