import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, Alert
} from 'react-native';
import { COLORS, ROLES, ROLE_LABELS } from '../utils/constants';
import { useApp } from '../context/AppContext';

let idCounter = 600;
function newId() { return String(++idCounter); }

const ROLE_OPTIONS = [ROLES.ADMIN, ROLES.ISHCHI, ROLES.TOMOSHABIN];

export default function UsersScreen() {
  const { user } = useApp();
  const [users, setUsers] = useState([
    { id: user?.id || '1', name: user?.name || 'Admin', login: user?.login || 'admin', role: ROLES.ADMIN, online: true },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [showRoleModal, setShowRoleModal] = useState(null);

  function defaultForm() {
    return { name: '', login: '', password: '', role: ROLES.ISHCHI };
  }

  function openAdd() { setEditItem(null); setForm(defaultForm()); setShowForm(true); }
  function openEdit(item) {
    setEditItem(item);
    setForm({ name: item.name, login: item.login, password: '', role: item.role });
    setShowForm(true);
  }

  function saveForm() {
    if (!form.name.trim()) { Alert.alert('Xato', 'Ism kiriting'); return; }
    if (!form.login.trim()) { Alert.alert('Xato', 'Login kiriting'); return; }
    if (!editItem && !form.password.trim()) { Alert.alert('Xato', 'Parol kiriting'); return; }
    if (editItem) {
      setUsers((prev) => prev.map((u) => u.id === editItem.id ? { ...u, name: form.name, login: form.login, role: form.role } : u));
    } else {
      setUsers((prev) => [...prev, { id: newId(), name: form.name, login: form.login, role: form.role, online: false }]);
    }
    setShowForm(false);
  }

  function changeRole(userId, newRole) {
    if (userId === user?.id) { Alert.alert("O'zingizning rolini o'zgartira olmaysiz"); return; }
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    setShowRoleModal(null);
  }

  const roleColors = {
    [ROLES.ADMIN]: COLORS.primary,
    [ROLES.ISHCHI]: COLORS.success,
    [ROLES.TOMOSHABIN]: COLORS.textSecondary,
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Yangi foydalanuvchi</Text>
      </TouchableOpacity>

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</Text>
              </View>
              <View style={[styles.onlineDot, item.online ? styles.online : styles.offline]} />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.login}>@{item.login}</Text>
              <TouchableOpacity
                style={[styles.roleBadge, { backgroundColor: roleColors[item.role] + '22', borderColor: roleColors[item.role] }]}
                onPress={() => item.id !== user?.id && setShowRoleModal(item)}
              >
                <Text style={[styles.roleText, { color: roleColors[item.role] }]}>
                  {ROLE_LABELS[item.role]} {item.id !== user?.id ? '▼' : ''}
                </Text>
              </TouchableOpacity>
            </View>
            {item.id !== user?.id && (
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* Add/Edit Modal */}
      <Modal visible={showForm} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editItem ? 'Tahrirlash' : 'Yangi foydalanuvchi'}</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formScroll}>
            <Text style={styles.label}>Ism Familiya</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholderTextColor={COLORS.textSecondary} />
            <Text style={styles.label}>Login</Text>
            <TextInput style={styles.input} value={form.login} onChangeText={(v) => setForm((f) => ({ ...f, login: v }))} autoCapitalize="none" placeholderTextColor={COLORS.textSecondary} />
            {!editItem && (
              <>
                <Text style={styles.label}>Parol</Text>
                <TextInput style={styles.input} value={form.password} onChangeText={(v) => setForm((f) => ({ ...f, password: v }))} secureTextEntry placeholderTextColor={COLORS.textSecondary} />
              </>
            )}
            <Text style={styles.label}>Rol</Text>
            <View style={styles.rolesRow}>
              {ROLE_OPTIONS.map((r) => (
                <TouchableOpacity key={r} style={[styles.roleChip, form.role === r && { backgroundColor: roleColors[r], borderColor: roleColors[r] }]} onPress={() => setForm((f) => ({ ...f, role: r }))}>
                  <Text style={[styles.roleChipText, form.role === r && { color: COLORS.background }]}>{ROLE_LABELS[r]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveForm}>
              <Text style={styles.saveBtnText}>Saqlash</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Role change modal */}
      <Modal visible={!!showRoleModal} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowRoleModal(null)}>
          <View style={styles.roleSheet}>
            <Text style={styles.sheetTitle}>Rol o'zgartirish</Text>
            <Text style={styles.sheetSub}>{showRoleModal?.name}</Text>
            {ROLE_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleOption, showRoleModal?.role === r && styles.roleOptionActive]}
                onPress={() => changeRole(showRoleModal?.id, r)}
              >
                <Text style={[styles.roleOptionText, { color: roleColors[r] }]}>{ROLE_LABELS[r]}</Text>
                {showRoleModal?.role === r && <Text style={{ color: COLORS.primary }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  addBtn: { margin: 16, backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  addBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 15 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: COLORS.card },
  online: { backgroundColor: COLORS.success },
  offline: { backgroundColor: COLORS.textSecondary },
  info: { flex: 1, gap: 4 },
  name: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  login: { color: COLORS.textSecondary, fontSize: 12 },
  roleBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, marginTop: 4 },
  roleText: { fontSize: 12, fontWeight: '700' },
  editBtn: { padding: 8 },
  editIcon: { fontSize: 18 },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  closeBtn: { color: COLORS.textSecondary, fontSize: 20 },
  formScroll: { padding: 20, paddingBottom: 60 },
  label: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, color: COLORS.white, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, fontSize: 15 },
  rolesRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleChip: { flex: 1, padding: 12, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  roleChipText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: COLORS.background, fontSize: 16, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center' },
  roleSheet: { backgroundColor: COLORS.secondary, borderRadius: 20, padding: 24, width: 300, gap: 4 },
  sheetTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  sheetSub: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 16 },
  roleOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12 },
  roleOptionActive: { backgroundColor: COLORS.card },
  roleOptionText: { fontSize: 15, fontWeight: '600' },
});
