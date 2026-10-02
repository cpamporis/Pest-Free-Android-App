'use strict';
const defaultConfiguration=require('./fieldVoiceConfig');
// Native owns wake detection, timeouts, audio and rearming, including while locked.
// JS only resolves a complete command to the existing active-work data path.
function createFieldVoiceSession({native,prepare,validate,commit,onState,onActive,onWakePreview=()=>{},onStartFailure=()=>{},onDiagnostic=()=>{},
  configuration=defaultConfiguration,newId=()=>`${Date.now()}-${Math.random()}`}) {
  const stopMessages={
    LOCAL_TTS_REQUIRED:'Εγκαταστήστε ελληνική φωνή εκτός σύνδεσης στις ρυθμίσεις μετατροπής κειμένου σε ομιλία.',
    AUDIO_INTERRUPTED:'Η ακρόαση σταμάτησε επειδή διακόπηκε ο ήχος. Ξεκινήστε την ξανά.',
    SESSION_LIMIT:'Η ακρόαση σταμάτησε μετά από τέσσερις ώρες. Οι καταχωρίσεις διατηρήθηκαν.',
    LOCAL_ENGINE_FAILED:'Η τοπική αναγνώριση σταμάτησε. Ξεκινήστε την ξανά. Οι καταχωρίσεις διατηρήθηκαν.',
    USER_STOPPED:'Η ακρόαση σταμάτησε. Οι καταχωρίσεις διατηρήθηκαν.',
  };
  let session=null,epoch=0,busy=null,starting=false;
  function failureMessage(reason) {
    const code=/^[A-Z0-9_]{1,100}$/.test(String(reason||''))?reason:'UNKNOWN_START_ERROR';
    const known={
      ...stopMessages,
      TTS_MEDIA_MUTED:'Η ένταση πολυμέσων είναι κλειστή. Αυξήστε την και ξεκινήστε ξανά.',
      TTS_AUDIO_SETUP_FAILED:'Δεν ρυθμίστηκε η έξοδος της φωνής.',
      TTS_DONE_WITHOUT_START:'Η μηχανή δεν επιβεβαίωσε την έναρξη εκφώνησης. Δεν έγινε καταχώριση.',
      SPEECH_FAILED:'Απέτυχε η εκφώνηση. Δεν έγινε καταχώριση.',
      SPEECH_TIMEOUT:'Η εκφώνηση δεν ολοκληρώθηκε. Δεν έγινε καταχώριση.',
      LOCAL_TTS_INIT_FAILED:'Δεν ξεκίνησε η μηχανή εκφώνησης της συσκευής.',
      LOCAL_TTS_VOICE_MISSING:'Δεν βρέθηκε εγκατεστημένη ελληνική φωνή εκτός σύνδεσης στην επιλεγμένη μηχανή εκφώνησης.',
      LOCAL_TTS_SELECT_FAILED:'Δεν ενεργοποιήθηκε η ελληνική φωνή εκφώνησης.',
      LOCAL_ENGINE_UNAVAILABLE:'Δεν φορτώθηκε η τοπική μηχανή Base. Ελέγξτε ότι εγκαταστάθηκε το νέο APK.',
      ENGINE_BUSY:'Η προηγούμενη αναγνώριση κλείνει ακόμη. Περιμένετε λίγο και επαναλάβετε.',
      FOREGROUND_REQUIRED:'Η εκκίνηση απαιτεί την εφαρμογή ανοιχτή στην οθόνη.',
      LISTENER_REQUIRED:'Δεν συνδέθηκε ο δέκτης συμβάντων της εφαρμογής.',
      INVALID_CONFIGURATION:'Δεν έγιναν δεκτές οι ρυθμίσεις φωνής.',
      CONFIGURATION_IDLE_REQUIRED:'Η προηγούμενη συνεδρία δεν έχει κλείσει ακόμη.',
      PERMISSION_REQUIRED:'Χρειάζονται άδεια μικροφώνου και ειδοποιήσεων.',
      START_TIMEOUT:'Η εκκίνηση δεν ολοκληρώθηκε εντός του χρονικού ορίου.',
    };
    return `${known[code]||'Η φωνητική λειτουργία διακόπηκε.'}\nΚωδικός: ${code}`;
  }
  function failStart(reason) {
    const message=failureMessage(reason);stop(message);onStartFailure(message);
  }
  const consumed=new Set();
  function stop(message='Η λειτουργία πεδίου σταμάτησε.') {
    const previous=session;
    onWakePreview(null);epoch++;session=null;busy=null;starting=false;consumed.clear();
    // An idle controller owns nothing to cancel. Delayed cancellation must only target its own session.
    if(previous){if(typeof native.stopSession==='function')native.stopSession(previous);else native.stopField();}
    onActive(false);onState('idle',message);
  }
  async function start() {
    stop('');const ticket=epoch;session=newId();starting=true;onActive(true);onState('starting','Εκκίνηση λειτουργίας πεδίου…');
    try {
      // Keep old binaries usable; v4 adds validated, idle-only native configuration.
      if(typeof native.configureField==='function') {
        const configured=await native.configureField(configuration);
        if(ticket!==epoch)return;
        if(!configured){failStart('INVALID_CONFIGURATION');return false;}
      }
      const started=await native.startField(session);
      if(ticket!==epoch)return;
      if(!started){failStart('START_RETURNED_FALSE');return false;}
      starting=false;return true;
    } catch(error) {
      if(ticket===epoch)failStart(error?.code);
      return false;
    }
  }
  async function handleEvent(event) {
    if(!session || event.sessionId!==session)return;
    if(event.code==='TRANSCRIPT' || event.code==='SPEECH_STAGE'){onDiagnostic(event.code,String(event.text||'').slice(0,500));return;}
    if(event.code==='START_STAGE') {if(starting)onState('starting',`Εκκίνηση: ${String(event.text||'').slice(0,80)}`);return;}
    if(event.code==='WAKE_PREVIEW') {onWakePreview({stage:String(event.stage||''),text:String(event.text||'').slice(0,160)});return;}
    if(event.code==='STOPPED') {
      if(starting){failStart(event.reason);return;}
      if(!['VOICE_CANCELLED','USER_STOPPED'].includes(event.reason)){
        const message=failureMessage(event.reason);stop(message);onStartFailure(message);return;
      }
      stop('Η ακρόαση σταμάτησε. Οι καταχωρίσεις διατηρήθηκαν.');return;
    }
    if(event.code==='WAITING_WAKE') {onState('wake',`Αναμονή για «${configuration.wakePhrases[0]}». Το μικρόφωνο παραμένει ενεργό.`);return;}
    if(event.code==='DECODING') {onState('decoding','Αναγνώριση στη συσκευή… Περιμένετε πριν μιλήσετε ξανά.');return;}
    if(event.code==='LISTENING') {onState('listening',`${configuration.readyMessage} — πείτε τον επόμενο σταθμό ή κάτοψη.`);return;}
    if(event.code!=='COMMAND'||!event.commandId||busy||consumed.has(event.commandId))return;
    consumed.add(event.commandId);
    const ticket=epoch;busy=event.commandId;onState('processing','Επεξεργασία στη συσκευή…');
    const phrase=String(event.text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[.!;]+$/,'').trim();
    if(['τερματισμος','σταματημα','ακυρο'].includes(phrase)){stop();return;}
    if(['παυση','ακυρωση'].includes(phrase)){busy=null;native.waitForWake();return;}
    try {
      const result=prepare(event.text);
      if(result.ok && !validate(result.candidate)){stop('Άλλαξε η εργασία. Δεν έγινε καταχώριση.');return;}
      onState('speaking',result.ok?result.readback:'Επαναλάβετε την εντολή.');
      const replied=await native.reply(event.commandId,result.ok?result.readback:(result.message||'Επαναλάβετε την εντολή.'),result.ok);
      if(ticket!==epoch||!session)return;
      if(!replied){stop('Διακόπηκε η επανάληψη. Δεν έγινε νέα καταχώριση.');return;}
      if(result.ok){
        if(!validate(result.candidate)){stop('Άλλαξε η εργασία ή έληξε η εντολή. Δεν έγινε καταχώριση.');return;}
        commit(result.candidate);
      }
      busy=null;onState('settling','Ετοιμάζομαι για τον επόμενο σταθμό…');
      native.continueAfterCommit(event.commandId);
    } catch {if(ticket===epoch)stop('Δεν ολοκληρώθηκε η εντολή. Η λειτουργία πεδίου σταμάτησε.');}
  }
  return {start,stop,handleEvent};
}
module.exports={createFieldVoiceSession};
