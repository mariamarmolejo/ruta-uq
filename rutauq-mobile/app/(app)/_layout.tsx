import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Search, Bookmark, Car, Truck, Shield, User } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user            = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  if (!user) return null;

  const isClient = user.role === 'CLIENT';
  const isDriver = user.role === 'DRIVER';
  const isAdmin  = user.role === 'ADMIN';

  return (
    <Tabs
      screenOptions={{
        headerShown:         false,
        tabBarActiveTintColor:   Colors.primary[600],
        tabBarInactiveTintColor: Colors.neutral[500],
        tabBarStyle: {
          backgroundColor:  Colors.white,
          borderTopColor:   Colors.neutral[200],
          borderTopWidth:   1,
          paddingBottom:    4,
          paddingTop:       4,
          height:           60,
        },
        tabBarLabelStyle: {
          fontSize:   11,
          fontWeight: '500',
        },
      }}
    >
      {/* Trips — visible to all */}
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Viajes',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />

      {/* Reservations — CLIENT only */}
      <Tabs.Screen
        name="reservations"
        options={{
          title:  'Reservas',
          href:   isClient ? undefined : null,
          tabBarIcon: ({ color, size }) => <Bookmark size={size} color={color} />,
        }}
      />

      {/* Driver: My trips */}
      <Tabs.Screen
        name="driver"
        options={{
          title:  'Mis viajes',
          href:   isDriver ? undefined : null,
          tabBarIcon: ({ color, size }) => <Car size={size} color={color} />,
        }}
      />

      {/* Payments — hidden from tab bar but accessible as screen */}
      <Tabs.Screen
        name="payments"
        options={{
          href: null,
        }}
      />

      {/* Admin */}
      <Tabs.Screen
        name="admin"
        options={{
          title:  'Admin',
          href:   isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
        }}
      />

      {/* Profile — visible to all */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
