import React, { useState, useRef, useEffect } from 'react';
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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const OTP_LENGTH = 6;

export default function VerifyAccountScreen() {
  const router = useRouter();
  const { user, token, refreshUser } = useAuth();
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start a 60-second cooldown on mount (OTP was just sent during registration)
  useEffect(() => {
    startCooldown(60);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleDigitChange = (value: string, index: number) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError('');

    if (value && index < OTP_LENGTH - 1) {
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
    if (code.length !== OTP_LENGTH) {
      setError(`Please enter all ${OTP_LENGTH} digits`);
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
        await refreshUser();
        setTimeout(() => {
          if (user?.onboarding_completed) {
            router.replace('/(tabs)');
          } else {
            router.replace('/onboarding');
          }
        }, 2000);
      } else {
        setError(data.detail || 'Verification failed');
        setDigits(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    setError('');
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Code Sent', 'A new verification code has been sent to your email. Check your inbox and junk folder.');
        startCooldown(60);
        setDigits(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } else {
        setError(data.detail || 'Failed to resend code');
        if (response.status === 429 && data.detail) {
          const match = data.detail.match(/(\d+) seconds/);
          if (match) startCooldown(parseInt(match[1]));
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = user?.email
    ? user.email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 6)) + c)
    : '';

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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.headerSection}>
              <View style={styles.iconContainer}>
                <Ionicons name="mail-unread-outline" size={48} color="#0EA5E9" />
              </View>
              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{'\n'}
                <Text style={styles.emailHighlight}>{maskedEmail}</Text>
              </Text>
              <Text style={styles.hintText}>
                Check your inbox and junk/spam folder
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#E53935" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* 6-digit code input */}
            <View style={styles.codeRow}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
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
              style={[styles.verifyBtn, digits.join('').length < OTP_LENGTH && styles.verifyBtnDisabled]}
              onPress={handleVerify}
              disabled={loading || digits.join('').length < OTP_LENGTH}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.verifyBtnText}>Verify My Email</Text>
              )}
            </TouchableOpacity>

            {/* Resend with cooldown */}
            <View style={styles.resendSection}>
              <Text style={styles.resendLabel}>Didn't receive a code?</Text>
              <TouchableOpacity
                style={[styles.resendButton, cooldown > 0 && styles.resendButtonDisabled]}
                onPress={handleResend}
                disabled={cooldown > 0 || resending}
              >
                {resending ? (
                  <ActivityIndicator color="#0EA5E9" size="small" />
                ) : (
                  <View style={styles.resendContent}>
                    <Ionicons name="refresh" size={18} color={cooldown > 0 ? '#AAA' : '#0EA5E9'} />
                    <Text style={[styles.resendButtonText, cooldown > 0 && styles.resendTextDisabled]}>
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Code'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={18} color="#64748B" />
              <Text style={styles.infoText}>
                You must verify your university email before you can use Studynk's matching features.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },

  headerSection: { alignItems: 'center', marginBottom: 28 },
  iconContainer: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    borderWidth: 2, borderColor: '#E0F2FE',
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  emailHighlight: { color: '#0EA5E9', fontWeight: '700' },
  hintText: { fontSize: 13, color: '#94A3B8', marginTop: 8, fontStyle: 'italic' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE',
    padding: 12, borderRadius: 10, marginBottom: 16,
  },
  errorText: { color: '#E53935', fontSize: 14, marginLeft: 8, flex: 1 },

  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 28 },
  codeInput: {
    width: 48, height: 60, borderRadius: 12, borderWidth: 2,
    borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
    fontSize: 24, fontWeight: '700', color: '#333',
  },
  codeInputFilled: { borderColor: '#0EA5E9', backgroundColor: '#F0F9FF' },

  verifyBtn: {
    backgroundColor: '#0EA5E9', paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', minHeight: 56, justifyContent: 'center',
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  resendSection: { alignItems: 'center', marginTop: 24 },
  resendLabel: { fontSize: 14, color: '#64748B', marginBottom: 8 },
  resendButton: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#0EA5E9', backgroundColor: '#F0F9FF',
  },
  resendButtonDisabled: { borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  resendContent: { flexDirection: 'row', alignItems: 'center' },
  resendButtonText: { fontSize: 15, color: '#0EA5E9', fontWeight: '600', marginLeft: 8 },
  resendTextDisabled: { color: '#9CA3AF' },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8FAFC',
    padding: 14, borderRadius: 12, marginTop: 24, borderWidth: 1, borderColor: '#E2E8F0',
  },
  infoText: { fontSize: 13, color: '#64748B', marginLeft: 8, flex: 1, lineHeight: 19 },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successIcon: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#43A047', marginBottom: 8 },
  successText: { fontSize: 15, color: '#888', textAlign: 'center' },
});
