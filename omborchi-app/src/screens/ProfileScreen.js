import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Image, Switch
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { COLORS, ROLE_LABELS } from '../utils/constants';
import { useApp } from '../context/AppContext';

export default function ProfileScreen() {
  const { user, setUser, savePinCode, pinCode, biometricEnabled, toggleBiometric, appLockEnabled } = useApp();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState('new'); // new | confirm

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setUser((prev) => ({ ...prev, photo: result.assets[0].uri }));
    }
  }

  async function takePhoto() {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setUser((prev) => ({ ...prev, photo: result.assets[0].uri }));
    }
  }

  function handlePinDigit(digit) {
    if (step === 'new') {
      const p = newPin + digit;
      setNewPin(p);
      if (p.length === 4) setStep('confirm');
    } else {
      const p = confirmPin + digit;
      setConfirmPin(p);
      if (p.length === 4) {
        if (p === newPin) {
          savePinCode(p);
          Alert.alert('', "PIN kod saqlandi!");
          setShowPinSetup(false);
          setNewPin('');
          setConfirmPin('');
          setStep('new');
        } else {
          Alert.alert('Xato', "PIN kodlar mos kelmadi");
          setConfirmPin('');
          setStep('new');
          setNewPin('');
        }
      }
    }
  }

  function handlePinDelete() {
    if (step === 'new') setNewPin((p) => p.slice(0, -1));
    else setConfirmPin((p) => p.slice(0, -1));
  }

  async function handleBiometricToggle(value) {
    if (value) {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) { Alert.alert("Bu qurilma biometrikani qo'llab-quvvatlamaydi"); return; }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) { Alert.alert('', "Avval telefon sozlamalarida barmoq izi yoki Face ID o'rnating"); return; }
    }
    toggleBiometric(value);
  }

  const initials = user?.name?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const currentPin = step === 'new' ? newPin : confirmPin;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.photoSection}>
        <TouchableOpacity onPress={pickPhoto} onLongPress={takePhoto}>
          {user?.photo
            ? <Image source={{ uri: user.photo }} style={styles.photo} />
            : <View style={styles.photoPlaceholder}><Text style={styles.initials}>{initials}</Text></View>
          }
          <View style={styles.photoEdit}><Text style={{ fontSize: 16 }}>📷</Text></View>
        </TouchableOpacity>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>{ROLE_LABELS[user?.role] || ''}</Text>
        <Text style={styles.photoHint}>Bosing — galereya · Uzun bosing — kamera</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 Ilova qulfi</Text>

        <SettingRow
          label="PIN kod"
          sub={pinCode ? "O'rnatilgan ✓" : "O'rnatilmagan"}
          action={
            <TouchableOpacity style={styles.setBtn} onPress={() => setShowPinSetup(true)}>
              <Text style={styles.setBtnText}>{pinCode ? "O'zgartirish" : "O'rnatish"}</Text>
            </TouchableOpacity>
          }
        />

        <SettingRow
          label="Biometrik (Face ID / Barmoq izi)"
          sub={biometricEnabled ? 'Yoqilgan' : "O'chirilgan"}
          action={<Switch value={biometricEnabled} onValueChange={handleBiometricToggle} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor={COLORS.white} />}
        />
      </View>

      {showPinSetup && (
        <View style={styles.pinSetup}>
          <Text style={styles.pinTitle}>
            {step === 'new' ? 'Yangi PIN kiriting' : 'Tasdiqlang'}
          </Text>
          <View style={styles.dotsRow}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[styles.dot, currentPin.length > i && styles.dotFilled]} />
            ))}
          </View>
          <View style={styles.pad}>
            {[['1','2','3'],['4','5','6'],['7','8','9']].map((row, ri) => (
              <View key={ri} style={styles.padRow}>
                {row.map((d) => (
                  <TouchableOpacity key={d} style={styles.key} onPress={() => handlePinDigit(d)}>
                    <Text style={styles.keyText}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            <View style={styles.padRow}>
              <TouchableOpacity style={styles.key} onPress={() => { setShowPinSetup(false); setNewPin(''); setConfirmPin(''); setStep('new'); }}>
                <Text style={[styles.keyText, { color: COLORS.danger }]}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.key} onPress={() => handlePinDigit('0')}>
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.key} onPress={handlePinDelete}>
                <Text style={styles.keyText}>⌫</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function SettingRow({ label, sub, action }) {
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingSub}>{sub}</Text>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 60 },
  photoSection: { alignItems: 'center', marginBottom: 32 },
  photo: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.primary,
  },
  initials: { color: COLORS.primary, fontSize: 32, fontWeight: '800' },
  photoEdit: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: COLORS.primary, borderRadius: 16, padding: 6,
  },
  name: { color: COLORS.white, fontSize: 20, fontWeight: '700', marginTop: 12 },
  role: { color: COLORS.primary, fontSize: 13, marginTop: 4 },
  photoHint: { color: COLORS.textSecondary, fontSize: 11, marginTop: 6 },
  section: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 20, gap: 4 },
  sectionTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  settingLabel: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  settingSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  setBtn: { backgroundColor: COLORS.secondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.primary },
  setBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  pinSetup: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, alignItems: 'center', gap: 16 },
  pinTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  dotsRow: { flexDirection: 'row', gap: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.primary },
  dotFilled: { backgroundColor: COLORS.primary },
  pad: { gap: 12 },
  padRow: { flexDirection: 'row', gap: 16 },
  key: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' },
  keyText: { color: COLORS.white, fontSize: 22, fontWeight: '600' },
});
