import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, Alert
} from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import { COLORS, ROLES } from '../utils/constants';
import { useApp } from '../context/AppContext';

let idCounter = 500;
function newId() { return String(++idCounter); }

export default function CustomersScreen() {
  const { customers, setCustomers, outgoings, user, archiveItem } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const isAdmin = user?.role === ROLES.ADMIN;

  function defaultForm() {
    return { name: '', contact: '', phone: '', address: '', inn: '', notes: '' };
  }

  function openAdd() { setEditItem(null); setForm(defaultForm()); setShowForm(true); }
  function openEdit(item) {
    setEditItem(item);
    setForm({ name: item.name, contact: item.contact || '', phone: item.phone || '', address: item.address || '', inn: item.inn || '', notes: item.notes || '' });
    setShowForm(true);
  }

  function saveForm() {
    if (!form.name.trim()) { Alert.alert('Xato', 'Nom kiriting'); return; }
    if (editItem) {
      setCustomers((prev) => prev.map((c) => c.id === editItem.id ? { ...c, ...form } : c));
    } else {
      setCustomers((prev) => [...prev, { id: newId(), ...form, createdAt: new Date().toISOString() }]);
    }
    setShowForm(false);
  }

  function deleteCustomer(item) {
    Alert.alert("O'chirish", `"${item.name}" o'chirilsinmi?`, [
      { text: 'Bekor', style: 'cancel' },
      { text: "O'chirish", style: 'destructive', onPress: () => {
        archiveItem(item, 'customer');
        setCustomers((prev) => prev.filter((c) => c.id !== item.id));
      }},
    ]);
  }

  function getCustomerHistory(customerId) {
    return outgoings.filter((o) => o.customerId === customerId);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Yangi xaridor</Text>
      </TouchableOpacity>

      {isAdmin ? (
        <SwipeListView
          data={customers}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <CustomerCard item={item} history={getCustomerHistory(item.id)} />}
          renderHiddenItem={({ item }) => (
            <View style={styles.hiddenRow}>
              <TouchableOpacity style={styles.deleteAction} onPress={() => deleteCustomer(item)}>
                <Text>🗑️</Text><Text style={styles.actionText}>O'chirish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editAction} onPress={() => openEdit(item)}>
                <Text>✏️</Text><Text style={styles.actionText}>Tahrirlash</Text>
              </TouchableOpacity>
            </View>
          )}
          leftOpenValue={80}
          rightOpenValue={-80}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <CustomerCard item={item} history={getCustomerHistory(item.id)} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<View style={{ alignItems: 'center', padding: 60 }}><Text style={{ fontSize: 48 }}>👥</Text><Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>Xaridorlar yo'q</Text></View>}
        />
      )}

      <Modal visible={showForm} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editItem ? 'Tahrirlash' : 'Yangi xaridor'}</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formScroll}>
            {[
              { label: 'Ism / Kompaniya *', key: 'name' },
              { label: "Mas'ul shaxs", key: 'contact' },
              { label: 'Telefon', key: 'phone', keyboard: 'phone-pad' },
              { label: 'Manzil', key: 'address' },
              { label: 'INN', key: 'inn', keyboard: 'numeric' },
              { label: 'Izoh', key: 'notes', multi: true },
            ].map((f) => (
              <React.Fragment key={f.key}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={[styles.input, f.multi && { height: 80, textAlignVertical: 'top' }]}
                  value={form[f.key]}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
                  keyboardType={f.keyboard || 'default'}
                  multiline={f.multi}
                  placeholderTextColor={COLORS.textSecondary}
                />
              </React.Fragment>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={saveForm}>
              <Text style={styles.saveBtnText}>Saqlash</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function CustomerCard({ item, history }) {
  const total = history.reduce((s, o) => s + (o.cost || 0), 0);
  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{item.name}</Text>
      {item.contact ? <Text style={styles.cardInfo}>👤 {item.contact}</Text> : null}
      {item.phone ? <Text style={styles.cardInfo}>📞 {item.phone}</Text> : null}
      {item.address ? <Text style={styles.cardInfo}>📍 {item.address}</Text> : null}
      <View style={styles.historyRow}>
        <Text style={styles.historyText}>Jami chiqim: {history.length} ta</Text>
        <Text style={styles.historyAmount}>{total.toLocaleString()} so'm</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  addBtn: { margin: 16, backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  addBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 15 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, gap: 6 },
  cardName: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  cardInfo: { color: COLORS.textSecondary, fontSize: 13 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  historyText: { color: COLORS.textSecondary, fontSize: 13 },
  historyAmount: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  hiddenRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, borderRadius: 14, overflow: 'hidden', height: '100%' },
  deleteAction: { backgroundColor: COLORS.danger, flex: 1, alignItems: 'center', justifyContent: 'center' },
  editAction: { backgroundColor: COLORS.warning, flex: 1, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  closeBtn: { color: COLORS.textSecondary, fontSize: 20 },
  formScroll: { padding: 20, paddingBottom: 60 },
  label: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, color: COLORS.white, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, fontSize: 15 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: COLORS.background, fontSize: 16, fontWeight: '800' },
});
