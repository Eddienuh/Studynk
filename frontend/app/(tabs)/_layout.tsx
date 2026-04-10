import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function TabLayout() {
  const { token } = useAuth();
  const [invitationCount, setInvitationCount] = useState(0);

  const fetchInvitationCount = useCallback(async () => {
    if (!token) return;
    try {
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const res = await fetch(`${BACKEND_URL}/api/invitations/pending`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvitationCount((data.invitations || []).length);
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchInvitationCount();
    const interval = setInterval(fetchInvitationCount, 30000);
    return () => clearInterval(interval);
  }, [fetchInvitationCount]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1A365D',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopColor: '#E0E0E0',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="people" size={size} color={color} />
              {invitationCount > 0 && (
                <View style={dotStyles.dot} />
              )}
            </View>
          ),
        }}
        listeners={{
          tabPress: () => {
            // Refresh count when tab is pressed
            fetchInvitationCount();
          },
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const dotStyles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
});
