import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function VerifyAccountScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleDigitChange = (value: string, index: number) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError('');

    // Auto-focus next
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length !== 4) {
      setError('Please enter all 4 digits');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      if (response.ok) {
        setVerified(true);
        setTimeout(() => router.replace('/onboarding'), 2000);
      } else {
        setError(data.detail || 'Verification failed');
        setDigits(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="shield-checkmark" size={64} color="#43A047" />
          </View>
          <Text style={styles.successTitle}>Student Verified!</Text>
          <Text style={styles.successText}>Your account has been verified. Redirecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#1A365D" />
            </View>
            <Text style={styles.title}>Verify Your Account</Text>
            <Text style={styles.subtitle}>
              We sent a 4-digit code to your university email.{'\n'}Enter it below to confirm your student status.
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#E53935" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* 4-digit code input */}
          <View style={styles.codeRow}>
            {[0, 1, 2, 3].map((i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[styles.codeInput, digits[i] ? styles.codeInputFilled : null]}
                value={digits[i]}
                onChangeText={(v) => handleDigitChange(v, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.verifyBtn, digits.join('').length < 4 && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={loading || digits.join('').length < 4}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.verifyBtnText}>Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendRow} onPress={() => Alert.alert('Code Resent', 'A new code has been sent to your email.')}>
            <Text style={styles.resendText}>Didn't receive a code? </Text>
            <Text style={styles.resendLink}>Resend</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipRow} onPress={() => router.replace('/onboarding')}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },

  headerSection: { alignItems: 'center', marginBottom: 32 },
  iconContainer: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#EBF0F7', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE',
    padding: 12, borderRadius: 10, marginBottom: 16,
  },
  errorText: { color: '#E53935', fontSize: 14, marginLeft: 8, flex: 1 },

  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 32 },
  codeInput: {
    width: 60, height: 68, borderRadius: 14, borderWidth: 2,
    borderColor: '#E0E0E0', backgroundColor: '#F8F9FA',
    fontSize: 28, fontWeight: '700', color: '#333',
  },
  codeInputFilled: { borderColor: '#1A365D', backgroundColor: '#EBF0F7' },

  verifyBtn: {
    backgroundColor: '#1A365D', paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', minHeight: 56, justifyContent: 'center',
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  resendText: { fontSize: 14, color: '#888' },
  resendLink: { fontSize: 14, color: '#1A365D', fontWeight: '600' },

  skipRow: { alignItems: 'center', marginTop: 16 },
  skipText: { fontSize: 14, color: '#AAA' },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successIcon: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#43A047', marginBottom: 8 },
  successText: { fontSize: 15, color: '#888', textAlign: 'center' },
});
