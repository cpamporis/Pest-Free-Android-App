'use strict';
// Command vocabulary only. Never call this matcher for numbers or free text.
function phoneticKey(text) {
 return String(text || '').toLowerCase().normalize('NFC')
  .replace(/ΐ|ϊ/g,'J').replace(/ΰ|ϋ/g,'Y')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ς/g,'σ')
  .replace(/ου/g,'U').replace(/οι|ει|υι/g,'ι').replace(/η|υ/g,'ι')
  .replace(/ν/g,'μ').replace(/ω/g,'ο').replace(/ψ/g,'πσ').replace(/ξ/g,'κσ')
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
// Ordered edit similarity; denominator includes extra letters as well as missing ones.
function letterSimilarity(input,target) {
 const a=phoneticKey(input),b=phoneticKey(target);
 if(!a || !b || a.length>60 || b.length>60 || !/^[\p{L}]+$/u.test(a+b))return 0;
 let row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const next=[i];
  for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));
  row=next;
 }
 return 1-row[b.length]/Math.max(a.length,b.length);
}
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
 const words=String(input||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().split(/\s+/);
 if(words.length>1 && words.some(w=>['δεν','οχι','μη','μην'].includes(w)))return null;
 const hits=choices.map(({word,value})=>{
  const existing=scoreWord(input,word),similarity=letterSimilarity(input,word);
  // Exact normalized spelling wins; older syllable rules remain supported.
  const score=existing===0?0:similarity>=0.8-1e-10?1-similarity:existing!==null?1+existing:null;
  return {value,score};
 }).filter(x=>x.score!==null);
 if(!hits.length)return null;
 const best=Math.min(...hits.map(x=>x.score));
 const values=[...new Set(hits.filter(x=>Math.abs(x.score-best)<1e-10).map(x=>x.value))];
 return values.length===1?values[0]:null;
}
module.exports={phoneticKey,syllables,scoreWord,letterSimilarity,matchVoiceWord};
