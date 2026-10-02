'use strict';
const defaultConfiguration=require('./fieldVoiceConfig');
// Native owns wake detection, timeouts, audio and rearming, including while locked.
// JS only resolves a complete command to the existing active-work data path.
function createFieldVoiceSession({native,prepare,validate,commit,onState,onActive,onWakePreview=()=>{},
  configuration=defaultConfiguration,newId=()=>`${Date.now()}-${Math.random()}`}) {
  const stopMessages={
    LOCAL_TTS_REQUIRED:'Εγκαταστήστε ελληνική φωνή εκτός σύνδεσης στις ρυθμίσεις μετατροπής κειμένου σε ομιλία.',
    AUDIO_INTERRUPTED:'Η ακρόαση σταμάτησε επειδή διακόπηκε ο ήχος. Ξεκινήστε την ξανά.',
    SESSION_LIMIT:'Η ακρόαση σταμάτησε μετά από τέσσερις ώρες. Οι καταχωρίσεις διατηρήθηκαν.',
    LOCAL_ENGINE_FAILED:'Η τοπική αναγνώριση σταμάτησε. Ξεκινήστε την ξανά. Οι καταχωρίσεις διατηρήθηκαν.',
    USER_STOPPED:'Η ακρόαση σταμάτησε. Οι καταχωρίσεις διατηρήθηκαν.',
  };
  let session=null,epoch=0,busy=null;
  const consumed=new Set();
  function stop(message='Η λειτουργία πεδίου σταμάτησε.') {
    onWakePreview(null);epoch++;session=null;busy=null;consumed.clear();native.stopField();onActive(false);onState('idle',message);
  }
  async function start() {
    stop('');const ticket=epoch;session=newId();onActive(true);onState('starting','Εκκίνηση λειτουργίας πεδίου…');
    try {
      // Keep old binaries usable; v4 adds validated, idle-only native configuration.
      if(typeof native.configureField==='function') {
        const configured=await native.configureField(configuration);
        if(ticket!==epoch)return;
        if(!configured){stop('Δεν εφαρμόστηκαν οι ρυθμίσεις φωνής.');return;}
      }
      const started=await native.startField(session);
      if(ticket!==epoch)return;
      if(!started){stop('Δεν ξεκίνησε η λειτουργία πεδίου.');return false;}
      return true;
    } catch(error) {
      if(ticket===epoch)stop(error.code==='INVALID_CONFIGURATION' || error.code==='CONFIGURATION_IDLE_REQUIRED' ? 'Δεν εφαρμόστηκαν οι ρυθμίσεις φωνής. Ελέγξτε τη διαμόρφωση.' : error.code==='LOCAL_LANGUAGES_REQUIRED' ? 'Χρειάζεται διαθέσιμη τοπική αναγνώριση ελληνικών.' : error.code==='LOCAL_TTS_REQUIRED' ? 'Εγκαταστήστε ελληνική φωνή εκτός σύνδεσης στις ρυθμίσεις μετατροπής κειμένου σε ομιλία.' : 'Δεν ξεκίνησε η λειτουργία πεδίου. Ελέγξτε άδειες και ήχο.');
    }
  }
  async function handleEvent(event) {
    if(!session || event.sessionId!==session)return;
    if(event.code==='WAKE_PREVIEW') {onWakePreview({stage:String(event.stage||''),text:String(event.text||'').slice(0,160)});return;}
    if(event.code==='STOPPED') {stop(event.reason==='VOICE_CANCELLED' ? 'Η ακρόαση σταμάτησε. Οι καταχωρίσεις διατηρήθηκαν.' : stopMessages[event.reason] || `Η ακρόαση σταμάτησε (${event.reason || 'διακοπή ήχου'}). Ξεκινήστε την ξανά.`);return;}
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
