import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, Alert
} from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import { COLORS, CURRENCIES, ROLES } from '../utils/constants';
import { useApp } from '../context/AppContext';

let idCounter = 400;
function newId() { return String(++idCounter); }

export default function SuppliersScreen() {
  const { suppliers, setSuppliers, user, archiveItem } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showHistory, setShowHistory] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [payForm, setPayForm] = useState({ amount: '', currency: "So'm", notes: '' });
  const isAdmin = user?.role === ROLES.ADMIN;

  function defaultForm() {
    return { name: '', contact: '', phone: '', address: '', inn: '', notes: '' };
  }

  function openAdd() { setEditItem(null); setForm(defaultForm()); setShowForm(true); }
  function openEdit(item) { setEditItem(item); setForm({ name: item.name, contact: item.contact || '', phone: item.phone || '', address: item.address || '', inn: item.inn || '', notes: item.notes || '' }); setShowForm(true); }

  function saveForm() {
    if (!form.name.trim()) { Alert.alert('Xato', 'Nom kiriting'); return; }
    if (editItem) {
      setSuppliers((prev) => prev.map((s) => s.id === editItem.id ? { ...s, ...form } : s));
    } else {
      setSuppliers((prev) => [...prev, { id: newId(), ...form, payments: [], createdAt: new Date().toISOString() }]);
    }
    setShowForm(false);
  }

  function deleteSupplier(item) {
    Alert.alert("O'chirish", `"${item.name}" o'chirilsinmi?`, [
      { text: 'Bekor', style: 'cancel' },
      { text: "O'chirish", style: 'destructive', onPress: () => {
        archiveItem(item, 'supplier');
        setSuppliers((prev) => prev.filter((s) => s.id !== item.id));
      }},
    ]);
  }

  function savePayment(supplierId) {
    if (!payForm.amount) { Alert.alert('Xato', 'Summani kiriting'); return; }
    setSuppliers((prev) => prev.map((s) => s.id === supplierId
      ? { ...s, payments: [...(s.payments || []), { id: newId(), amount: Number(payForm.amount), currency: payForm.currency, notes: payForm.notes, date: new Date().toISOString() }] }
      : s
    ));
    setPayForm({ amount: '', currency: "So'm", notes: '' });
    setShowPayment(false);
  }

  const totalDebt = (supplier) => {
    if (!supplier.payments) return 0;
    return supplier.payments.reduce((sum, p) => sum + p.amount, 0);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Yangi yetkazib beruvchi</Text>
      </TouchableOpacity>

      {isAdmin ? (
        <SwipeListView
          data={suppliers}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <SupplierCard item={item} isAdmin={isAdmin} onPay={() => { setShowHistory(item); setShowPayment(true); }} onHistory={() => setShowHistory(item)} totalDebt={totalDebt(item)} />
          )}
          renderHiddenItem={({ item }) => (
            <View style={styles.hiddenRow}>
              <TouchableOpacity style={styles.deleteAction} onPress={() => deleteSupplier(item)}>
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
          data={suppliers}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <SupplierCard item={item} isAdmin={false} totalDebt={totalDebt(item)} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState label="Yetkazib beruvchilar yo'q" />}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showForm} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editItem ? 'Tahrirlash' : "Yangi yetkazib beruvchi"}</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formScroll}>
            {[
              { label: 'Kompaniya nomi *', key: 'name' },
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

      {/* Payment Modal */}
      <Modal visible={showPayment} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>To'lov — {showHistory?.name}</Text>
            <Text style={styles.label}>Valyuta</Text>
            <View style={styles.chipsRow}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity key={c} style={[styles.chip, payForm.currency === c && styles.chipActive]} onPress={() => setPayForm((f) => ({ ...f, currency: c }))}>
                  <Text style={[styles.chipText, payForm.currency === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Summa</Text>
            <TextInput style={styles.input} value={payForm.amount} onChangeText={(v) => setPayForm((f) => ({ ...f, amount: v }))} keyboardType="numeric" placeholderTextColor={COLORS.textSecondary} placeholder="0" />
            <Text style={styles.label}>Izoh</Text>
            <TextInput style={styles.input} value={payForm.notes} onChangeText={(v) => setPayForm((f) => ({ ...f, notes: v }))} placeholderTextColor={COLORS.textSecondary} />
            {showHistory?.payments?.length > 0 && (
              <>
                <Text style={[styles.label, { marginTop: 8 }]}>To'lovlar tarixi</Text>
                {showHistory.payments.slice().reverse().map((p) => (
                  <View key={p.id} style={styles.payRow}>
                    <Text style={styles.payDate}>{new Date(p.date).toLocaleDateString('uz')}</Text>
                    <Text style={styles.payAmount}>{p.amount.toLocaleString()} {p.currency}</Text>
                  </View>
                ))}
              </>
            )}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: COLORS.border }]} onPress={() => setShowPayment(false)}>
                <Text style={[styles.saveBtnText, { color: COLORS.white }]}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={() => savePayment(showHistory?.id)}>
                <Text style={styles.saveBtnText}>To'lash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SupplierCard({ item, isAdmin, onPay, onHistory, totalDebt }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{item.name}</Text>
      {item.contact ? <Text style={styles.cardInfo}>👤 {item.contact}</Text> : null}
      {item.phone ? <Text style={styles.cardInfo}>📞 {item.phone}</Text> : null}
      {item.address ? <Text style={styles.cardInfo}>📍 {item.address}</Text> : null}
      {isAdmin && (
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.payBtn} onPress={onPay}>
            <Text style={styles.payBtnText}>💳 To'lov</Text>
          </TouchableOpacity>
          <Text style={styles.debtText}>Jami: {totalDebt.toLocaleString()} so'm</Text>
        </View>
      )}
    </View>
  );
}

function EmptyState({ label }) {
  return (
    <View style={{ alignItems: 'center', padding: 60 }}>
      <Text style={{ fontSize: 48 }}>🏢</Text>
      <Text style={{ color: COLORS.textSecondary, marginTop: 12, fontSize: 15 }}>{label}</Text>
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
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  payBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  payBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 13 },
  debtText: { color: COLORS.textSecondary, fontSize: 13 },
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
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.secondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '80%' },
  sheetTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', marginBottom: 20 },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: COLORS.background },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  payDate: { color: COLORS.textSecondary, fontSize: 13 },
  payAmount: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});
