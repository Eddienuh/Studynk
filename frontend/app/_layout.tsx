import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { PostHogProvider } from 'posthog-react-native';
import { isMaintenanceMode, POSTHOG_API_KEY, POSTHOG_HOST } from '../config/appConfig';
import { Ionicons } from '@expo/vector-icons';

function MaintenanceScreen() {
  return (
    <View style={mStyles.container}>
      <Ionicons name="construct" size={64} color="#2DAFE3" />
      <Text style={mStyles.title}>StudyMatch is updating.</Text>
      <Text style={mStyles.sub}>Be back soon!</Text>
    </View>
  );
}
const mStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', padding: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#333', marginTop: 20, textAlign: 'center' },
  sub: { fontSize: 16, color: '#888', marginTop: 8 },
});

export default function RootLayout() {
  if (isMaintenanceMode) {
    return <MaintenanceScreen />;
  }

  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      options={{ host: POSTHOG_HOST }}
    >
      <LanguageProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="auth-callback" />
            <Stack.Screen name="auth-start" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="verify-account" />
            <Stack.Screen name="choose-plan" />
            <Stack.Screen name="pro-welcome" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="study-spots" />
            <Stack.Screen name="schedule" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthProvider>
      </LanguageProvider>
    </PostHogProvider>
  );
}
