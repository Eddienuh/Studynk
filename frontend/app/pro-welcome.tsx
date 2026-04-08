import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProWelcomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ session_id: string }>();
  const { token, refreshUser } = useAuth();
  const [confirming, setConfirming] = useState(true);
  const [success, setSuccess] = useState(false);
  const hasConfirmed = useRef(false);

  useEffect(() => {
    if (hasConfirmed.current) return;
    hasConfirmed.current = true;

    const confirmPro = async () => {
      try {
        const sessionId = params.session_id;
        if (!sessionId) {
          // No session_id — might have arrived from mobile WebBrowser close
          await refreshUser();
          setSuccess(true);
          setConfirming(false);
          return;
        }

        const response = await fetch(`${BACKEND_URL}/api/stripe/confirm-pro`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success') {
            await refreshUser();
            setSuccess(true);
          } else {
            // Payment pending
            setSuccess(false);
          }
        } else {
          setSuccess(false);
        }
      } catch (error) {
        console.error('Pro confirmation error:', error);
        setSuccess(false);
      } finally {
        setConfirming(false);
      }
    };

    confirmPro();
  }, []);

  if (confirming) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF9800" />
          <Text style={styles.loadingText}>Confirming your subscription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        {success ? (
          <>
            <View style={styles.iconWrap}>
              <Ionicons name="diamond" size={64} color="#FF9800" />
            </View>
            <Text style={styles.title}>Welcome to Pro!</Text>
            <Text style={styles.subtitle}>
              Your 30-day free trial has started. Enjoy unlimited study groups, advanced matching, and more.
            </Text>

            <View style={styles.perksSection}>
              <Perk icon="infinite" text="Unlimited study groups" />
              <Perk icon="flash" text="Advanced matching filters" />
              <Perk icon="analytics" text="Group analytics & insights" />
              <Perk icon="headset" text="Priority support" />
            </View>

            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.continueBtnText}>Start Studying</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.iconWrap, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="alert-circle" size={64} color="#E53935" />
            </View>
            <Text style={styles.title}>Payment Pending</Text>
            <Text style={styles.subtitle}>
              We could not confirm your subscription yet. It may take a moment to process.
            </Text>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.continueBtnText}>Continue to App</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Perk({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.perkRow}>
      <View style={styles.perkIcon}>
        <Ionicons name={icon as any} size={20} color="#FF9800" />
      </View>
      <Text style={styles.perkText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { fontSize: 16, color: '#666', marginTop: 16 },
  iconWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  perksSection: { width: '100%', marginBottom: 32 },
  perkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  perkIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  perkText: { fontSize: 16, color: '#333', fontWeight: '500', flex: 1 },
  continueBtn: { flexDirection: 'row', backgroundColor: '#FF9800', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 54 },
  continueBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700', marginRight: 8 },
});
