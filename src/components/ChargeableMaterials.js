import { ProtectedAdminModal as Modal } from "./AdminSessionTimer";
import React, {useEffect, useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import apiService from '../services/apiService';
export const money = v => (Number(v || 0) / 100).toFixed(2) + ' €';
export function Action({label, onPress, disabled = false, destructive = false}) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[s.button, destructive && {backgroundColor:'#b93838'}, disabled && {opacity:.4}]}>
    <Text style={s.buttonText}>{label}</Text>
  </TouchableOpacity>;
}
export function Field({label, value, onChangeText, ...rest}) {
  return <View><Text style={s.label}>{label}</Text><TextInput style={s.input}
    value={String(value ?? '')} onChangeText={onChangeText} {...rest}/></View>;
}
function DropdownButton({label, open, onPress, icon = 'inventory-2'}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:open}}
    style={s.dropdown} onPress={onPress}>
    <MaterialIcons name={icon} size={20} color="#666"/>
    <Text style={s.dropdownText}>{label}</Text>
    <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={24} color="#666"/>
  </TouchableOpacity>;
}
export function Select({label, items, value, onChange, search = false}) {
  const [open,setOpen] = useState(false), [q,setQ] = useState('');
  const filtered = items.filter(i => i.name.toLocaleLowerCase().includes(q.toLocaleLowerCase()));
  return <View style={{marginVertical:5}}>
    <DropdownButton label={items.find(i => i.id === value)?.name || label} open={open} onPress={() => setOpen(!open)}/>
    {open && <View style={s.options}>
      {search && <View style={s.search}><MaterialIcons name="search" size={20} color="#666"/>
        <TextInput accessibilityLabel="Αναζήτηση είδους" placeholder="Αναζήτηση είδους…" style={{flex:1,padding:10}}
          value={q} onChangeText={setQ} autoCorrect={false}/></View>}
      <ScrollView nestedScrollEnabled style={{maxHeight:210}} keyboardShouldPersistTaps="handled">
        {filtered.map(i => <TouchableOpacity key={i.id} style={s.option}
          onPress={() => {onChange(i.id); setOpen(false); setQ('');}}><Text style={s.optionText}>{i.name}</Text></TouchableOpacity>)}
        {!filtered.length && <Text style={s.option}>Δεν βρέθηκαν είδη.</Text>}
      </ScrollView>
    </View>}
  </View>;
}
export function materialsTotal(lines, catalog) {
  return lines.reduce((sum,l) => {
    const item = catalog.find(i => i.id === l.itemId);
    if (!item) return sum;
    const net = Number(item.unit_net_cents) * Number(l.quantity || 0);
    return sum + net + Math.round(net * Number(item.vat_basis_points) / 10000);
  }, 0);
}
export function MaterialSelector({value = [], onChange, onTotal, manage = false, snapshotLines = [], containerStyle}) {
  const [expanded,setExpanded] = useState(manage), [enabled,setEnabled] = useState(false);
  const [catalog,setCatalog] = useState({categories:[],items:[]}), [category,setCategory] = useState(null);
  const [form,setForm] = useState(null), [editing,setEditing] = useState(null);
  const [name,setName] = useState(''), [net,setNet] = useState(''), [vat,setVat] = useState('24');
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  const pricedItems = [...catalog.items];
  snapshotLines.filter(l => l.kind === 'material').forEach(l => {
    const item = {id:l.key, name:l.description, unit_net_cents:l.unitNetCents, vat_basis_points:l.vatBasisPoints};
    const index = pricedItems.findIndex(i => i.id === l.key);
    if (index >= 0) pricedItems[index] = {...pricedItems[index], ...item}; else pricedItems.push(item);
  });
  const total = materialsTotal(value, pricedItems);
  async function reload() {
    const r = await apiService.commercialCatalog();
    if (r.success) {setCatalog(r); setEnabled(true);} else setError(r.error || 'Αποτυχία φόρτωσης υλικών');
  }
  useEffect(() => {apiService.commercialCapabilities().then(r => {if (r.enabled) reload();});}, []);
  useEffect(() => {onTotal?.(total);}, [total, onTotal]);
  function startForm(type, item) {
    setError(''); setEditing(item || null); setForm(type); setName(item?.name || '');
    setNet(item ? (Number(item.unit_net_cents)/100).toFixed(2) : '');
    setVat(item ? String(Number(item.vat_basis_points)/100) : '24');
  }
  function qty(id,n) {onChange(value.map(l => l.itemId === id ? {...l,quantity:n} : l));}
  async function save() {
    setBusy(true); setError('');
    try {
      const body = {name,categoryId:category,netPrice:net.replace(',','.'),vatPercent:vat.replace(',','.')};
      const r = form === 'category' ? await apiService.commercialCreateCategory({name})
        : editing ? await apiService.commercialUpdateItem(editing.id,body) : await apiService.commercialCreateItem(body);
      if (!r.success) throw Error(r.error);
      if (form === 'category') setCategory(r.id);
      setForm(null); await reload();
    } catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  function remove() {
    Alert.alert('Διαγραφή είδους', `Να διαγραφεί το «${name}» από τα διαθέσιμα υλικά; Τα υπάρχοντα ραντεβού διατηρούνται.`, [
      {text:'Άκυρο',style:'cancel'}, {text:'Διαγραφή',style:'destructive',onPress:async () => {
        setBusy(true); setError('');
        try {const r = await apiService.commercialDeleteItem(editing.id); if (!r.success) throw Error(r.error); setForm(null); await reload();}
        catch(e) {setError(e.message);} finally {setBusy(false);}
      }}
    ]);
  }
  if (!enabled) return null;
  const unitNet = Math.round(Number(net.replace(',','.')) * 100);
  const unitGross = unitNet + Math.round(unitNet * Number(vat.replace(',','.')) / 100);
  return <View style={[s.panel,containerStyle]}>
    <View style={s.heading}><MaterialIcons name="inventory-2" size={20} color="#2c3e50"/><Text style={s.title}>Υλικά{!manage ? ' (προαιρετικά)' : ''}</Text></View>
    {!manage && <DropdownButton label={`Επιλογή υλικών${value.length ? ` · ${value.length}` : ''}`} open={expanded} onPress={() => setExpanded(!expanded)}/>}
    {expanded && <>
      {manage && <Action label="Δημιουργία Κατηγορίας" onPress={() => startForm('category')}/>}
      <Select label="Κατηγορία" items={catalog.categories} value={category} onChange={setCategory}/>
      {category && <><Select key={category} label="Είδη" search items={catalog.items.filter(i => i.category_id === category)} onChange={id => {
        if (manage) startForm('item',catalog.items.find(i => i.id === id));
        else if (!value.some(l => l.itemId === id)) onChange([...value,{itemId:id,quantity:1}]);
      }}/>{manage && <Action label="Νέο Είδος" onPress={() => startForm('item')}/>}</>}
      {!manage && value.map(l => <View key={l.itemId} style={s.selected}>
        <Text style={s.optionText}>{pricedItems.find(i => i.id === l.itemId)?.name || 'Υλικό'}</Text>
        <View style={s.quantityRow}>
          <TouchableOpacity accessibilityLabel="Μείωση ποσότητας" style={s.stepper} onPress={() => qty(l.itemId,Math.max(1,Number(l.quantity || 1)-1))}><MaterialIcons name="remove" size={20} color="#1f9c8b"/></TouchableOpacity>
          <TextInput accessibilityLabel="Ποσότητα" style={[s.input,{width:70,textAlign:'center'}]} keyboardType="number-pad" value={String(l.quantity)} onChangeText={v => {if (/^\d{0,5}$/.test(v)) qty(l.itemId,v === '' ? '' : Number(v));}}/>
          <TouchableOpacity accessibilityLabel="Αύξηση ποσότητας" style={s.stepper} onPress={() => qty(l.itemId,Math.min(10000,Number(l.quantity || 0)+1))}><MaterialIcons name="add" size={20} color="#1f9c8b"/></TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Αφαίρεση υλικού" style={[s.stepper,{marginLeft:'auto'}]} onPress={() => onChange(value.filter(x => x.itemId !== l.itemId))}><MaterialIcons name="delete-outline" size={22} color="#b93838"/></TouchableOpacity>
        </View>
      </View>)}
    </>}
    {!manage && <Text style={s.total}>Κόστος υλικών με ΦΠΑ: {money(total)}</Text>}
    {!!error && !form && <Text style={s.error}>{error}</Text>}
    <Modal visible={!!form} transparent onRequestClose={() => !busy && setForm(null)}>
      <View style={s.overlay}><ScrollView style={s.dialog} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>{form === 'category' ? 'Νέα κατηγορία' : editing ? 'Επεξεργασία είδους' : 'Νέο είδος'}</Text>
        <Field label="Ονομασία" value={name} onChangeText={setName} maxLength={form === 'category' ? 120 : 160} editable={!busy}/>
        {form === 'item' && <><Field label="Καθαρή τιμή (€)" value={net} onChangeText={setNet} keyboardType="decimal-pad" editable={!busy}/>
          <Field label="ΦΠΑ (%)" value={vat} onChangeText={setVat} keyboardType="decimal-pad" editable={!busy}/>
          <Text style={s.total}>Συνολική τιμή με ΦΠΑ: {Number.isFinite(unitGross) ? money(unitGross) : '—'}</Text></>}
        {!!error && <Text style={s.error}>{error}</Text>}
        <Action label={busy ? 'Αποθήκευση…' : form === 'category' ? 'Αποθήκευση κατηγορίας' : 'Αποθήκευση Είδους'} disabled={busy || !name.trim()} onPress={save}/>
        {editing && <Action label="Διαγραφή Είδους" destructive disabled={busy} onPress={remove}/>}
        <Action label="Άκυρο" disabled={busy} onPress={() => setForm(null)}/>
      </ScrollView></View>
    </Modal>
  </View>;
}
export const s = StyleSheet.create({
  panel:{marginVertical:12,padding:16,borderWidth:1,borderColor:'#e9ecef',borderRadius:16,backgroundColor:'#fff'},
  heading:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12},
  title:{fontSize:18,fontWeight:'700',color:'#2c3e50'}, label:{marginTop:12,marginBottom:6,color:'#2c3e50',fontWeight:'600'},
  input:{borderWidth:1,borderColor:'#e0e0e0',borderRadius:10,padding:12,minHeight:44,backgroundColor:'#f8f9fa',color:'#2c3e50'},
  dropdown:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#fff',borderWidth:1,borderColor:'#e0e0e0',borderRadius:12,padding:14},
  dropdownText:{flex:1,fontSize:15,color:'#2c3e50'},options:{borderWidth:1,borderColor:'#e9ecef',borderRadius:12,marginTop:6,overflow:'hidden'},
  search:{flexDirection:'row',alignItems:'center',paddingHorizontal:10,backgroundColor:'#f8f9fa'},
  option:{padding:14,borderBottomWidth:1,borderBottomColor:'#f0f0f0'}, optionText:{color:'#2c3e50',fontSize:15},
  selected:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#eee'}, quantityRow:{flexDirection:'row',alignItems:'center',gap:8,marginTop:8},
  stepper:{padding:10,borderWidth:1,borderColor:'#e0e0e0',borderRadius:10},
  total:{marginTop:12,fontWeight:'600',fontSize:14,color:'#2c3e50'},error:{color:'#b93838',marginVertical:8},
  button:{backgroundColor:'#1f9c8b',borderRadius:10,padding:13,marginVertical:6,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'600'},
  overlay:{flex:1,backgroundColor:'#0008',justifyContent:'center',padding:24},dialog:{flexGrow:0,maxHeight:'90%',backgroundColor:'#fff',padding:20,borderRadius:18}
});
