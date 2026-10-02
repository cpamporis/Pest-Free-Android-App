'use strict';
// Explicit spellings only. Never edit-distance, nearest-station selection or digit joining.
const normalize = text => String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ς/g,'σ').trim();
const aliases={σταθμοσ:['σταθμοσ','σταμοσ','σταβμοσ','σταδμοσ'],κατοψη:['κατοψη','κατωψη','κατοπσι'],καταναλωση:['καταναλωση'],κατασταση:['κατασταση'],προσβαση:['προσβαση']};
function normalizeVoiceWords(text) {
 let s=normalize(text);
 if(s.length>500)return s;
 for(const [canonical,variants] of Object.entries(aliases)) {
  for(const word of variants) {
   const pattern=Array.from(word).join('\\s*');
   s=s.replace(new RegExp('(^|[^\\p{L}\\p{N}])'+pattern+'(?=$|[^\\p{L}\\p{N}])','gu'),(_,prefix)=>prefix+canonical);
  }
 }
 return s;
}
module.exports={normalizeVoiceWords};
