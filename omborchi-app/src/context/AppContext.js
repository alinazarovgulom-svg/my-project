import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const AppContext = createContext({});

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [pinCode, setPinCode] = useState(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [incomings, setIncomings] = useState([]);
  const [outgoings, setOutgoings] = useState([]);
  const [archivedItems, setArchivedItems] = useState([]);

  useEffect(() => {
    loadLocalSettings();
    const unsubscribe = NetInfo?.addEventListener?.((state) => {
      setIsOnline(state.isConnected);
    });
    return () => unsubscribe?.();
  }, []);

  async function loadLocalSettings() {
    try {
      const pin = await AsyncStorage.getItem('pinCode');
      const biometric = await AsyncStorage.getItem('biometricEnabled');
      const lockEnabled = await AsyncStorage.getItem('appLockEnabled');
      if (pin) setPinCode(pin);
      if (biometric === 'true') setBiometricEnabled(true);
      if (lockEnabled === 'true') setAppLockEnabled(true);
    } catch {}
  }

  async function savePinCode(pin) {
    await AsyncStorage.setItem('pinCode', pin);
    await AsyncStorage.setItem('appLockEnabled', 'true');
    setPinCode(pin);
    setAppLockEnabled(true);
  }

  async function toggleBiometric(value) {
    await AsyncStorage.setItem('biometricEnabled', value ? 'true' : 'false');
    setBiometricEnabled(value);
  }

  function lockApp() {
    if (appLockEnabled) setIsLocked(true);
  }

  function unlockApp() {
    setIsLocked(false);
  }

  // Soft delete — 30 kun arxivda
  function archiveItem(item, type) {
    const archived = {
      ...item,
      _type: type,
      _deletedAt: new Date().toISOString(),
      _expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    setArchivedItems((prev) => [...prev, archived]);
  }

  function restoreItem(archivedId) {
    setArchivedItems((prev) => prev.filter((i) => i.id !== archivedId));
  }

  return (
    <AppContext.Provider
      value={{
        user, setUser,
        family, setFamily,
        onlineUsers, setOnlineUsers,
        isOnline,
        isLocked, lockApp, unlockApp,
        appLockEnabled,
        pinCode, savePinCode,
        biometricEnabled, toggleBiometric,
        rawMaterials, setRawMaterials,
        suppliers, setSuppliers,
        customers, setCustomers,
        incomings, setIncomings,
        outgoings, setOutgoings,
        archivedItems, archiveItem, restoreItem,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
