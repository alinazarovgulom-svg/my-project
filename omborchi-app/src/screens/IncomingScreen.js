import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, Alert
} from 'react-native';
import { COLORS, CURRENCIES, ROLES } from '../utils/constants';
import { useApp } from '../context/AppContext';

let idCounter = 200;
function newId() { return String(++idCounter); }

export default function IncomingScreen() {
  const { rawMaterials, setRawMaterials, suppliers, incomings, setIncomings, user } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const isViewer = user?.role === ROLES.TOMOSHABIN;

  function defaultForm() {
    return { materialId: '', qty: '', supplierId: '', currency: "So'm", price: '', notes: '' };
  }

  function saveForm() {
    if (!form.materialId) { Alert.alert('Xato', 'Xomashyo tanlang'); return; }
    if (!form.qty || Number(form.qty) <= 0) { Alert.alert('Xato', 'Miqdorni kiriting'); return; }
    if (!form.supplierId) { Alert.alert('Xato', 'Yetkazib beruvchi tanlang'); return; }
    if (!form.price) { Alert.alert('Xato', 'Narxni kiriting'); return; }

    const qty = Number(form.qty);
    const price = Number(form.price);
    const batch = {
      id: newId(),
      date: new Date().toISOString(),
      quantity: qty,
      remainingQty: qty,
      price,
      currency: form.currency,
      supplierId: form.supplierId,
    };

    setRawMaterials((prev) =>
      prev.map((m) =>
        m.id === form.materialId
          ? { ...m, currentQty: (m.currentQty || 0) + qty, batches: [...(m.batches || []), batch] }
          : m
      )
    );

    const incoming = {
      id: newId(),
      materialId: form.materialId,
      materialName: rawMaterials.find((m) => m.id === form.materialId)?.name,
      qty,
      supplierId: form.supplierId,
      supplierName: suppliers.find((s) => s.id === form.supplierId)?.name,
      currency: form.currency,
      price,
      notes: form.notes,
      date: new Date().toISOString(),
      createdBy: user?.id,
    };
    setIncomings((prev) => [incoming, ...prev]);
    setForm(defaultForm());
    setShowForm(false);
  }

  return (
    <View style={styles.container}>
      {!isViewer && (
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addBtnText}>+ Yangi kirim</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={incomings}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.materialName}>{item.materialName}</Text>
              <Text style={styles.date}>{new Date(item.date).toLocaleDateString('uz')}</Text>
            </View>
            <View style={styles.cardRow}>
              <Info label="Miqdor" value={`${item.qty}`} />
              <Info label="Narx" value={`${item.price?.toLocaleString()} ${item.currency}`} />
            </View>
            {item.supplierName && <Text style={styles.supplier}>📦 {item.supplierName}</Text>}
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </View>
        )}
      />

      <Modal visible={showForm} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yangi kirim</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formScroll}>
            <SelectField
              label="Xomashyo *"
              options={rawMaterials.map((m) => ({ id: m.id, label: `${m.name} (${m.code})` }))}
              value={form.materialId}
              onChange={(v) => setForm((f) => ({ ...f, materialId: v }))}
            />
            <FormInput label="Miqdori *" value={form.qty} onChange={(v) => setForm((f) => ({ ...f, qty: v }))} keyboardType="numeric" />
            <SelectField
              label="Yetkazib beruvchi *"
              options={suppliers.map((s) => ({ id: s.id, label: s.name }))}
              value={form.supplierId}
              onChange={(v) => setForm((f) => ({ ...f, supplierId: v }))}
              empty="Yetkazib beruvchi yo'q"
            />
            <Text style={styles.label}>Valyuta</Text>
            <View style={styles.chipsRow}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity key={c} style={[styles.chip, form.currency === c && styles.chipActive]} onPress={() => setForm((f) => ({ ...f, currency: c }))}>
                  <Text style={[styles.chipText, form.currency === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <FormInput label="Narxi *" value={form.price} onChange={(v) => setForm((f) => ({ ...f, price: v }))} keyboardType="numeric" />
            <FormInput label="Izoh" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} multiline />
            <TouchableOpacity style={styles.saveBtn} onPress={saveForm}>
              <Text style={styles.saveBtnText}>Saqlash</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function SelectField({ label, options, value, onChange, empty }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        <View style={styles.selectRow}>
          {options.length === 0
            ? <Text style={styles.emptyOption}>{empty || "Ma'lumot yo'q"}</Text>
            : options.map((o) => (
                <TouchableOpacity
                  key={o.id}
                  style={[styles.selectChip, value === o.id && styles.selectChipActive]}
                  onPress={() => onChange(o.id)}
                >
                  <Text style={[styles.selectText, value === o.id && styles.selectTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              ))
          }
        </View>
      </ScrollView>
    </>
  );
}

function FormInput({ label, value, onChange, keyboardType, multiline }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        placeholderTextColor={COLORS.textSecondary}
      />
    </>
  );
}

function Info({ label, value }) {
  return (
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={{ alignItems: 'center', padding: 60 }}>
      <Text style={{ fontSize: 48 }}>📥</Text>
      <Text style={{ color: COLORS.textSecondary, marginTop: 12, fontSize: 15 }}>Kirimlar yo'q</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  addBtn: {
    margin: 16, backgroundColor: COLORS.primary,
    borderRadius: 12, padding: 16, alignItems: 'center',
  },
  addBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 15 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 14,
    padding: 14, marginBottom: 10, gap: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  materialName: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  date: { color: COLORS.textSecondary, fontSize: 12 },
  cardRow: { flexDirection: 'row', gap: 24 },
  infoLabel: { color: COLORS.textSecondary, fontSize: 11 },
  infoValue: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  supplier: { color: COLORS.textSecondary, fontSize: 13 },
  notes: { color: COLORS.textSecondary, fontSize: 13, fontStyle: 'italic' },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20, paddingTop: 56,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  closeBtn: { color: COLORS.textSecondary, fontSize: 20 },
  formScroll: { padding: 20, paddingBottom: 60 },
  label: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: 14, color: COLORS.white, borderWidth: 1,
    borderColor: COLORS.border, marginBottom: 14, fontSize: 15,
  },
  selectRow: { flexDirection: 'row', gap: 8 },
  selectChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  selectChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  selectText: { color: COLORS.textSecondary, fontSize: 13 },
  selectTextActive: { color: COLORS.background, fontWeight: '700' },
  emptyOption: { color: COLORS.textSecondary, fontSize: 13, padding: 10 },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: COLORS.background },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    padding: 18, alignItems: 'center', marginTop: 10,
  },
  saveBtnText: { color: COLORS.background, fontSize: 16, fontWeight: '800' },
});
