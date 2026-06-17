import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS, ROLES } from '../utils/constants';
import { useApp } from '../context/AppContext';

import HomeScreen from '../screens/HomeScreen';
import RawMaterialsScreen from '../screens/RawMaterialsScreen';
import IncomingScreen from '../screens/IncomingScreen';
import OutgoingScreen from '../screens/OutgoingScreen';
import MenuScreen from '../screens/MenuScreen';
import SuppliersScreen from '../screens/SuppliersScreen';
import CustomersScreen from '../screens/CustomersScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ArchiveScreen from '../screens/ArchiveScreen';
import UsersScreen from '../screens/UsersScreen';
import ProfileScreen from '../screens/ProfileScreen';

import OnlineUsersBar from '../components/OnlineUsersBar';
import KaftimдaBadge from '../components/KaftimдaBadge';
import SyncStatusIcon from '../components/SyncStatusIcon';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ emoji, focused }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

function HeaderLeft() {
  return (
    <View style={styles.headerLeft}>
      <OnlineUsersBar />
      <SyncStatusIcon />
    </View>
  );
}

function HeaderRight() {
  return <KaftimдaBadge />;
}

function MainTabs() {
  const { user } = useApp();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.white,
        headerTitleStyle: { color: COLORS.primary, fontWeight: '800', letterSpacing: 2 },
        headerLeft: () => <HeaderLeft />,
        headerRight: () => <HeaderRight />,
        headerLeftContainerStyle: { paddingLeft: 16 },
        headerRightContainerStyle: { paddingRight: 16 },
        tabBarStyle: {
          backgroundColor: COLORS.secondary,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
      }}
    >
      <Tab.Screen
        name="Bosh sahifa"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Xomashyo"
        component={RawMaterialsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} /> }}
      />
      <Tab.Screen
        name="Kirim"
        component={IncomingScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📥" focused={focused} /> }}
      />
      <Tab.Screen
        name="Chiqim"
        component={OutgoingScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📤" focused={focused} /> }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="☰" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user } = useApp();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="Suppliers"
        component={SuppliersScreen}
        options={{
          headerShown: true,
          title: 'Yetkazib beruvchilar',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.white,
          headerTitleStyle: { color: COLORS.primary },
        }}
      />
      <Stack.Screen
        name="Customers"
        component={CustomersScreen}
        options={{
          headerShown: true,
          title: 'Xaridorlar',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.white,
          headerTitleStyle: { color: COLORS.primary },
        }}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          headerShown: true,
          title: 'Hisobot',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.white,
          headerTitleStyle: { color: COLORS.primary },
        }}
      />
      <Stack.Screen
        name="Archive"
        component={ArchiveScreen}
        options={{
          headerShown: true,
          title: 'Arxiv',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.white,
          headerTitleStyle: { color: COLORS.primary },
        }}
      />
      <Stack.Screen
        name="Users"
        component={UsersScreen}
        options={{
          headerShown: true,
          title: 'Foydalanuvchilar',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.white,
          headerTitleStyle: { color: COLORS.primary },
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          title: 'Profil',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.white,
          headerTitleStyle: { color: COLORS.primary },
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
