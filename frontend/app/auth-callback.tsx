import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import * as Linking from 'expo-linking';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AuthCallback() {
  const router = useRouter();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        let sessionId: string | null = null;

        // Try to extract session_id from the current URL
        if (Platform.OS === 'web') {
          // On web, check URL hash
          const hash = typeof window !== 'undefined' ? window.location.hash : '';
          const match = hash.match(/session_id=([^&]+)/);
          if (match) sessionId = match[1];
        }

        // Also try the Linking URL (works for both platforms)
        if (!sessionId) {
          const url = await Linking.getInitialURL();
          if (url) {
            const hashPart = url.split('#')[1] || '';
            const match = hashPart.match(/session_id=([^&]+)/);
            if (match) sessionId = match[1];
            
            // Also check query params
            if (!sessionId) {
              const queryMatch = url.match(/session_id=([^&#]+)/);
              if (queryMatch) sessionId = queryMatch[1];
            }
          }
        }

        if (!sessionId) {
          console.error('No session_id found');
          router.replace('/login');
          return;
        }

        console.log('Session ID extracted:', sessionId.substring(0, 10) + '...');

        // Exchange session_id for user data
        const response = await fetch(`${BACKEND_URL}/api/auth/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Auth error:', error);
          router.replace('/login');
          return;
        }

        const data = await response.json();
        console.log('User data received:', data.user?.email);

        const authToken = data.token || sessionId;
        await login(data.user, authToken);

        // Clear the hash from URL on web
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          try {
            window.history.replaceState(null, '', window.location.pathname);
          } catch (e) {
            // Ignore if not supported
          }
        }

        // Redirect based on onboarding status
        if (data.user.onboarding_completed) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      } catch (error) {
        console.error('Session processing error:', error);
        router.replace('/login');
      }
    };

    processSession();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1A365D" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
