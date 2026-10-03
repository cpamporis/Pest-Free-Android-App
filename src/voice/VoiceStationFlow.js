import LocalRecognitionDiagnostic from './LocalRecognitionDiagnostic';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Modal, PermissionsAndroid, NativeEventEmitter, NativeModules, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../services/apiService';
import { MaterialIcons } from '@expo/vector-icons';
const fieldConfiguration = require('./fieldVoiceConfig');
const { stationDraft } = require('./parseStationFields');
const { createFieldVoiceSession } = require('./fieldVoiceSession');
const { resolveVoiceRoute, validateVoiceCandidate, candidateContext } = require('./voiceMapRouting');
const { contextKey, validateCandidate } = require('./stationVoiceSession');
const native = Platform.OS === 'android' ? NativeModules.PestifyFieldSession : null;
const fieldNative = native;
export const voiceAvailable = Boolean(native?.voiceEnabled && fieldNative?.enabled);
const errors = {
  STATION_NOT_FOUND: 'Δεν υπάρχει αυτός ο δολωματικός σταθμός στις κατόψεις της εργασίας.',
  MAP_NOT_FOUND: 'Δεν υπάρχει αυτή η κάτοψη. Πείτε κάτοψη και τον αριθμό της.',
  AMBIGUOUS_MAP: 'Δεν προσδιορίζονται μοναδικά οι κατόψεις. Ελέγξτε την εργασία.',
  CHOOSE_MAP: 'Ο σταθμός υπάρχει σε περισσότερες κατόψεις. Πείτε πρώτα κάτοψη και τον αριθμό της.',
  AMBIGUOUS_STATION: 'Ο αριθμός δεν προσδιορίζει μοναδικό σταθμό. Ελέγξτε την κάτοψη.',
  CONTEXT_CHANGED: 'Άλλαξε η εργασία ή ο σταθμός. Η εντολή ακυρώθηκε.',
  INACTIVE_CONTEXT: 'Ξεκινήστε εργασία σε συγκεκριμένο ραντεβού και επιλέξτε κάτοψη.',
  INCOMPLETE_DATA: 'Ελέγξτε δόλωμα, δοσολογία και κατανάλωση (0, 25, 50, 75 ή 100%).',
  INVALID_CONDITION: 'Πείτε κατάσταση λειτουργικό, λείπει ή κατεστραμμένο.',
  INVALID_ACCESS: 'Πείτε πρόσβαση ναι ή όχι.',
  EXPIRED: 'Έληξε η επιβεβαίωση. Επαναλάβετε την εντολή.',
};
export default function VoiceStationFlow({ context, loggedStations, technician, onCommit, onClose, defaults, onDefaultsChange, visible, onSessionState }) {
  const current = useRef({ context, loggedStations, onCommit, defaults, technician, onClose, onSessionState });
  current.current = { context, loggedStations, onCommit, defaults, technician, onClose, onSessionState };
  const [baitTypes, setBaitTypes] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState('Φόρτωση δολωμάτων…');
  const [catalogReload, setCatalogReload] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(!defaults?.baitType || !defaults?.dosageG);
  const [baitChoice, setBaitChoice] = useState(defaults?.baitType || '');
  const [doseChoice, setDoseChoice] = useState(defaults?.dosageG || 0);
  const fieldActive = useRef(false);
  const [dropdown, setDropdown] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [diagnosticBusy, setDiagnosticBusy] = useState(false);
  const [lastHeard,setLastHeard]=useState('');
  const [speechStage,setSpeechStage]=useState('');
  const [speechEngine,setSpeechEngine]=useState('');
  const [startupError, setStartupError] = useState('');
  const [status, setStatus] = useState('Επιλέξτε δόλωμα και δοσολογία για αυτή την εργασία.');
  const alive = useRef(true);
  const permissionAttempt = useRef(0);
  const permissionPrompt = useRef(false);
  const mountedKey = useRef(contextKey(context));
  const callbacks = {
    onState: (next,message) => { if (alive.current) { setPhase(next); setStatus(message); current.current.onSessionState?.({phase:next,status:message}); } },
    prepare: text => {
      const { context:source, defaults:d, loggedStations:logs, technician:tech } = current.current;
      const target = resolveVoiceRoute(source,text);
      if (!target.ok) return {ok:false,message:errors[target.code] || 'Δεν αναγνωρίστηκε εντολή. Επαναλάβετε τον σταθμό και την κατανάλωση.'};
      const c=target.targetContext;
      const routeData={sourceKey:contextKey(source),targetKey:contextKey(c),targetMapId:String(c.map.mapId ?? c.map.map_id),kind:target.kind};
      if(target.kind==='map')return {ok:true,candidate:{...routeData,mapNumber:target.mapNumber,mapName:c.map.name||'',expiresAt:Date.now()+60000},readback:`Κάτοψη ${target.mapNumber}, ${c.map.name || 'χωρίς όνομα'}.`};
      if (logs.filter(s => String(s.mapId ?? s.map_id ?? '') === String(c.map.mapId ?? c.map.map_id) && String(s.stationId) === String(target.stationId) && s.stationType === 'BS').length > 1)
        return {ok:false,message:errors.AMBIGUOUS_STATION};
      const data = { ...stationDraft(target,d), mapId:String(c.map.mapId ?? c.map.map_id),mapName:c.map.name || null,
        visitId:c.visitId,customerId:c.customerId,technicianId:tech?.id,technicianName:tech?.name,timestamp:new Date().toISOString() };
      const {targetContext,...stationTarget}=target;
      const value = { ...stationTarget,...routeData,expiresAt:Date.now()+60000,data };
      if (!validateCandidate(c,value).ok) return {ok:false,message:'Πείτε σταθμό και κατανάλωση μηδέν, είκοσι πέντε, πενήντα, εβδομήντα πέντε ή εκατό.'};
      const detail = data.access === 'No' ? 'πρόσβαση όχι' : data.condition === 'Missing' ? 'κατάσταση λείπει' : data.condition === 'Damaged' ? 'κατάσταση κατεστραμμένο' : `κατανάλωση ${String(data.consumption).replace("%"," τοις εκατό")}`;
      return {ok:true,candidate:value,readback:`${contextKey(source)!==contextKey(c)?`Κάτοψη ${c.map.name || (source.maps||[]).findIndex(m=>String(m.mapId ?? m.map_id)===routeData.targetMapId)+1}. `:""}Σταθμός ${value.stationId}, ${detail}.`};
    },
    validate: value => (AppState.currentState === 'active' || fieldActive.current) && contextKey(current.current.context) === mountedKey.current && validateVoiceCandidate(current.current.context,value),
    commit: value => {
      const target=candidateContext(current.current.context,value);
      if(!target)throw new Error('VOICE_MAP_REMOVED');
      current.current.onCommit(value);
      mountedKey.current=contextKey(target);
      current.current={...current.current,context:target};
    },
  };
  const fieldController = useRef(null);
  if (!fieldController.current && fieldNative?.enabled) fieldController.current=createFieldVoiceSession({
    native:fieldNative,...callbacks,onDiagnostic:(code,text)=>{if(alive.current){if(code==='TRANSCRIPT')setLastHeard(text);else if(text.startsWith('Μηχανή:'))setSpeechEngine(text);else setSpeechStage(text);}},onStartFailure:message=>{if(alive.current){setStartupError(message);Alert.alert('Η ακρόαση διακόπηκε',message);}},onActive:value=>{fieldActive.current=value;}
  });
  function pause(message) {
    permissionAttempt.current++;
    fieldController.current?.stop(message);
  }
  useEffect(() => {
    let active = true;
    setCatalogStatus('Φόρτωση δολωμάτων…');
    apiService.getBaitTypes().then(items => {
      if (!active) return;
      const names = [...new Set((Array.isArray(items) ? items : []).map(item => typeof item === 'string' ? item : item?.name).filter(name => typeof name === 'string' && name.trim()))];
      setBaitTypes(names); setCatalogStatus(names.length ? '' : 'Δεν υπάρχουν διαθέσιμα δολώματα.');
    }).catch(() => { if (active) { setBaitTypes([]); setCatalogStatus('Δεν φορτώθηκαν τα δολώματα. Ελέγξτε τη σύνδεση και επαναλάβετε.'); } });
    return () => { active = false; };
  }, [catalogReload, context.customerId]);
  useEffect(() => {
    alive.current = true;
    current.current.onSessionState?.({phase:'idle',status:''});
    fieldNative?.configureWakePreview?.(false);
    const app = AppState.addEventListener('change', value => {
      if (!fieldActive.current && (value === 'background' || (value !== 'active' && !permissionPrompt.current))) pause('Η φωνητική λειτουργία σταμάτησε επειδή η εφαρμογή δεν είναι ενεργή.');
    });
    const fieldSub=fieldNative?.enabled ? new NativeEventEmitter(fieldNative).addListener('PestifyFieldEvent',event=>{void fieldController.current.handleEvent(event);}) : null;
    return () => { alive.current = false; permissionAttempt.current++; fieldController.current?.stop(); fieldSub?.remove(); app.remove(); };
  }, []);
  useEffect(() => {
    if (contextKey(context) !== mountedKey.current || !context.active) { pause(errors.CONTEXT_CHANGED); mountedKey.current=contextKey(context); current.current.onClose(); }
  }, [contextKey(context), context.active]);
  useEffect(() => {
    setBaitChoice(defaults?.baitType || ''); setDoseChoice(defaults?.dosageG || 0);
    setSettingsOpen(!defaults?.baitType || !defaults?.dosageG); setDropdown(null);
  }, [defaults?.baitType, defaults?.dosageG]);
  async function start() {
    if (diagnosticBusy) return;
    if (!current.current.defaults?.baitType || !current.current.defaults?.dosageG || settingsOpen) return;
    setStartupError('');setLastHeard('');setSpeechStage('');setSpeechEngine('');
    pause('Έλεγχος αδειών…'); setPhase('permissions');
    const token = permissionAttempt.current;
    permissionPrompt.current = true;
    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        ]);
        if (!alive.current || token !== permissionAttempt.current) return;
        if (Object.values(granted).some(value => value !== PermissionsAndroid.RESULTS.GRANTED)) {
          pause('Χρειάζονται άδεια μικροφώνου και ειδοποιήσεων για την ακρόαση πεδίου.'); return;
        }
      }
      const caps = await native.capabilities();
      if (!alive.current || token !== permissionAttempt.current) return;
      if (!caps.onDevice || !caps.available || !caps.speechAuthorized || !caps.microphoneAuthorized || AppState.currentState !== 'active') {
        pause(caps.message || 'Η τοπική αναγνώριση ή οι άδειες δεν είναι διαθέσιμες.'); return;
      }
      const started=await fieldController.current.start();
      if(started && alive.current && token===permissionAttempt.current)current.current.onClose();
    } catch(error) { if (alive.current && token === permissionAttempt.current) { const code=/^[A-Z0-9_]{1,100}$/.test(String(error?.code||''))?error.code:'PREFLIGHT_FAILED'; const message=`Δεν ολοκληρώθηκε ο έλεγχος εκκίνησης.\nΚωδικός: ${code}`; pause(message);setStartupError(message);Alert.alert('Η ακρόαση διακόπηκε',message); } }
    finally { permissionPrompt.current = false; }
  }
  const compatible = Boolean(fieldNative?.enabled && fieldNative?.wakeVersion >= 6);
  const running = phase !== 'idle';
  function action(label, onPress, disabled=false, danger=false) {
    return <TouchableOpacity accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[styles.button,danger && styles.danger,disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></TouchableOpacity>;
  }
  function select(label, key, value, options, choose) {
    return <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:dropdown===key,disabled:running}} disabled={running} style={styles.dropdown} onPress={()=>setDropdown(dropdown===key?null:key)}>
        <Text style={[styles.dropdownText,!value && styles.placeholder]}>{value || 'Επιλέξτε'}</Text><MaterialIcons name={dropdown===key?'keyboard-arrow-up':'keyboard-arrow-down'} size={24} color="#1f9c8b" />
      </TouchableOpacity>
      {dropdown===key && <View style={styles.dropdownMenu}><ScrollView nestedScrollEnabled style={{maxHeight:220}} keyboardShouldPersistTaps="handled">
        {options.map(option=><TouchableOpacity accessibilityRole="button" key={String(option.value)} style={styles.dropdownItem} onPress={()=>{choose(option.value);setDropdown(null);}}><Text style={styles.dropdownItemText}>{option.label}</Text></TouchableOpacity>)}
        {!options.length && <Text style={styles.helper}>Δεν υπάρχουν διαθέσιμες επιλογές.</Text>}
      </ScrollView></View>}
    </View>;
  }
  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
    <SafeAreaProvider><SafeAreaView style={styles.screen}>
      <View style={styles.header}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Επιστροφή στην κάτοψη" style={styles.back} onPress={onClose}><MaterialIcons name="arrow-back" size={24} color="#1f9c8b" /></TouchableOpacity><Text style={styles.title}>Ηχογράφηση</Text><View style={styles.headerIcon}><MaterialIcons name="mic" size={24} color="#1f9c8b" /></View></View>
      {!!startupError && <View style={{padding:16,backgroundColor:'#fff0f0'}}><Text selectable style={{color:'#a32121'}}>{startupError}</Text></View>}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {visible && <LocalRecognitionDiagnostic enabled={!running} onBusy={setDiagnosticBusy} />}
        <View style={styles.card}>
          <Text style={styles.helper}>Κανόνες φωνής: voice-js-4</Text>
          <Text style={styles.helper}>Έκδοση φωνής: {fieldNative?.diagnosticVersion || 'base-field-2'}</Text>
          <Text selectable style={styles.helper}>{speechEngine}</Text>
          <Text selectable style={styles.helper}>Εκφώνηση: {speechStage || 'Δεν ξεκίνησε ακόμη'}</Text>
          {!!lastHeard && <Text selectable style={styles.helper}>Τελευταία αναγνώριση (μόνο στη μνήμη): {lastHeard}</Text>}
          <Text style={styles.sectionTitle}>Κατόψεις</Text>
          {(context.maps || [context.map]).filter(Boolean).map((map,index)=>{
            const selected=String(map.mapId ?? map.map_id)===String(context.map?.mapId ?? context.map?.map_id);
            return <View key={String(map.mapId ?? map.map_id)} style={[styles.mapRow,selected && styles.selectedMap]}><MaterialIcons name="layers" size={20} color={selected?'#1f9c8b':'#88949c'} /><Text style={[styles.mapText,selected && styles.selectedText]}>Κάτοψη {index+1}: {map.name || 'Χωρίς όνομα'}</Text>{selected && <MaterialIcons name="check-circle" size={20} color="#1f9c8b" />}</View>;
          })}
          <Text style={styles.helper}>Πείτε «Κάτοψη δύο» για αλλαγή κάτοψης.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Προεπιλογές εργασίας</Text>
          {settingsOpen ? <>
            {select('Τύπος δολώματος','bait',baitChoice,baitTypes.map(name=>({label:name,value:name})),setBaitChoice)}
            {select('Δοσολογία','dose',doseChoice?`${doseChoice} g`:'',[10,20,30,40,50,60,70,80,90,100].map(g=>({label:`${g} g`,value:g})),setDoseChoice)}
            {!!catalogStatus && <Text style={styles.helper}>{catalogStatus}</Text>}
            {action('Χρήση προεπιλογών',()=>{onDefaultsChange({baitType:baitChoice,dosageG:doseChoice});setSettingsOpen(false);setDropdown(null);},running || !baitTypes.includes(baitChoice) || !doseChoice)}
            {!!catalogStatus && <TouchableOpacity accessibilityRole="button" style={styles.textButton} onPress={()=>setCatalogReload(n=>n+1)}><Text style={styles.link}>Επαναφόρτωση δολωμάτων</Text></TouchableOpacity>}
          </> : <>
            <Text style={styles.defaults}>{defaults?.baitType}</Text><Text style={styles.helper}>Δοσολογία: {defaults?.dosageG} g</Text>
            {!running && <TouchableOpacity accessibilityRole="button" style={styles.textButton} onPress={()=>setSettingsOpen(true)}><Text style={styles.link}>Αλλαγή προεπιλογών</Text></TouchableOpacity>}
          </>}
        </View>
        <View style={styles.card}>
          <View style={styles.statusHeading}><View style={[styles.dot,running && styles.dotActive]} /><Text style={styles.sectionTitle}>{phase==='permissions'?'Έλεγχος διαθεσιμότητας':phase==='starting'?'Εκκίνηση ακρόασης':running?'Ακρόαση ενεργή':'Έτοιμο για έναρξη'}</Text></View>
          <Text accessibilityLiveRegion="polite" style={styles.helper}>{compatible?status:'Απαιτείται η νέα έκδοση της εφαρμογής για φωνητική διακοπή.'}</Text>
          <Text style={styles.helper}>Πείτε «{fieldConfiguration.wakePhrases[0]}», περιμένετε «{fieldConfiguration.readyMessage}» και δώστε τον σταθμό και την κατανάλωση. Μετά από κάθε εντολή περιμένετε την επανάληψη πριν μιλήσετε ξανά. Η ακρόαση συνεχίζεται στην κάτοψη και με κλειδωμένη οθόνη, με μόνιμη ειδοποίηση Android.</Text>
          <Text style={styles.helper}>Ο ήχος και το αναγνωρισμένο κείμενο χρησιμοποιούνται προσωρινά στη συσκευή, χωρίς αποθήκευση ή αποστολή. Καταχωρίζονται μόνο τα στοιχεία του ελέγχου.</Text>
          <Text style={styles.helper}>Η αναγνώριση γίνεται με το ενσωματωμένο Tiny. Απαιτούνται Android 13 ή νεότερο και εγκατεστημένη ελληνική φωνή εκτός σύνδεσης για την εκφώνηση. Για διακοπή πείτε «Άκυρο» όταν ακούει ή πατήστε «Διακοπή» στην εφαρμογή ή στην ειδοποίηση. Οι καταχωρισμένες εγγραφές διατηρούνται. Η τελική αποθήκευση γίνεται με την ολοκλήρωση της εργασίας.</Text>
          {running ? action('Διακοπή',()=>pause('Η ακρόαση σταμάτησε. Οι καταχωρίσεις διατηρήθηκαν.'),false,true) : action('Έναρξη ακρόασης',start,diagnosticBusy || !compatible || settingsOpen || !defaults?.baitType || !defaults?.dosageG || !context.active)}
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.textButton} onPress={onClose}><Text style={styles.link}>Επιστροφή στην κάτοψη</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#f5f7f9'},
  header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:20,paddingVertical:16,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#e9eef0'},
  back:{padding:8,borderRadius:10,backgroundColor:'#edf8f5'},
  title:{flex:1,fontSize:23,fontWeight:'700',color:'#2c3e50'},
  headerIcon:{padding:10,borderRadius:12,backgroundColor:'#edf8f5'},
  content:{padding:20,gap:16,paddingBottom:32},
  card:{backgroundColor:'#fff',borderRadius:16,padding:18,gap:12,borderWidth:1,borderColor:'#e9eef0',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.04,shadowRadius:6,elevation:2},
  sectionTitle:{fontSize:17,fontWeight:'700',color:'#2c3e50'},
  helper:{fontSize:14,lineHeight:21,color:'#64737d'},
  mapRow:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:10,backgroundColor:'#f6f8f9'},
  selectedMap:{backgroundColor:'#eaf7f3'},mapText:{flex:1,fontSize:15,color:'#52616c'},selectedText:{fontWeight:'600',color:'#167d6f'},
  field:{gap:8},label:{fontSize:15,fontWeight:'600',color:'#2c3e50'},
  dropdown:{flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:'#1f9c8b',borderRadius:10,paddingVertical:12,paddingHorizontal:12,backgroundColor:'#fff'},
  dropdownText:{flex:1,fontSize:15,fontWeight:'600',color:'#333'},placeholder:{color:'#999'},
  dropdownMenu:{marginTop:6,borderWidth:1,borderColor:'#1f9c8b',borderRadius:10,backgroundColor:'#fff',overflow:'hidden'},
  dropdownItem:{paddingVertical:12,paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:'#eee'},dropdownItemText:{fontSize:15,color:'#333',fontWeight:'500'},
  button:{backgroundColor:'#1f9c8b',paddingVertical:14,paddingHorizontal:18,borderRadius:10,alignItems:'center'},buttonText:{color:'#fff',fontSize:16,fontWeight:'700'},danger:{backgroundColor:'#d54d4d'},disabled:{opacity:0.45},
  defaults:{fontSize:16,fontWeight:'600',color:'#2c3e50'},textButton:{paddingVertical:10,alignItems:'center'},link:{color:'#1f9c8b',fontSize:15,fontWeight:'600'},
  statusHeading:{flexDirection:'row',alignItems:'center',gap:8},dot:{width:9,height:9,borderRadius:5,backgroundColor:'#a8b4ba'},dotActive:{backgroundColor:'#1f9c8b'},
});
