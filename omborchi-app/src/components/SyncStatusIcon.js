import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';
import { useApp } from '../context/AppContext';

export default function SyncStatusIcon() {
  const { isOnline } = useApp();
  return (
    <View style={styles.row}>
      <View style={[styles.dot, isOnline ? styles.online : styles.offline]} />
      <Text style={[styles.text, isOnline ? styles.textOnline : styles.textOffline]}>
        {isOnline ? 'Sinxron' : 'Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  online: { backgroundColor: COLORS.success },
  offline: { backgroundColor: COLORS.warning },
  text: { fontSize: 11 },
  textOnline: { color: COLORS.success },
  textOffline: { color: COLORS.warning },
});
