'use strict';
const {normalizeVoiceWords}=require('./normalizeVoiceWords');
const {letterSimilarity}=require('./phoneticVoiceWords');
const policy=require('./voiceCommandPolicy');
// Text relevance AFTER local speech decoding. Never a pre-decoding acoustic keyword spotter.
function hasCommandIntent(text){
 const words=normalizeVoiceWords(text).match(/\p{L}+/gu)||[];
 return words.some(word=>policy.keywords.some(key=>letterSimilarity(word,key)>policy.relevanceThreshold));
}
module.exports={hasCommandIntent};
