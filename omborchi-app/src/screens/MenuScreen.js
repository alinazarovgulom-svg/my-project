import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { COLORS, ROLES, ROLE_LABELS } from '../utils/constants';
import { useApp } from '../context/AppContext';

export default function MenuScreen({ navigation }) {
  const { user, setUser, setFamily } = useApp();
  const isAdmin = user?.role === ROLES.ADMIN;

  function handleLogout() {
    Alert.alert('Chiqish', 'Tizimdan chiqmoqchimisiz?', [
      { text: 'Bekor', style: 'cancel' },
      { text: 'Chiqish', style: 'destructive', onPress: () => { setUser(null); setFamily(null); } },
    ]);
  }

  const items = [
    { icon: '👤', label: 'Profil', screen: 'Profile' },
    { icon: '🏢', label: 'Yetkazib beruvchilar', screen: 'Suppliers' },
    { icon: '👥', label: 'Xaridorlar', screen: 'Customers' },
    { icon: '📊', label: 'Hisobot', screen: 'Reports' },
    ...(isAdmin ? [
      { icon: '👨‍💼', label: 'Foydalanuvchilar', screen: 'Users' },
      { icon: '🗂️', label: 'Arxiv', screen: 'Archive' },
    ] : []),
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'}
          </Text>
        </View>
        <View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>{ROLE_LABELS[user?.role] || ''}</Text>
        </View>
      </View>

      <View style={styles.menuList}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Tizimdan chiqish</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 60 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 20,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.primary,
  },
  avatarText: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  userName: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  userRole: { color: COLORS.primary, fontSize: 13, marginTop: 2 },
  menuList: { backgroundColor: COLORS.card, borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  menuIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  menuLabel: { flex: 1, color: COLORS.white, fontSize: 15, fontWeight: '500' },
  menuArrow: { color: COLORS.textSecondary, fontSize: 20 },
  logoutBtn: {
    backgroundColor: COLORS.secondary, borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.danger,
  },
  logoutText: { color: COLORS.danger, fontSize: 15, fontWeight: '700' },
});
