'use strict';
// Command vocabulary only. Never call this matcher for numbers or free text.
function phoneticKey(text) {
 return String(text || '').toLowerCase().normalize('NFC')
  .replace(/ΐ|ϊ/g,'J').replace(/ΰ|ϋ/g,'Y')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ς/g,'σ')
  .replace(/ου/g,'U').replace(/οι|ει|υι/g,'ι').replace(/η|υ/g,'ι')
  .replace(/ω/g,'ο').replace(/ψ/g,'πσ').replace(/ξ/g,'κσ')
  .replace(/([βγδζθκλμνπρστφχ])\1+/g,'$1').replace(/\s+/g,'');
}
// Vowel-nucleus groups, not a general-purpose Greek linguistic syllabifier.
function syllables(key) {
 const parts=key.match(/[^αεοιUJY]*[αεοιUJY]+/g) || [];
 if (!parts.length) return [];
 const consumed=parts.join('').length;
 parts[parts.length-1]+=key.slice(consumed);
 return parts;
}
function confusionKey(s) {return s.replace(/[πβ][σζ]/g,'ΠΣ').replace(/[θφβδ]/g,'Θ');}
function scoreWord(input, target) {
 const a=phoneticKey(input),b=phoneticKey(target);
 if (!a || a.length>60 || !/^[\p{L}]+$/u.test(a)) return null;
 if(a===b)return 0;
 const x=syllables(a),y=syllables(b);
 if(y.length<2 || x.length>y.length || x.length<Math.max(2,y.length-1))return null;
 let best=null;
 const omissions=x.length===y.length?[ -1 ]:y.map((_,i)=>i);
 for(const skip of omissions){
  const expected=y.filter((_,i)=>i!==skip);
  let substitutions=0,valid=true;
  for(let i=0;i<x.length;i++){
   if(x[i]===expected[i])continue;
   if(confusionKey(x[i])!==confusionKey(expected[i])){valid=false;break;}
   substitutions++;
  }
  // At most one confused syllable; never combine it with a missing syllable.
  if(valid && substitutions<=1 && !(skip>=0 && substitutions)){
   const score=(skip>=0?2:0)+substitutions;
   if(best===null || score<best)best=score;
  }
 }
 return best;
}
function matchVoiceWord(input, choices) {
 const hits=choices.map(({word,value})=>({value,score:scoreWord(input,word)})).filter(x=>x.score!==null);
 if(!hits.length)return null;
 const best=Math.min(...hits.map(x=>x.score));
 const values=[...new Set(hits.filter(x=>x.score===best).map(x=>x.value))];
 return values.length===1?values[0]:null;
}
module.exports={phoneticKey,syllables,scoreWord,matchVoiceWord};
