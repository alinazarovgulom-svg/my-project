import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../utils/constants';
import { useApp } from '../context/AppContext';
import { OUTGOING_TYPES } from '../utils/constants';

const FILTERS = ['Bugun', 'Hafta', 'Oy', 'Hammasi'];

export default function ReportsScreen() {
  const { rawMaterials, incomings, outgoings, suppliers, customers } = useApp();
  const [filter, setFilter] = useState('Oy');

  function filterByDate(items) {
    const now = new Date();
    return items.filter((i) => {
      const d = new Date(i.date || i.createdAt);
      if (filter === 'Bugun') return d.toDateString() === now.toDateString();
      if (filter === 'Hafta') return (now - d) <= 7 * 24 * 3600000;
      if (filter === 'Oy') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  }

  const filteredIncomings = filterByDate(incomings);
  const filteredOutgoings = filterByDate(outgoings);

  const totalIncoming = filteredIncomings.reduce((s, i) => s + (i.price * i.qty || 0), 0);
  const totalOutgoing = filteredOutgoings.reduce((s, o) => s + (o.cost || 0), 0);
  const ownProduction = filteredOutgoings.filter((o) => o.type === OUTGOING_TYPES.OWN).length;
  const customerSales = filteredOutgoings.filter((o) => o.type === OUTGOING_TYPES.CUSTOMER).length;
  const reprocess = filteredOutgoings.filter((o) => o.type === OUTGOING_TYPES.REPROCESS).length;

  // Top materials by outgoing
  const materialStats = rawMaterials.map((m) => {
    const outs = filteredOutgoings.filter((o) => o.materialId === m.id);
    const totalQty = outs.reduce((s, o) => s + o.qty, 0);
    return { ...m, totalQty };
  }).sort((a, b) => b.totalQty - a.totalQty).slice(0, 5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <StatCard icon="📥" label="Kirim" value={filteredIncomings.length + ' ta'} sub={totalIncoming.toLocaleString() + " so'm"} color={COLORS.success} />
        <StatCard icon="📤" label="Chiqim" value={filteredOutgoings.length + ' ta'} sub={totalOutgoing.toLocaleString() + " so'm"} color={COLORS.warning} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chiqim turlari</Text>
        <OutRow label="O'z ishlab chiqarish" count={ownProduction} color={COLORS.success} />
        <OutRow label="Oddiy chiqim" count={customerSales} color={COLORS.primary} />
        <OutRow label="Qayta ishlab chiqarish" count={reprocess} color={COLORS.warning} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Umumiy holat</Text>
        <InfoRow label="Jami xomashyo" value={rawMaterials.length + ' tur'} />
        <InfoRow label="Yetkazib beruvchilar" value={suppliers.length + ' ta'} />
        <InfoRow label="Xaridorlar" value={customers.length + ' ta'} />
        <InfoRow
          label="Kam qolgan"
          value={rawMaterials.filter((m) => (m.currentQty || 0) <= (m.minQty || 0)).length + ' tur'}
          valueColor={COLORS.warning}
        />
        <InfoRow
          label="Tugagan"
          value={rawMaterials.filter((m) => (m.currentQty || 0) <= 0).length + ' tur'}
          valueColor={COLORS.danger}
        />
      </View>

      {materialStats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ko'p chiqirilgan xomashyo</Text>
          {materialStats.map((m, i) => (
            <View key={m.id} style={styles.rankRow}>
              <Text style={styles.rankNum}>#{i + 1}</Text>
              <Text style={styles.rankName}>{m.name}</Text>
              <Text style={styles.rankVal}>{m.totalQty} {m.unit}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <View style={[styles.statCard, { borderColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function OutRow({ label, count, color }) {
  return (
    <View style={styles.outRow}>
      <View style={[styles.outDot, { backgroundColor: color }]} />
      <Text style={styles.outLabel}>{label}</Text>
      <Text style={[styles.outCount, { color }]}>{count} ta</Text>
    </View>
  );
}

function InfoRow({ label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: COLORS.background },
  row: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, gap: 4 },
  statIcon: { fontSize: 24 },
  statLabel: { color: COLORS.textSecondary, fontSize: 12 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statSub: { color: COLORS.textSecondary, fontSize: 11 },
  section: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 16, gap: 8 },
  sectionTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  outRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  outDot: { width: 10, height: 10, borderRadius: 5 },
  outLabel: { flex: 1, color: COLORS.textSecondary, fontSize: 14 },
  outCount: { fontWeight: '700', fontSize: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { color: COLORS.textSecondary, fontSize: 14 },
  infoValue: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rankNum: { color: COLORS.primary, fontWeight: '800', width: 28, fontSize: 15 },
  rankName: { flex: 1, color: COLORS.white, fontSize: 14 },
  rankVal: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
});
