import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const OTP_LENGTH = 6;

type Step = 'email' | 'code' | 'newPassword' | 'success';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { if (cooldownRef.current) clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    if (!email.trim()) { setError('Please enter your email'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(data.otp_sent);
        setStep('code');
        startCooldown(60);
      } else {
        setError(data.detail || 'Something went wrong');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (value: string, index: number) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError('');
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = () => {
    const code = digits.join('');
    if (code.length !== OTP_LENGTH) { setError('Please enter all 6 digits'); return; }
    setStep('newPassword');
    setError('');
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: digits.join(''),
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('success');
      } else {
        setError(data.detail || 'Reset failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    await handleSendCode();
  };

  // ═══════ RENDER ═══════

  if (step === 'success') {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          </View>
          <Text style={s.successTitle}>Password Reset!</Text>
          <Text style={s.successText}>Your password has been updated. You can now log in with your new password.</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace('/login')}>
            <Text style={s.primaryBtnText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => step === 'email' ? router.back() : setStep('email')} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          {/* ═══ Step 1: Email ═══ */}
          {step === 'email' && (
            <View style={s.content}>
              <View style={s.iconWrap}>
                <Ionicons name="key-outline" size={44} color="#0EA5E9" />
              </View>
              <Text style={s.title}>Forgot Password?</Text>
              <Text style={s.subtitle}>Enter your email and we'll send you a 6-digit code to reset your password.</Text>

              {error ? <View style={s.errorBox}><Ionicons name="alert-circle" size={16} color="#E53935" /><Text style={s.errorText}>{error}</Text></View> : null}

              <Text style={s.label}>Email Address</Text>
              <View style={s.inputRow}>
                <Ionicons name="mail-outline" size={20} color="#999" />
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor="#AAA"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleSendCode} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.primaryBtnText}>Send Reset Code</Text>}
              </TouchableOpacity>

              {/* Support fallback */}
              <View style={s.supportBox}>
                <Ionicons name="information-circle" size={18} color="#64748B" />
                <Text style={s.supportText}>
                  If you don't receive a code, email us at{' '}
                  <Text style={s.supportLink} onPress={() => Linking.openURL('mailto:studynk0@outlook.com?subject=Password Reset Help')}>
                    studynk0@outlook.com
                  </Text>{' '}
                  and we'll reset it for you.
                </Text>
              </View>
            </View>
          )}

          {/* ═══ Step 2: Enter Code ═══ */}
          {step === 'code' && (
            <View style={s.content}>
              <View style={s.iconWrap}>
                <Ionicons name="mail-unread-outline" size={44} color="#0EA5E9" />
              </View>
              <Text style={s.title}>Enter Reset Code</Text>
              <Text style={s.subtitle}>
                {otpSent
                  ? `We sent a 6-digit code to ${email}. Check your inbox and spam folder.`
                  : `We couldn't send the email right now. Please contact support or try again.`}
              </Text>

              {error ? <View style={s.errorBox}><Ionicons name="alert-circle" size={16} color="#E53935" /><Text style={s.errorText}>{error}</Text></View> : null}

              <View style={s.codeRow}>
                {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => { inputRefs.current[i] = ref; }}
                    style={[s.codeInput, digits[i] ? s.codeInputFilled : null]}
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
                style={[s.primaryBtn, digits.join('').length < OTP_LENGTH && { opacity: 0.5 }]}
                onPress={handleVerifyCode}
                disabled={digits.join('').length < OTP_LENGTH}
              >
                <Text style={s.primaryBtnText}>Verify Code</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.resendBtn, cooldown > 0 && { opacity: 0.5 }]}
                onPress={handleResend}
                disabled={cooldown > 0 || loading}
              >
                <Ionicons name="refresh" size={16} color={cooldown > 0 ? '#AAA' : '#0EA5E9'} />
                <Text style={[s.resendText, cooldown > 0 && { color: '#AAA' }]}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                </Text>
              </TouchableOpacity>

              {/* Support fallback */}
              <View style={s.supportBox}>
                <Ionicons name="help-circle" size={18} color="#64748B" />
                <Text style={s.supportText}>
                  Didn't get the code? Contact{' '}
                  <Text style={s.supportLink} onPress={() => Linking.openURL('mailto:studynk0@outlook.com?subject=Password Reset - No Code Received')}>
                    studynk0@outlook.com
                  </Text>
                </Text>
              </View>
            </View>
          )}

          {/* ═══ Step 3: New Password ═══ */}
          {step === 'newPassword' && (
            <View style={s.content}>
              <View style={s.iconWrap}>
                <Ionicons name="lock-open-outline" size={44} color="#0EA5E9" />
              </View>
              <Text style={s.title}>Set New Password</Text>
              <Text style={s.subtitle}>Choose a strong password for your account.</Text>

              {error ? <View style={s.errorBox}><Ionicons name="alert-circle" size={16} color="#E53935" /><Text style={s.errorText}>{error}</Text></View> : null}

              <Text style={s.label}>New Password</Text>
              <View style={s.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color="#999" />
                <TextInput
                  style={s.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="#AAA"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#999" />
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Confirm Password</Text>
              <View style={s.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color="#999" />
                <TextInput
                  style={s.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor="#AAA"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleResetPassword} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.primaryBtnText}>Reset Password</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scroll: { padding: 24, paddingBottom: 48 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', marginBottom: 8 },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },

  iconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#E0F2FE' },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28, paddingHorizontal: 8 },

  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 14 },
  input: { flex: 1, fontSize: 16, color: '#333', marginLeft: 10 },

  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 10, marginBottom: 12 },
  errorText: { color: '#E53935', fontSize: 14, marginLeft: 8, flex: 1 },

  primaryBtn: { backgroundColor: '#0EA5E9', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 24, minHeight: 56, justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 24 },
  codeInput: { width: 48, height: 58, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', fontSize: 24, fontWeight: '700', color: '#333' },
  codeInputFilled: { borderColor: '#0EA5E9', backgroundColor: '#F0F9FF' },

  resendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingVertical: 10 },
  resendText: { fontSize: 14, color: '#0EA5E9', fontWeight: '600', marginLeft: 6 },

  supportBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, marginTop: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  supportText: { fontSize: 13, color: '#64748B', marginLeft: 8, flex: 1, lineHeight: 19 },
  supportLink: { color: '#0EA5E9', fontWeight: '600' },

  successIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#10B981', marginBottom: 10 },
  successText: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
});
