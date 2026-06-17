import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { COLORS } from '../utils/constants';
import { useApp } from '../context/AppContext';

function Avatar({ user, size = 32 }) {
  const initials = user.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
      <View style={[styles.dot, user.online ? styles.dotOnline : styles.dotOffline]} />
    </View>
  );
}

export default function OnlineUsersBar() {
  const { user, onlineUsers } = useApp();
  const [showAll, setShowAll] = useState(false);
  const allUsers = user ? [{ ...user, online: true }, ...onlineUsers.filter((u) => u.id !== user.id)] : onlineUsers;
  const visible = allUsers.slice(0, 3);
  const hidden = allUsers.length > 3 ? allUsers.length - 3 : 0;

  return (
    <View style={styles.container}>
      {visible.map((u, i) => (
        <View key={u.id} style={[styles.avatarWrap, { marginLeft: i > 0 ? -10 : 0 }]}>
          <Avatar user={u} size={32} />
        </View>
      ))}
      {hidden > 0 && (
        <TouchableOpacity style={styles.more} onPress={() => setShowAll(true)}>
          <Text style={styles.moreText}>+{hidden}</Text>
        </TouchableOpacity>
      )}
      <Modal visible={showAll} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} onPress={() => setShowAll(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Foydalanuvchilar</Text>
            <FlatList
              data={allUsers}
              keyExtractor={(u) => u.id}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <Avatar user={item} size={40} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={[styles.userStatus, item.online ? styles.online : styles.offline]}>
                      {item.online ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                </View>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: {},
  avatar: {
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  avatarText: { color: COLORS.primary, fontWeight: '700' },
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  dotOnline: { backgroundColor: COLORS.success },
  dotOffline: { backgroundColor: COLORS.textSecondary },
  more: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  moreText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: COLORS.secondary, borderRadius: 16, padding: 20, width: 280, maxHeight: 400 },
  modalTitle: { color: COLORS.primary, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  userInfo: {},
  userName: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  userStatus: { fontSize: 12, marginTop: 2 },
  online: { color: COLORS.success },
  offline: { color: COLORS.textSecondary },
});
