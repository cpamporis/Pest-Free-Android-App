import React, { useEffect, useRef, useState } from 'react';
import { AppState, NativeEventEmitter, NativeModules, PermissionsAndroid, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
const { parseStationFields } = require('./parseStationFields');
const native = NativeModules.PestifyWhisperProbe;
const messages = {
  preparing: 'Προετοιμασία του τοπικού μοντέλου… Περιμένετε πριν μιλήσετε.',
  recording: 'Ακούω για έως 8 δευτερόλεπτα. Πείτε μία εντολή.',
  processing: 'Αναγνώριση μέσα στο κινητό… Το μικρόφωνο έχει κλείσει.',
};
const failures = {
  NO_SPEECH: 'Δεν καταγράφηκε αρκετός ήχος. Μιλήστε αφού εμφανιστεί «Ακούω».',
  BACKGROUND: 'Η δοκιμή σταμάτησε επειδή η εφαρμογή πέρασε στο παρασκήνιο.',
  AUDIO_INTERRUPTED: 'Διακόπηκε ο ήχος. Δοκιμάστε ξανά.',
  TIMEOUT: 'Η επεξεργασία ξεπέρασε το χρονικό όριο στη συσκευή.',
  BUSY: 'Η προηγούμενη δοκιμή σταματά ακόμη. Περιμένετε λίγο και επαναλάβετε.',
  CANCELLED: 'Η δοκιμή ακυρώθηκε.',
};
export default function WhisperProbeCard({ visible, disabled, onBusy }) {
  const [phase, setPhase] = useState('idle');
  const [status, setStatus] = useState('Το μοντέλο περιλαμβάνεται στην εφαρμογή. Η δοκιμή λειτουργεί χωρίς Internet.');
  const [result, setResult] = useState(null);
  const active = useRef(null), alive = useRef(true), busyCallback = useRef(onBusy);
  busyCallback.current = onBusy;
  function setBusy(value) { busyCallback.current?.(value); }
  function cancel() {
    active.current = null; native?.cancelProbe(); setBusy(false);
    if (alive.current) { setPhase('idle'); setResult(null); setStatus('Η δοκιμή ακυρώθηκε.'); }
  }
  useEffect(() => {
    alive.current = true;
    const listener = native?.available ? new NativeEventEmitter(native).addListener('PestifyWhisperEvent', event => {
      if (!alive.current || event.id !== active.current) return;
      setPhase(event.phase); setStatus(messages[event.phase] || 'Επεξεργασία…');
    }) : null;
    return () => { alive.current = false; active.current = null; native?.cancelProbe(); listener?.remove(); setBusy(false); };
  }, []);
  useEffect(() => { if (!visible) cancel(); }, [visible]);
  async function start() {
    if (active.current || disabled || !native?.available) return;
    const id = `${Date.now()}-${Math.random()}`;
    active.current = id; setBusy(true); setResult(null); setPhase('permissions'); setStatus('Έλεγχος άδειας μικροφώνου…');
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (!alive.current || active.current !== id) return;
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) throw Object.assign(Error(), { code: 'PERMISSION_REQUIRED' });
      if (AppState.currentState !== 'active') throw Object.assign(Error(), { code: 'BACKGROUND' });
      setPhase('preparing'); setStatus(messages.preparing);
      const answer = await native.startProbe(id);
      if (!alive.current || active.current !== id) return;
      setResult(answer); setStatus('Η τοπική δοκιμή ολοκληρώθηκε. Ελέγξτε αν το κείμενο είναι ακριβές.');
    } catch (error) {
      if (alive.current && active.current === id) setStatus(failures[error.code] || `Η δοκιμή δεν ολοκληρώθηκε (${error.code || 'LOCAL_PROBE_FAILED'}).`);
    } finally {
      if (active.current === id) { active.current = null; setBusy(false); if (alive.current) setPhase('idle'); }
    }
  }
  const parsed = result?.text ? parseStationFields(result.text) : null;
  function button(label, action, off=false) {
    return <TouchableOpacity accessibilityRole="button" disabled={off} style={[styles.button, off && { opacity: 0.45 }]} onPress={action}><Text style={styles.buttonText}>{label}</Text></TouchableOpacity>;
  }
  return <View style={styles.card}>
    <Text style={styles.heading}>Δοκιμή ελληνικών — Whisper</Text>
    <Text style={styles.text}>Πρώτα ελέγχουμε ακρίβεια και ταχύτητα σε αυτό το κινητό. Πείτε π.χ. «Σταθμός δύο, κατανάλωση είκοσι πέντε».</Text>
    <Text style={styles.text}>Δεν καταχωρίζει σταθμούς και δεν ενεργοποιεί ακόμη το «Αλέρτ». Κρατήστε αυτή την οθόνη ανοιχτή. Ο ήχος χρησιμοποιείται μόνο στη μνήμη, χωρίς αρχείο ή αποστολή.</Text>
    <Text accessibilityLiveRegion="polite" style={styles.status}>{native?.available ? status : 'Χρειάζεται το νέο Android Lab build με Whisper (Android 13+).'}</Text>
    {result && <View style={styles.result}>
      <Text selectable style={styles.heading}>{result.text || 'Δεν αναγνωρίστηκε κείμενο.'}</Text>
      <Text style={styles.text}>Ήχος: {(result.audioMs / 1000).toFixed(1)} s · Φόρτωση μοντέλου: {(result.loadMs / 1000).toFixed(1)} s · Αναγνώριση: {(result.decodeMs / 1000).toFixed(1)} s</Text>
      <Text style={styles.text}>{parsed?.ok ? 'Το κείμενο ταιριάζει στη μορφή εντολής σταθμού. Δεν αποθηκεύτηκε έλεγχος.' : 'Το κείμενο δεν ταιριάζει σε έγκυρη εντολή σταθμού.'}</Text>
      {result.noSpeechProbability > 0.6 && <Text style={styles.text}>Το μοντέλο ανέφερε αυξημένη πιθανότητα απουσίας ομιλίας. Μην θεωρήσετε το αποτέλεσμα αξιόπιστο.</Text>}
    </View>}
    {phase === 'idle' ? button('Δοκιμή 8 δευτερολέπτων', start, disabled || !native?.available) : <>
      {phase === 'recording' && button('Τέλος ομιλίας', () => native.finishCapture())}
      {button('Ακύρωση δοκιμής', cancel)}
    </>}
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 12, borderWidth: 1, borderColor: '#1f9c8b' },
  heading: { fontSize: 17, fontWeight: '700', color: '#2c3e50' },
  text: { fontSize: 14, lineHeight: 21, color: '#64737d' },
  status: { fontSize: 15, lineHeight: 22, color: '#167d6f', fontWeight: '600' },
  result: { padding: 12, borderRadius: 10, backgroundColor: '#edf8f5', gap: 10 },
  button: { backgroundColor: '#1f9c8b', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
