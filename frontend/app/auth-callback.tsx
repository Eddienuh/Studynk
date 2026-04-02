import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        console.log('Auth callback hash:', hash);
        
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);
        
        if (!sessionIdMatch) {
          console.error('No session_id found in hash');
          alert('Authentication failed: No session ID found. Please try again.');
          router.replace('/');
          return;
        }

        const sessionId = sessionIdMatch[1];
        console.log('Session ID extracted:', sessionId.substring(0, 10) + '...');
        
        const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

        // Exchange session_id for user data
        console.log('Calling backend auth session...');
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ session_id: sessionId }),
        });

        console.log('Backend response status:', response.status);

        if (!response.ok) {
          const error = await response.json();
          console.error('Auth error:', error);
          alert(`Authentication failed: ${error.detail || 'Unknown error'}\n\nPlease try again or contact support.`);
          router.replace('/');
          return;
        }

        const data = await response.json();
        console.log('User data received:', data.user?.email);
        
        await login(data.user);

        // Clear the hash from URL
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', window.location.pathname);
        }

        console.log('Login successful, redirecting...');
        
        // Small delay to ensure state is updated
        setTimeout(() => {
          // Redirect based on onboarding status
          if (data.user.onboarding_completed) {
            console.log('Redirecting to main app');
            router.replace('/(tabs)');
          } else {
            console.log('Redirecting to onboarding');
            router.replace('/onboarding');
          }
        }, 100);
      } catch (error) {
        console.error('Session processing error:', error);
        alert('An unexpected error occurred during login. Please try again.');
        router.replace('/');
      }
    };

    processSession();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2DAFE3" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
