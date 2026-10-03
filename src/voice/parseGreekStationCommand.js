"use strict";
const normalize = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ς/g, "σ").trim();
const units = { μηδεν:0, ενα:1, εναν:1, ενασ:1, μια:1, δυο:2, τρια:3, τρεισ:3, τεσσερα:4, τεσσερισ:4, πεντε:5, εξι:6, επτα:7, εφτα:7, οκτω:8, οχτω:8, εννεα:9, εννια:9,
  δεκα:10, εντεκα:11, δωδεκα:12, δεκατρια:13, δεκατεσσερα:14, δεκαπεντε:15, δεκαεξι:16, δεκαεπτα:17, δεκαοκτω:18, δεκαεννεα:19 };
const tens = { εικοσι:20, τριαντα:30, σαραντα:40, πενηντα:50, εξηντα:60, εβδομηντα:70, ογδοντα:80, ενενηντα:90 };
const hundreds = { εκατο:100, εκατον:100, διακοσια:200, τριακοσια:300, τετρακοσια:400, πεντακοσια:500, εξακοσια:600, επτακοσια:700, οκτακοσια:800, εννιακοσια:900 };
function strictNumber(text) {
  if (/^\d{1,3}$/.test(text)) return Number(text);
  const words = text.split(/\s+/);
  if (words.some(w => /\d/.test(w))) return null;
  let value = 0;
  if (hundreds[words[0]]) value += hundreds[words.shift()];
  if (words.length === 0) return value || null;
  if (words.length === 1 && Object.hasOwn(units, words[0])) return value + units[words[0]];
  if (tens[words[0]]) {
    value += tens[words.shift()];
    if (!words.length) return value;
    if (words.length === 1 && Object.hasOwn(units, words[0]) && units[words[0]] > 0 && units[words[0]] < 10) return value + units[words[0]];
    return null;
  }
  if (words.length === 1) {
    for (const [stem, ten] of Object.entries(tens)) {
      if (words[0].startsWith(stem)) {
        const tail = words[0].slice(stem.length);
        if (Object.hasOwn(units, tail) && units[tail] > 0 && units[tail] < 10) return value + ten + units[tail];
      }
    }
  }
  return null;
}
// Build an exact spelling lookup from the existing accepted Greek number grammar.
const spellings=new Map();
function remember(words) {
 const value=strictNumber(words),key=words.replace(/\s+/g,'');
 if(value===null)return;
 if(spellings.has(key)&&spellings.get(key)!==value)spellings.set(key,null);else if(!spellings.has(key))spellings.set(key,value);
}
const tails=[...Object.keys(units),...Object.keys(tens)];
for(const ten of Object.keys(tens))for(const [unit,value] of Object.entries(units))if(value>0&&value<10)tails.push(ten+' '+unit);
for(const tail of tails)remember(tail);
for(const hundred of Object.keys(hundreds)){remember(hundred);for(const tail of tails)remember(hundred+' '+tail);}
function number(text) {
 const value=normalize(text);
 if(value.length>180)return null;
 const direct=strictNumber(value);if(direct!==null)return direct;
 if(!/^[\p{L}\s]+$/u.test(value))return null;
 const compact=value.replace(/\s+/g,'').replace(/^(?:ηκοσυ|ηκωσι)/u,'εικοσι').replace(/^αινα$/u,'ενα').replace(/^εξ$/u,'εξι');
 if(spellings.has(compact))return spellings.get(compact);
 // Only one distinct numeric value may meet 80%; never choose the nearest number.
 const {letterSimilarity}=require('./phoneticVoiceWords');
 const vocabulary={...units,...tens,...hundreds};
 const corrected=[];
 for(const word of value.split(/\s+/)){
  if(Object.hasOwn(vocabulary,word)){corrected.push(word);continue;}
  const candidates=Object.entries(vocabulary).filter(([spelling])=>letterSimilarity(word,spelling)>=0.8-1e-10);
  if(new Set(candidates.map(([,number])=>number)).size!==1)return null;
  corrected.push(candidates[0][0]);
 }
 return strictNumber(corrected.join(' '));
}
function parseGreekStationCommand(text) {
  const s = require('./normalizeVoiceWords').normalizeVoiceWords(text);
  if (!s) return { ok:false, code:"EMPTY_TRANSCRIPT" };
  if (s.length > 180) return { ok:false, code:"INVALID_COMMAND" };
  // Allow punctuation at command boundaries, never strip it from numbers:
  // "10. Κατανάλωση: 25%." is valid, "10.5" / "-25" remain invalid.
  const match = /^(?:δολωματικοσ\s+)?σταθμοσ(?:\s*[,;:··]\s*|\s+)(.+?)(?:\s*[,;:.··—–-]\s*|\s+)καταναλωση(?:\s*[,;:··]\s*|\s+)(.+?)\s*[.!;]?$/u.exec(s);
  if (!match) return { ok:false, code:"INVALID_COMMAND" };
  const station = number(match[1].trim());
  const consumption = number(match[2].replace(/\s*(?:%|τοισ εκατο)$/, "").trim());
  if (!Number.isInteger(station) || station < 1 || station > 999)
    return { ok:false, code:"INVALID_STATION" };
  if (!Number.isInteger(consumption) || consumption < 0 || consumption > 100)
    return { ok:false, code:"INVALID_CONSUMPTION" };
  return { ok:true, stationNumber:station, consumption };
}
module.exports = { parseGreekStationCommand, parseNumber:number };
