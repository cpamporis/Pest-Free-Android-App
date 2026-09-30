import React,{useEffect,useState,useRef} from 'react';
import {View,Text,Modal,ScrollView,Platform,Image,TouchableOpacity} from 'react-native';
import {launchCamera,launchImageLibrary} from 'react-native-image-picker';
import apiService from '../services/apiService';
import {Action,Field,s} from './ChargeableMaterials';
export default function CommercialServicePanel({appointmentId,started,completed,buttonStyle,textStyle}) {
 const [enabled,setEnabled]=useState(false),[open,setOpen]=useState(false),[comment,setComment]=useState(''),[photos,setPhotos]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const key=useRef(null);
 useEffect(()=>{let alive=true; if(!appointmentId)return;apiService.commercialCapabilities().then(async c=>{if(!c.enabled||!alive)return;setEnabled(true);});return()=>{alive=false;};},[appointmentId,started,completed]);
 async function pick(camera){try{const r=await (camera?launchCamera:launchImageLibrary)({mediaType:'photo',selectionLimit:1,quality:.8});if(r.errorCode)throw Error(r.errorMessage||r.errorCode);if(r.assets?.[0]){setPhotos([...photos,r.assets[0]].slice(0,3));key.current=null;}}catch(e){setError(e.message);}}
 async function send(){setBusy(true);setError('');try{const form=new FormData();if(!key.current)key.current=`request_${Date.now()}_${Math.random().toString(36).slice(2)}`;form.append('idempotencyKey',key.current);form.append('comment',comment);for(const asset of photos){if(Platform.OS==='web'){const blob=await (await fetch(asset.uri)).blob();form.append('images',blob,asset.fileName||'request.jpg');}else form.append('images',{uri:asset.uri,type:asset.type||'image/jpeg',name:asset.fileName||'request.jpg'});}const r=await apiService.commercialSendRequest(appointmentId,form);if(!r.success)throw Error(r.error);setOpen(false);setComment('');setPhotos([]);key.current=null;}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(!enabled||!appointmentId||!started||completed)return null;
 return <View>
 <TouchableOpacity accessibilityRole="button" style={buttonStyle} onPress={()=>{setError('');setOpen(true);}}>
   <Text style={textStyle}>Αίτημα</Text>
 </TouchableOpacity>
 <Modal visible={open} transparent onRequestClose={()=>!busy&&setOpen(false)}><View style={s.overlay}><ScrollView style={s.dialog} keyboardShouldPersistTaps="handled"><Text style={s.title}>Αίτημα προς το γραφείο</Text><Field label="Σχόλιο" value={comment} onChangeText={v=>{setComment(v);key.current=null;}} multiline maxLength={4000}/>{photos.map((p,i)=><View key={p.uri}><Image source={{uri:p.uri}} style={{width:100,height:100}}/><Action label="Αφαίρεση φωτογραφίας" onPress={()=>{setPhotos(photos.filter((_,n)=>i!==n));key.current=null;}}/></View>)}{photos.length<3&&<><Action label="Κάμερα" onPress={()=>pick(true)} disabled={busy}/><Action label="Συλλογή φωτογραφιών" onPress={()=>pick(false)} disabled={busy}/></>}{!!error&&<Text style={{color:'#b00'}}>{error}</Text>}<Action label={busy?'Αποστολή…':'Αποστολή'} disabled={busy||(!comment.trim()&&!photos.length)} onPress={send}/><Action label="Άκυρο" disabled={busy} onPress={()=>setOpen(false)}/></ScrollView></View></Modal>
 </View>;
}
