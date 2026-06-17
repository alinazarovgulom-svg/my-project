import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../utils/constants';
import { useApp } from '../context/AppContext';
import StockStatusBadge, { getStockStatus } from '../components/StockStatusBadge';
import { STOCK_STATUS } from '../utils/constants';

export default function HomeScreen({ navigation }) {
  const { rawMaterials, incomings, outgoings, user } = useApp();

  const alerts = rawMaterials.filter(
    (m) => getStockStatus(m.currentQty ?? 0, m.minQty ?? 0) !== STOCK_STATUS.OK
  );

  const todayIncomings = incomings.filter(
    (i) => new Date(i.date).toDateString() === new Date().toDateString()
  );
  const todayOutgoings = outgoings.filter(
    (o) => new Date(o.date).toDateString() === new Date().toDateString()
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Xush kelibsiz, {user?.name} 👋</Text>

      <View style={styles.statsRow}>
        <StatCard label="Xomashyo" value={rawMaterials.length} icon="📦" color={COLORS.primary} />
        <StatCard label="Bugun kirim" value={todayIncomings.length} icon="📥" color={COLORS.success} />
        <StatCard label="Bugun chiqim" value={todayOutgoings.length} icon="📤" color={COLORS.warning} />
      </View>

      {alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Ogohlantirishlar ({alerts.length})</Text>
          {alerts.map((m) => (
            <View key={m.id} style={styles.alertCard}>
              <Text style={styles.alertName}>{m.name}</Text>
              <StockStatusBadge current={m.currentQty ?? 0} minimum={m.minQty ?? 0} unit={m.unit} />
              <Text style={styles.alertMin}>Minimal: {m.minQty} {m.unit}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tezkor amallar</Text>
        <View style={styles.actionsRow}>
          <QuickAction label="Kirim" icon="📥" onPress={() => navigation.navigate('Kirim')} />
          <QuickAction label="Chiqim" icon="📤" onPress={() => navigation.navigate('Chiqim')} />
          <QuickAction label="Xomashyo" icon="📦" onPress={() => navigation.navigate('Xomashyo')} />
          <QuickAction label="Hisobot" icon="📊" onPress={() => navigation.navigate('Hisobot')} />
        </View>
      </View>

      {rawMaterials.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏭</Text>
          <Text style={styles.emptyTitle}>Omborchi tayyor!</Text>
          <Text style={styles.emptyText}>Boshlash uchun xomashyo qo'shing</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Xomashyo')}>
            <Text style={styles.emptyBtnText}>Xomashyo qo'shish</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <View style={[styles.statCard, { borderColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ label, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  greeting: { color: COLORS.white, fontSize: 20, fontWeight: '700', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14,
    padding: 14, alignItems: 'center', borderWidth: 1,
  },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  alertCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12, padding: 14, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: COLORS.warning,
  },
  alertName: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginBottom: 6 },
  alertMin: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14,
    padding: 16, alignItems: 'center', gap: 6,
  },
  actionIcon: { fontSize: 24 },
  actionLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { color: COLORS.white, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 20 },
  emptyBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 15 },
});
