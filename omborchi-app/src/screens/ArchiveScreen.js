import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { COLORS } from '../utils/constants';
import { useApp } from '../context/AppContext';

export default function ArchiveScreen() {
  const { archivedItems, restoreItem } = useApp();

  function daysLeft(expiresAt) {
    const diff = new Date(expiresAt) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  function handleRestore(item) {
    Alert.alert('Qaytarish', `"${item.name}" qaytarilsinmi?`, [
      { text: 'Bekor', style: 'cancel' },
      { text: 'Qaytarish', onPress: () => restoreItem(item.id) },
    ]);
  }

  const typeLabels = {
    rawMaterial: '📦 Xomashyo',
    supplier: '🏢 Yetkazib beruvchi',
    customer: '👤 Xaridor',
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        O'chirilgan ma'lumotlar 30 kun saqlanadi. Faqat qaytarish mumkin.
      </Text>
      <FlatList
        data={archivedItems}
        keyExtractor={(i) => i.id + i._deletedAt}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 60 }}>
            <Text style={{ fontSize: 48 }}>🗂️</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 12, fontSize: 15 }}>Arxiv bo'sh</Text>
          </View>
        }
        renderItem={({ item }) => {
          const days = daysLeft(item._expiresAt);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.type}>{typeLabels[item._type] || '📄'}</Text>
                <View style={[styles.daysBadge, days <= 7 ? styles.daysLow : styles.daysOk]}>
                  <Text style={styles.daysText}>{days} kun qoldi</Text>
                </View>
              </View>
              <Text style={styles.name}>{item.name}</Text>
              {item.code ? <Text style={styles.sub}>Kod: {item.code}</Text> : null}
              {item.phone ? <Text style={styles.sub}>📞 {item.phone}</Text> : null}
              <Text style={styles.deletedAt}>
                O'chirilgan: {new Date(item._deletedAt).toLocaleDateString('uz')}
              </Text>
              <TouchableOpacity style={styles.restoreBtn} onPress={() => handleRestore(item)}>
                <Text style={styles.restoreBtnText}>↩️ Qaytarish</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hint: {
    margin: 16, color: COLORS.textSecondary, fontSize: 13,
    backgroundColor: COLORS.card, borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: COLORS.warning,
  },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, gap: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontSize: 13, color: COLORS.textSecondary },
  daysBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  daysOk: { backgroundColor: '#1a3a1a' },
  daysLow: { backgroundColor: '#3a0000' },
  daysText: { fontSize: 12, color: COLORS.white, fontWeight: '600' },
  name: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  sub: { color: COLORS.textSecondary, fontSize: 13 },
  deletedAt: { color: COLORS.textSecondary, fontSize: 12 },
  restoreBtn: {
    backgroundColor: COLORS.secondary, borderRadius: 10,
    padding: 10, alignItems: 'center', marginTop: 4,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  restoreBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
});
