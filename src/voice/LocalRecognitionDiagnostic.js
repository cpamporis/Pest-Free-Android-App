import React, { useEffect, useRef, useState } from 'react';
import { AppState, NativeModules, PermissionsAndroid, Text, TouchableOpacity, View } from 'react-native';
const probe = NativeModules.PestifyLocalRecognitionProbe;
export default function LocalRecognitionDiagnostic({ enabled, onBusy }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('Έλεγχος του εγγενούς τοπικού αναγνωριστή. Δεν καταχωρίζει σταθμούς και δεν χρειάζεται εκφώνηση.');
  const mounted = useRef(true);
  const permissionPrompt = useRef(false);
  const attempt = useRef(0);
  useEffect(() => {
    const listener=AppState.addEventListener('change', state=>{if(state!=='active' && !permissionPrompt.current){attempt.current++;probe?.cancel();setBusy(false);onBusy(false);setResult('Η δοκιμή σταμάτησε.');}});
    return ()=>{mounted.current=false;attempt.current++;probe?.cancel();onBusy(false);listener.remove();};
  }, []);
  if (!probe) return null;
  async function run(method) {
    if(busy || !enabled)return;
    const token=++attempt.current;
    setBusy(true);onBusy(true);setResult(method==='listen'?'Πείτε: Σταθμός δύο, κατανάλωση είκοσι πέντε. Αναμονή αποτελέσματος…':'Έλεγχος…');
    try {
      if(method==='listen') {
        permissionPrompt.current=true;
        const permission=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        permissionPrompt.current=false;
        if(token!==attempt.current || !mounted.current)return;
        if(permission!==PermissionsAndroid.RESULTS.GRANTED){setResult('Χρειάζεται άδεια μικροφώνου.');return;}
      }
      const value=await probe[method]();
      if(!mounted.current || token!==attempt.current)return;
      if(method==='check')setResult(`Τοπικός αναγνωριστής: Ναι\nΕγκατεστημένες: ${value.installed.join(', ')||'Καμία δηλωμένη'}\nΔιαθέσιμες για λήψη: ${value.downloadable.join(', ')||'Καμία δηλωμένη'}\nΣε αναμονή λήψης: ${value.pending.join(', ')||'Καμία'}\nΕλληνικά: αναζητήστε el ή el-GR. Ακόμη κι αν λείπουν, δοκιμάστε την τοπική αναγνώριση.`);
      else if(method==='listen')setResult(`Τοπική αναγνώριση: ${value.text || '(χωρίς κείμενο)'}`);
      else setResult('Ζητήθηκε λήψη ελληνικού μοντέλου. Αυτό δεν επιβεβαιώνει διαθεσιμότητα ή ολοκλήρωση. Περιμένετε και πατήστε ξανά Έλεγχος γλωσσών.');
    } catch(e) {if(mounted.current && token===attempt.current)setResult(`Κωδικός: ${/^[A-Z0-9_]+$/.test(e.code||'')?e.code:'LOCAL_FAILED'}\nΔεν χρησιμοποιήθηκε αναγνώριση μέσω Internet. Οι κωδικοί SUPPORT δείχνουν αποτυχία ελέγχου, όχι οριστικά απουσία ελληνικών. Μπορείτε να δοκιμάσετε την τοπική αναγνώριση.`);}
    finally {permissionPrompt.current=false;if(mounted.current && token===attempt.current){setBusy(false);onBusy(false);}}
  }
  return <View style={{backgroundColor:'white',padding:18,borderRadius:18,gap:12}}>
    <Text style={{fontSize:20,fontWeight:'700',color:'#283746'}}>Έλεγχος τοπικών ελληνικών · local-greek-1</Text>
    <Text selectable>{result}</Text>
    <Text>Ο ήχος δεν αποθηκεύεται από το Pestify και χρησιμοποιείται μόνο ο τοπικός αναγνωριστής. Το κείμενο παραμένει προσωρινά σε αυτή την οθόνη.</Text>
    {[['check','Έλεγχος γλωσσών'],['listen','Δοκιμή τοπικής αναγνώρισης'],['download','Αίτημα λήψης ελληνικών']].map(([method,label])=><TouchableOpacity key={method} accessibilityRole="button" disabled={busy||!enabled} onPress={()=>run(method)} style={{padding:14,borderRadius:10,backgroundColor:busy||!enabled?'#aaa':'#1f9c8b'}}><Text style={{color:'white',fontWeight:'600'}}>{label}</Text></TouchableOpacity>)}
    {busy&&<TouchableOpacity accessibilityRole="button" onPress={()=>probe.cancel()}><Text>Διακοπή δοκιμής</Text></TouchableOpacity>}
  </View>;
}
