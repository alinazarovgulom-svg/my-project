import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, Alert
} from 'react-native';
import { COLORS, CURRENCIES, ROLES, OUTGOING_TYPES, OUTGOING_TYPE_LABELS } from '../utils/constants';
import { useApp } from '../context/AppContext';
import { calculateFIFOCost, updateBatchesAfterOutgoing } from '../utils/fifo';

let idCounter = 300;
function newId() { return String(++idCounter); }

export default function OutgoingScreen() {
  const { rawMaterials, setRawMaterials, customers, outgoings, setOutgoings, user } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const isViewer = user?.role === ROLES.TOMOSHABIN;

  function defaultForm() {
    return {
      type: OUTGOING_TYPES.OWN,
      materialId: '',
      qty: '',
      customerId: '',
      reprocessMaterialId: '',
      reprocessQty: '',
      serviceFee: '',
      currency: "So'm",
      notes: '',
    };
  }

  function getAutoPrice() {
    if (!form.materialId || !form.qty) return 0;
    const mat = rawMaterials.find((m) => m.id === form.materialId);
    if (!mat) return 0;
    const { totalCost } = calculateFIFOCost(mat.batches || [], Number(form.qty));
    return totalCost;
  }

  function saveForm() {
    if (!form.materialId) { Alert.alert('Xato', 'Xomashyo tanlang'); return; }
    const qty = Number(form.qty);
    if (!qty || qty <= 0) { Alert.alert('Xato', 'Miqdorni kiriting'); return; }

    const mat = rawMaterials.find((m) => m.id === form.materialId);
    if (!mat || (mat.currentQty || 0) < qty) {
      Alert.alert('Xato', "Yetarli xomashyo yo'q");
      return;
    }

    if (form.type === OUTGOING_TYPES.CUSTOMER && !form.customerId) {
      Alert.alert('Xato', 'Xaridor tanlang'); return;
    }
    if (form.type === OUTGOING_TYPES.REPROCESS) {
      if (!form.customerId) { Alert.alert('Xato', 'Ijrochi tanlang'); return; }
      if (!form.reprocessMaterialId) { Alert.alert('Xato', 'Qaytib keladigan xomashyoni tanlang'); return; }
    }

    const { totalCost, usedBatches } = calculateFIFOCost(mat.batches || [], qty);
    const updatedBatches = updateBatchesAfterOutgoing(mat.batches || [], usedBatches);

    setRawMaterials((prev) =>
      prev.map((m) => {
        if (m.id === form.materialId) {
          return { ...m, currentQty: m.currentQty - qty, batches: updatedBatches };
        }
        // Qayta ishlab chiqarishda qaytib keladi
        if (form.type === OUTGOING_TYPES.REPROCESS && m.id === form.reprocessMaterialId) {
          const reQty = Number(form.reprocessQty) || 0;
          return { ...m, currentQty: (m.currentQty || 0) + reQty };
        }
        return m;
      })
    );

    setOutgoings((prev) => [{
      id: newId(),
      type: form.type,
      materialId: form.materialId,
      materialName: mat.name,
      qty,
      customerId: form.customerId,
      customerName: customers.find((c) => c.id === form.customerId)?.name,
      cost: totalCost,
      reprocessMaterialId: form.reprocessMaterialId,
      reprocessQty: Number(form.reprocessQty) || 0,
      serviceFee: Number(form.serviceFee) || 0,
      currency: form.currency,
      notes: form.notes,
      date: new Date().toISOString(),
      createdBy: user?.id,
    }, ...prev]);

    setForm(defaultForm());
    setShowForm(false);
  }

  const typeColors = {
    [OUTGOING_TYPES.OWN]: '#1a3a2a',
    [OUTGOING_TYPES.CUSTOMER]: '#1a1a3a',
    [OUTGOING_TYPES.REPROCESS]: '#3a2a1a',
  };

  return (
    <View style={styles.container}>
      {!isViewer && (
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addBtnText}>+ Yangi chiqim</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={outgoings}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={{ alignItems: 'center', padding: 60 }}><Text style={{ fontSize: 48 }}>📤</Text><Text style={{ color: COLORS.textSecondary, marginTop: 12, fontSize: 15 }}>Chiqimlar yo'q</Text></View>}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: typeColors[item.type] || COLORS.card }]}>
            <View style={styles.cardTop}>
              <Text style={styles.typeBadge}>{OUTGOING_TYPE_LABELS[item.type]}</Text>
              <Text style={styles.date}>{new Date(item.date).toLocaleDateString('uz')}</Text>
            </View>
            <Text style={styles.materialName}>{item.materialName}</Text>
            <View style={styles.cardRow}>
              <Info label="Miqdor" value={`${item.qty}`} />
              <Info label="Narx (FIFO)" value={`${item.cost?.toLocaleString()} so'm`} />
              {item.serviceFee > 0 && <Info label="Xizmat" value={`${item.serviceFee?.toLocaleString()} ${item.currency}`} />}
            </View>
            {item.customerName && <Text style={styles.customer}>👤 {item.customerName}</Text>}
          </View>
        )}
      />

      <Modal visible={showForm} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yangi chiqim</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formScroll}>
            <Text style={styles.label}>Chiqim turi</Text>
            <View style={styles.typesRow}>
              {Object.entries(OUTGOING_TYPE_LABELS).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.typeChip, form.type === key && styles.typeChipActive]}
                  onPress={() => setForm((f) => ({ ...f, type: key }))}
                >
                  <Text style={[styles.typeText, form.type === key && styles.typeTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <SelectField
              label="Xomashyo *"
              options={rawMaterials.map((m) => ({ id: m.id, label: `${m.name} (qoldiq: ${m.currentQty || 0} ${m.unit})` }))}
              value={form.materialId}
              onChange={(v) => setForm((f) => ({ ...f, materialId: v }))}
            />
            <FormInput label="Miqdori *" value={form.qty} onChange={(v) => setForm((f) => ({ ...f, qty: v }))} keyboardType="numeric" />

            {form.materialId && form.qty ? (
              <View style={styles.autoPrice}>
                <Text style={styles.autoPriceLabel}>FIFO narxi (avtomatik):</Text>
                <Text style={styles.autoPriceValue}>{getAutoPrice().toLocaleString()} so'm</Text>
              </View>
            ) : null}

            {(form.type === OUTGOING_TYPES.CUSTOMER || form.type === OUTGOING_TYPES.REPROCESS) && (
              <SelectField
                label={form.type === OUTGOING_TYPES.REPROCESS ? 'Ijrochi *' : 'Xaridor *'}
                options={customers.map((c) => ({ id: c.id, label: c.name }))}
                value={form.customerId}
                onChange={(v) => setForm((f) => ({ ...f, customerId: v }))}
                empty="Xaridor yo'q"
              />
            )}

            {form.type === OUTGOING_TYPES.REPROCESS && (
              <>
                <SelectField
                  label="Qaytib keladigan xomashyo *"
                  options={rawMaterials.map((m) => ({ id: m.id, label: m.name }))}
                  value={form.reprocessMaterialId}
                  onChange={(v) => setForm((f) => ({ ...f, reprocessMaterialId: v }))}
                />
                <FormInput label="Qaytib keladigan miqdor" value={form.reprocessQty} onChange={(v) => setForm((f) => ({ ...f, reprocessQty: v }))} keyboardType="numeric" />
                <Text style={styles.label}>Valyuta (xizmat haqqи)</Text>
                <View style={styles.chipsRow}>
                  {CURRENCIES.map((c) => (
                    <TouchableOpacity key={c} style={[styles.chip, form.currency === c && styles.chipActive]} onPress={() => setForm((f) => ({ ...f, currency: c }))}>
                      <Text style={[styles.chipText, form.currency === c && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <FormInput label="Xizmat haqqi" value={form.serviceFee} onChange={(v) => setForm((f) => ({ ...f, serviceFee: v }))} keyboardType="numeric" />
              </>
            )}

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
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {options.length === 0
            ? <Text style={{ color: COLORS.textSecondary, padding: 10 }}>{empty || "Ma'lumot yo'q"}</Text>
            : options.map((o) => (
                <TouchableOpacity key={o.id} style={[styles.selectChip, value === o.id && styles.selectChipActive]} onPress={() => onChange(o.id)}>
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
      <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  addBtn: { margin: 16, backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  addBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 15 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { borderRadius: 14, padding: 14, marginBottom: 10, gap: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  typeBadge: { color: COLORS.primary, fontSize: 12, fontWeight: '700', backgroundColor: 'rgba(226,185,111,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  date: { color: COLORS.textSecondary, fontSize: 12 },
  materialName: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  cardRow: { flexDirection: 'row', gap: 24 },
  customer: { color: COLORS.textSecondary, fontSize: 13 },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  closeBtn: { color: COLORS.textSecondary, fontSize: 20 },
  formScroll: { padding: 20, paddingBottom: 60 },
  label: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, color: COLORS.white, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, fontSize: 15 },
  typesRow: { gap: 8, marginBottom: 14 },
  typeChip: { padding: 12, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeText: { color: COLORS.textSecondary, fontWeight: '600' },
  typeTextActive: { color: COLORS.background },
  autoPrice: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.secondary, borderRadius: 10, padding: 12, marginBottom: 14, alignItems: 'center' },
  autoPriceLabel: { color: COLORS.textSecondary, fontSize: 13 },
  autoPriceValue: { color: COLORS.primary, fontSize: 16, fontWeight: '800' },
  selectChip: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  selectChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  selectText: { color: COLORS.textSecondary, fontSize: 13 },
  selectTextActive: { color: COLORS.background, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: COLORS.background },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: COLORS.background, fontSize: 16, fontWeight: '800' },
});
