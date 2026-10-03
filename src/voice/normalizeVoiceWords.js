'use strict';
// Explicit aliases plus bounded phonetic matching of command keywords only.
const normalize = text => String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ς/g,'σ').trim();
const aliases={σταθμοσ:['σταθμοσ','σταμοσ','σταβμοσ','σταδμοσ','σταφμοσ','σταφμοζ','σταθμουσ'],κατοψη:['κατοψη','κατωψη','κατοπσι'],καταναλωση:['καταναλωση','κατλωση','καλωσι'],κατασταση:['κατασταση'],προσβαση:['προσβαση']};
function normalizeVoiceWords(text) {
 let s=normalize(text);
 if(s.length>500)return s;
 // Exact observed joined token, not a general fuzzy station/number guess.
 s=s.replace(/(^|[^\p{L}\p{N}])σταφμοζεξι(?=$|[^\p{L}\p{N}])/gu,'$1σταθμοσ εξι');
 for(const [canonical,variants] of Object.entries(aliases)) {
  for(const word of variants) {
   const pattern=Array.from(word).join('\\s*');
   s=s.replace(new RegExp('(^|[^\\p{L}\\p{N}])'+pattern+'(?=$|[^\\p{L}\\p{N}])','gu'),(_,prefix)=>prefix+canonical);
  }
 }
 const choices=Object.keys(aliases).map(word=>({word,value:word}));
 s=s.replace(/\p{L}+/gu,word=>require('./phoneticVoiceWords').matchVoiceWord(word,choices)||word);
 return s;
}
module.exports={normalizeVoiceWords};
