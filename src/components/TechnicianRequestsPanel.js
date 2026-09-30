import React, {useState} from 'react';
import {View, Text, TouchableOpacity, ScrollView} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import apiService from '../services/apiService';
import ProtectedImage from './ProtectedImage';
import CommercialEditor from './CommercialEditor';
import {Action} from './ChargeableMaterials';

// Controlled by the requests screen so customer/technician lists refresh together.
export default function TechnicianRequestsPanel({requests = [], onChanged, onOpenImages, styles}) {
  const [selected,setSelected] = useState(null), [error,setError] = useState('');
  const [busy,setBusy] = useState(null);
  async function reject(id) {
    setBusy(id); setError('');
    try {
      const result = await apiService.commercialReject(id);
      if (!result.success) throw Error(result.error);
      await onChanged();
    } catch(e) {setError(e.message);} finally {setBusy(null);}
  }
  return <View>
    {requests.filter(r => r.status === 'pending').map(r => <View key={r.id} style={styles.requestCard}>
      <View style={styles.cardHeader}>
        <View style={styles.customerInfo}>
          <View style={styles.customerIcon}><MaterialIcons name="engineering" size={20} color="#1f9c8b"/></View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{r.customer_name || 'Ραντεβού'}</Text>
            <Text style={{color:'#b93838',fontWeight:'600',marginTop:4}}>Αίτημα τεχνικού</Text>
          </View>
        </View>
      </View>
      {!!r.comment && <Text style={styles.description}>{r.comment}</Text>}
      <Text style={{color:'#666',marginTop:8}}>{String(r.appointment_date || '').slice(0,10)}</Text>
      {!!r.images?.length && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:10}}>
        {r.images.map((name,index) => <TouchableOpacity key={`${name}-${index}`}
          accessibilityRole="button" accessibilityLabel={`Άνοιγμα φωτογραφίας ${index+1}`}
          onPress={() => onOpenImages(r.images,index)} activeOpacity={0.8}>
          <ProtectedImage source={{uri:apiService.getUploadedFileUrl(name)}} resizeMode="cover"
            style={{width:70,height:70,borderRadius:8,marginRight:8,borderWidth:1,borderColor:'#e9ecef'}}/>
        </TouchableOpacity>)}
      </ScrollView>}
      <Action label="Αποδοχή — αλλαγή χρέωσης / υλικών" disabled={busy !== null} onPress={() => setSelected(r)}/>
      <Action label="Απόρριψη" disabled={busy !== null} onPress={() => reject(r.id)}/>
    </View>)}
    {!!error && <Text style={{color:'#b93838'}}>{error}</Text>}
    {selected && <CommercialEditor appointmentId={selected.appointment_id} requestId={selected.id}
      onClose={() => setSelected(null)} onSaved={onChanged}/>}
  </View>;
}
