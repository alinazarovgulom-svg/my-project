import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, STOCK_STATUS } from '../utils/constants';

export function getStockStatus(current, minimum) {
  if (current <= 0) return STOCK_STATUS.EMPTY;
  if (current <= minimum) return STOCK_STATUS.LOW;
  return STOCK_STATUS.OK;
}

export default function StockStatusBadge({ current, minimum, unit }) {
  const status = getStockStatus(current, minimum);
  const config = {
    [STOCK_STATUS.OK]: { color: COLORS.success, label: 'Yetarli', bg: '#1a3a1a' },
    [STOCK_STATUS.LOW]: { color: COLORS.warning, label: 'Kam', bg: '#3a3000' },
    [STOCK_STATUS.EMPTY]: { color: COLORS.danger, label: 'Tugagan', bg: '#3a0000' },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>
        {current} {unit} · {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '600' },
});
