import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, Alert, Image
} from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, UNITS, ROLES } from '../utils/constants';
import { useApp } from '../context/AppContext';
import StockStatusBadge from '../components/StockStatusBadge';

let idCounter = 100;
function newId() { return String(++idCounter); }

export default function RawMaterialsScreen() {
  const { rawMaterials, setRawMaterials, user, archiveItem } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const isAdmin = user?.role === ROLES.ADMIN;

  function defaultForm() {
    return { name: '', code: '', unit: 'dona', hashtags: '', minQty: '', notes: '', photo: null };
  }

  function openAdd() {
    setEditItem(null);
    setForm(defaultForm());
    setShowForm(true);
  }

  function openEdit(item) {
    setEditItem(item);
    setForm({
      name: item.name,
      code: item.code,
      unit: item.unit,
      hashtags: (item.hashtags || []).join(' '),
      minQty: String(item.minQty || ''),
      notes: item.notes || '',
      photo: item.photo || null,
    });
    setShowForm(true);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setForm((f) => ({ ...f, photo: result.assets[0].uri }));
  }

  async function takePhoto() {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setForm((f) => ({ ...f, photo: result.assets[0].uri }));
  }

  function saveForm() {
    if (!form.name.trim()) { Alert.alert('Xato', 'Nom kiriting'); return; }
    if (!form.code.trim()) { Alert.alert('Xato', 'Kod kiriting'); return; }
    const hashtags = form.hashtags.match(/#\w+/g) || [];
    if (editItem) {
      setRawMaterials((prev) =>
        prev.map((m) => m.id === editItem.id ? { ...m, ...form, hashtags, minQty: Number(form.minQty) || 0 } : m)
      );
    } else {
      setRawMaterials((prev) => [...prev, {
        id: newId(),
        ...form,
        hashtags,
        minQty: Number(form.minQty) || 0,
        currentQty: 0,
        batches: [],
        createdAt: new Date().toISOString(),
      }]);
    }
    setShowForm(false);
  }

  function deleteItem(item) {
    Alert.alert(
      "O'chirish",
      `"${item.name}" 30 kun arxivda saqlanadi. Davom etasizmi?`,
      [
        { text: 'Bekor', style: 'cancel' },
        { text: "O'chirish", style: 'destructive', onPress: () => {
          archiveItem(item, 'rawMaterial');
          setRawMaterials((prev) => prev.filter((m) => m.id !== item.id));
        }},
      ]
    );
  }

  const filtered = rawMaterials.filter((m) => {
    const q = search.toLowerCase();
    if (!q) return true;
    if (m.name.toLowerCase().includes(q)) return true;
    if (m.code.toLowerCase().includes(q)) return true;
    if (q.startsWith('#')) {
      return (m.hashtags || []).some((h) => h.toLowerCase().includes(q));
    }
    return (m.hashtags || []).some((h) => h.toLowerCase().includes(q));
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Qidirish... (#metall, nom, kod)"
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {isAdmin ? (
        <SwipeListView
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <MaterialCard item={item} />}
          renderHiddenItem={({ item }) => (
            <View style={styles.hiddenRow}>
              <TouchableOpacity style={styles.deleteAction} onPress={() => deleteItem(item)}>
                <Text style={styles.actionIcon}>🗑️</Text>
                <Text style={styles.actionText}>O'chirish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editAction} onPress={() => openEdit(item)}>
                <Text style={styles.actionIcon}>✏️</Text>
                <Text style={styles.actionText}>Tahrirlash</Text>
              </TouchableOpacity>
            </View>
          )}
          leftOpenValue={80}
          rightOpenValue={-80}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <MaterialCard item={item} />}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal visible={showForm} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editItem ? 'Tahrirlash' : "Yangi xomashyo"}</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formScroll}>
            <TouchableOpacity style={styles.photoBox} onPress={pickImage} onLongPress={takePhoto}>
              {form.photo
                ? <Image source={{ uri: form.photo }} style={styles.photo} />
                : <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoIcon}>📷</Text>
                    <Text style={styles.photoHint}>Bosing — galereya{'\n'}Uzun bosing — kamera</Text>
                  </View>
              }
            </TouchableOpacity>
            <FormInput label="Xomashyo nomi *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            <FormInput label="Kodi *" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="TT-001" />
            <Text style={styles.label}>Birligi</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={styles.unitsRow}>
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, form.unit === u && styles.unitChipActive]}
                    onPress={() => setForm((f) => ({ ...f, unit: u }))}
                  >
                    <Text style={[styles.unitText, form.unit === u && styles.unitTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <FormInput label="Hashteglar" value={form.hashtags} onChange={(v) => setForm((f) => ({ ...f, hashtags: v }))} placeholder="#metall #qurilish" />
            <FormInput label="Minimal miqdor" value={form.minQty} onChange={(v) => setForm((f) => ({ ...f, minQty: v }))} keyboardType="numeric" />
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

function MaterialCard({ item }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        {item.photo
          ? <Image source={{ uri: item.photo }} style={styles.cardPhoto} />
          : <View style={styles.cardPhotoPlaceholder}><Text style={{ fontSize: 20 }}>📦</Text></View>
        }
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardCode}>{item.code}</Text>
        <StockStatusBadge current={item.currentQty ?? 0} minimum={item.minQty ?? 0} unit={item.unit} />
        {(item.hashtags || []).length > 0 && (
          <View style={styles.tags}>
            {item.hashtags.map((h, i) => (
              <Text key={i} style={styles.tag}>{h}</Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function FormInput({ label, value, onChange, placeholder, keyboardType, multiline }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || ''}
        placeholderTextColor={COLORS.textSecondary}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchRow: { flexDirection: 'row', padding: 16, gap: 10 },
  search: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12,
    padding: 12, color: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  addBtn: {
    width: 48, height: 48, backgroundColor: COLORS.primary,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: COLORS.background, fontSize: 24, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row', backgroundColor: COLORS.card,
    borderRadius: 14, padding: 14, marginBottom: 10, gap: 12,
  },
  cardLeft: {},
  cardPhoto: { width: 60, height: 60, borderRadius: 10 },
  cardPhotoPlaceholder: {
    width: 60, height: 60, borderRadius: 10,
    backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  cardName: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  cardCode: { color: COLORS.textSecondary, fontSize: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tag: { backgroundColor: COLORS.secondary, color: COLORS.primary, fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  hiddenRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10, borderRadius: 14, overflow: 'hidden',
    height: '100%',
  },
  deleteAction: {
    backgroundColor: COLORS.danger, flex: 1, height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  editAction: {
    backgroundColor: COLORS.warning, flex: 1, height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  actionIcon: { fontSize: 20 },
  actionText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20, paddingTop: 56,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  closeBtn: { color: COLORS.textSecondary, fontSize: 20 },
  formScroll: { padding: 20, paddingBottom: 60 },
  photoBox: { alignItems: 'center', marginBottom: 20 },
  photo: { width: 120, height: 120, borderRadius: 16 },
  photoPlaceholder: {
    width: 120, height: 120, borderRadius: 16,
    backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  photoIcon: { fontSize: 32 },
  photoHint: { color: COLORS.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 4 },
  label: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: 14, color: COLORS.white, borderWidth: 1,
    borderColor: COLORS.border, marginBottom: 14, fontSize: 15,
  },
  unitsRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  unitChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  unitChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  unitText: { color: COLORS.textSecondary, fontWeight: '600' },
  unitTextActive: { color: COLORS.background },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    padding: 18, alignItems: 'center', marginTop: 10,
  },
  saveBtnText: { color: COLORS.background, fontSize: 16, fontWeight: '800' },
});
