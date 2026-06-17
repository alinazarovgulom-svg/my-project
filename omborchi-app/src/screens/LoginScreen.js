import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Alert
} from 'react-native';
import { COLORS } from '../utils/constants';
import { useApp } from '../context/AppContext';

export default function LoginScreen() {
  const { setUser, setFamily } = useApp();
  const [tab, setTab] = useState('login'); // login | create
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  function generateFamilyCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const l = letters[Math.floor(Math.random() * letters.length)];
    const l2 = letters[Math.floor(Math.random() * letters.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${l}${l2}-${num}`;
  }

  async function handleLogin() {
    if (!login || !password) {
      Alert.alert('Xato', "Login va parolni kiriting");
      return;
    }
    setLoading(true);
    // Demo login
    setTimeout(() => {
      setUser({ id: '1', name: login, login, role: 'admin', photo: null });
      setFamily({ id: 'fam1', name: 'Demo Ombor', code: 'DM-1234' });
      setLoading(false);
    }, 800);
  }

  async function handleCreateFamily() {
    if (!familyName || !login || !password) {
      Alert.alert('Xato', "Barcha maydonlarni to'ldiring");
      return;
    }
    const code = generateFamilyCode();
    Alert.alert(
      'Oila yaratildi!',
      `Oila kodi: ${code}\nBu kodni saqlang — boshqa foydalanuvchilar shu kod bilan qo'shiladi.`,
      [{ text: 'OK', onPress: () => {
        setUser({ id: '1', name: login, login, role: 'admin', photo: null });
        setFamily({ id: 'fam1', name: familyName, code });
      }}]
    );
  }

  async function handleJoinFamily() {
    if (!familyCode || !login || !password) {
      Alert.alert('Xato', "Barcha maydonlarni to'ldiring");
      return;
    }
    // Demo join
    setUser({ id: '2', name: login, login, role: 'ishchi', photo: null });
    setFamily({ id: 'fam1', name: 'Demo Ombor', code: familyCode });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>OMBORCHI</Text>
        <Text style={styles.by}>by KAFTIMDA</Text>

        <View style={styles.tabs}>
          {['login', 'create', 'join'].map((t) => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'login' ? 'Kirish' : t === 'create' ? 'Oila yaratish' : "Qo'shilish"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.form}>
          {tab === 'create' && (
            <TextInput
              style={styles.input}
              placeholder="Oila nomi"
              placeholderTextColor={COLORS.textSecondary}
              value={familyName}
              onChangeText={setFamilyName}
            />
          )}
          {tab === 'join' && (
            <TextInput
              style={styles.input}
              placeholder="Oila kodi (masalan: TM-2847)"
              placeholderTextColor={COLORS.textSecondary}
              value={familyCode}
              onChangeText={setFamilyCode}
              autoCapitalize="characters"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Login"
            placeholderTextColor={COLORS.textSecondary}
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
          />
          <View style={styles.passRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Parol"
              placeholderTextColor={COLORS.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
              <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={tab === 'login' ? handleLogin : tab === 'create' ? handleCreateFamily : handleJoinFamily}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? 'Kutilmoqda...' : tab === 'login' ? 'Kirish' : tab === 'create' ? 'Yaratish' : "Qo'shilish"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { color: COLORS.primary, fontSize: 36, fontWeight: '800', letterSpacing: 4 },
  by: { color: COLORS.textSecondary, fontSize: 12, letterSpacing: 3, marginBottom: 40 },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, marginBottom: 24, padding: 4, width: '100%' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: COLORS.background },
  form: { width: '100%', gap: 12 },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    color: COLORS.white,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  eyeIcon: { fontSize: 18 },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: COLORS.background, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
});
