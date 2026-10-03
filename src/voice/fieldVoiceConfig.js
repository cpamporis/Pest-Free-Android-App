'use strict';
// Applied only before starting a native field session. Edit here, then reload Metro.
// Native validates all fields atomically. No build needed for values within these ranges.
module.exports = Object.freeze({
  wakePhrases: Object.freeze(['Αλέρτ', 'Αλήρτ', 'Αλίρτ', 'Αλύρτ', 'Αλείρτ', 'Αλοίρτ', 'Alert', 'Αλέρθ']), // 1–8 phrases, 1–80 characters
  stopPhrases: Object.freeze(['Άκυρο', 'Ακύρω', 'Άκιρο', 'Ακίρω', 'Άκηρο', 'Ακήρω', 'Άκοιρο', 'Ακείρο']), // 1–8 complete phrases; stops even in wake waiting
  readyMessage: 'Έτοιμος', // 1–160 characters
  idleSeconds: 60, // 15–300
  silenceSeconds: 0.9, // 0.7–3
  captureSeconds: 10, // 5–45
});
