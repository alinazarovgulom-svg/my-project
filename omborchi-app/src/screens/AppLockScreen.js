import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Vibration, Alert
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { COLORS } from '../utils/constants';
import { useApp } from '../context/AppContext';

const PIN_LENGTH = 4;

export default function AppLockScreen() {
  const { pinCode, unlockApp, biometricEnabled } = useApp();
  const [entered, setEntered] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (biometricEnabled) tryBiometric();
  }, []);

  useEffect(() => {
    if (blockedUntil) {
      const interval = setInterval(() => {
        const remaining = Math.ceil((blockedUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setBlockedUntil(null);
          setCountdown(0);
          setAttempts(0);
          clearInterval(interval);
        } else {
          setCountdown(remaining);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [blockedUntil]);

  async function tryBiometric() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Omborchiga kirish',
      fallbackLabel: 'PIN kod ishlatish',
    });
    if (result.success) unlockApp();
  }

  function shake() {
    Vibration.vibrate(400);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  function handlePress(digit) {
    if (blockedUntil && Date.now() < blockedUntil) return;
    if (entered.length >= PIN_LENGTH) return;
    const newPin = entered + digit;
    setEntered(newPin);
    if (newPin.length === PIN_LENGTH) {
      setTimeout(() => checkPin(newPin), 100);
    }
  }

  function handleDelete() {
    setEntered((p) => p.slice(0, -1));
  }

  function checkPin(pin) {
    if (pin === pinCode) {
      setEntered('');
      setAttempts(0);
      unlockApp();
    } else {
      shake();
      setEntered('');
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setBlockedUntil(Date.now() + 5 * 60 * 1000);
      } else if (newAttempts >= 3) {
        setBlockedUntil(Date.now() + 30 * 1000);
      }
    }
  }

  const isBlocked = blockedUntil && Date.now() < blockedUntil;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OMBORCHI</Text>
      <Text style={styles.subtitle}>PIN kod kiriting</Text>

      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.dot, entered.length > i && styles.dotFilled]} />
        ))}
      </Animated.View>

      {isBlocked ? (
        <Text style={styles.blockedText}>
          {attempts >= 5
            ? `5 daqiqa kuting: ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`
            : `30 soniya kuting: ${countdown}s`}
        </Text>
      ) : (
        attempts > 0 && (
          <Text style={styles.errorText}>Noto'g'ri PIN ({attempts}/5)</Text>
        )
      )}

      <View style={styles.pad}>
        {[['1','2','3'],['4','5','6'],['7','8','9']].map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.key, isBlocked && styles.keyDisabled]}
                onPress={() => handlePress(d)}
                disabled={!!isBlocked}
              >
                <Text style={styles.keyText}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={styles.row}>
          {biometricEnabled ? (
            <TouchableOpacity style={styles.key} onPress={tryBiometric}>
              <Text style={styles.keyIcon}>👆</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.keyEmpty} />
          )}
          <TouchableOpacity
            style={[styles.key, isBlocked && styles.keyDisabled]}
            onPress={() => handlePress('0')}
            disabled={!!isBlocked}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.key} onPress={handleDelete}>
            <Text style={styles.keyIcon}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  title: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginBottom: 40,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
  },
  blockedText: {
    color: COLORS.danger,
    fontSize: 14,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.warning,
    fontSize: 13,
    marginBottom: 12,
  },
  pad: {
    marginTop: 20,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 20,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyEmpty: {
    width: 72,
    height: 72,
  },
  keyText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '600',
  },
  keyIcon: {
    fontSize: 22,
  },
});
