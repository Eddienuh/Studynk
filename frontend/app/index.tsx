import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

const { width } = Dimensions.get('window');
const studynkLogo = require('../assets/studynk-logo.png');
const isWide = width > 700;

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showSplash, setShowSplash] = useState(true);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(t);
  }, []);

  // Auto-redirect logged-in users
  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(user.onboarding_completed ? '/(tabs)' : '/onboarding');
    }
  }, [user, loading]);

  // PWA install prompt
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
  };

  if (!fontsLoaded || showSplash) {
    return (
      <View style={s.splash}>
        <Image source={studynkLogo} style={s.splashLogo} resizeMode="contain" />
      </View>
    );
  }
  if (loading) {
    return (
      <View style={s.splash}>
        <Image source={studynkLogo} style={s.splashLogo} resizeMode="contain" />
        <ActivityIndicator size="large" color="#0EA5E9" style={{ marginTop: 24 }} />
      </View>
    );
  }
  if (user) return null;

  return (
    <ScrollView style={s.page} bounces={false} showsVerticalScrollIndicator={false}>

      {/* ═══════════════ HERO ═══════════════ */}
      <LinearGradient
        colors={['#0EA5E9', '#38BDF8']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={s.hero}
      >
        {/* Minimal Nav */}
        <View style={s.nav}>
          <View style={{ width: 70 }} />
          <Text style={s.navBrand}>Studynk</Text>
          <TouchableOpacity style={s.navLoginBtn} onPress={() => router.push('/login')}>
            <Text style={s.navLoginText}>Log In</Text>
          </TouchableOpacity>
        </View>

        {/* Center Content */}
        <View style={s.heroCenter}>
          <Image source={studynkLogo} style={s.heroLogo} resizeMode="contain" />

          <Text style={s.heroH1}>
            Find Your Perfect{'\n'}Study Partner
          </Text>

          <Text style={s.heroSub}>
            Verified university students. Compatible schedules.{'\n'}Better grades — together.
          </Text>

          {/* Primary CTA */}
          <TouchableOpacity
            style={s.ctaBtn}
            onPress={() => router.push('/register')}
            activeOpacity={0.85}
          >
            <Ionicons name="search" size={20} color="#0EA5E9" />
            <Text style={s.ctaBtnText}>Find My Study Partner</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/login')} style={s.ctaSecondary}>
            <Text style={s.ctaSecondaryText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Wave separator */}
        <View style={s.waveSpacer} />
      </LinearGradient>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <View style={s.howSection}>
        <Text style={s.howTitle}>How It Works</Text>
        <Text style={s.howSubtitle}>Three simple steps to your dream study group</Text>

        <View style={s.howGrid}>
          {/* Step 1: Verify */}
          <View style={s.howCard}>
            <View style={[s.howIconBox, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="shield-checkmark" size={32} color="#0EA5E9" />
            </View>
            <View style={s.howStep}>
              <Text style={s.howStepNum}>1</Text>
            </View>
            <Text style={s.howCardTitle}>Verify</Text>
            <Text style={s.howCardDesc}>Use your .ac.uk email{'\n'}to prove you're a real student.</Text>
          </View>

          {/* Step 2: Match */}
          <View style={s.howCard}>
            <View style={[s.howIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="people" size={32} color="#F59E0B" />
            </View>
            <View style={[s.howStep, { backgroundColor: '#F59E0B' }]}>
              <Text style={s.howStepNum}>2</Text>
            </View>
            <Text style={s.howCardTitle}>Match</Text>
            <Text style={s.howCardDesc}>Our AI finds your course mates{'\n'}with compatible schedules.</Text>
          </View>

          {/* Step 3: Succeed */}
          <View style={s.howCard}>
            <View style={[s.howIconBox, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="trophy" size={32} color="#10B981" />
            </View>
            <View style={[s.howStep, { backgroundColor: '#10B981' }]}>
              <Text style={s.howStepNum}>3</Text>
            </View>
            <Text style={s.howCardTitle}>Succeed</Text>
            <Text style={s.howCardDesc}>Ace your exams together{'\n'}with your study squad.</Text>
          </View>
        </View>
      </View>

      {/* ═══════════════ SOCIAL PROOF ═══════════════ */}
      <View style={s.proofSection}>
        <View style={s.proofRow}>
          <View style={s.proofStat}>
            <Ionicons name="people-circle" size={28} color="#0EA5E9" />
            <Text style={s.proofNumber}>100+</Text>
            <Text style={s.proofLabel}>Students</Text>
          </View>
          <View style={s.proofDivider} />
          <View style={s.proofStat}>
            <Ionicons name="school" size={28} color="#0EA5E9" />
            <Text style={s.proofNumber}>UK</Text>
            <Text style={s.proofLabel}>Universities</Text>
          </View>
          <View style={s.proofDivider} />
          <View style={s.proofStat}>
            <Ionicons name="star" size={28} color="#0EA5E9" />
            <Text style={s.proofNumber}>Free</Text>
            <Text style={s.proofLabel}>To Start</Text>
          </View>
        </View>
      </View>

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <LinearGradient
        colors={['#0EA5E9', '#38BDF8']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={s.finalCta}
      >
        <Text style={s.finalH}>Ready to stop studying alone?</Text>
        <TouchableOpacity
          style={s.finalBtn}
          onPress={() => router.push('/register')}
          activeOpacity={0.85}
        >
          <Text style={s.finalBtnText}>Get Started — It's Free</Text>
          <Ionicons name="arrow-forward" size={18} color="#0EA5E9" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </LinearGradient>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <View style={s.footer}>
        <Image source={studynkLogo} style={s.footerLogo} resizeMode="contain" />
        <Text style={s.footerBrand}>Studynk</Text>

        {/* Download / Install CTA */}
        <TouchableOpacity
          style={s.downloadBtn}
          onPress={deferredPrompt ? handleInstallPWA : () => router.push('/register')}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={18} color="#FFF" />
          <Text style={s.downloadBtnText}>
            {deferredPrompt ? 'Download Web App' : 'Download Web App'}
          </Text>
        </TouchableOpacity>
        <Text style={s.footerHint}>
          {Platform.OS === 'web'
            ? 'Tap your browser menu → "Add to Home Screen"'
            : 'Install directly from your browser'}
        </Text>

        {/* Links */}
        <View style={s.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={s.footerLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={s.footerDot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={s.footerLink}>Privacy</Text>
          </TouchableOpacity>
          <Text style={s.footerDot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/pricing')}>
            <Text style={s.footerLink}>Pricing</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.footerCopy}>{'\u00A9'} 2025 Studynk. All rights reserved.</Text>
        <Text style={s.footerEmail}>studynk0@outlook.com</Text>
      </View>
    </ScrollView>
  );
}

/* ═══════════════ STYLES ═══════════════ */
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFF' },

  /* Splash */
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  splashLogo: { width: 160, height: 160, borderRadius: 32 },

  /* Hero */
  hero: { paddingTop: Platform.OS === 'web' ? 0 : 48, minHeight: 580 },
  nav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
  },
  navBrand: {
    fontSize: 20, fontWeight: '800', color: '#FFF',
    fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.5,
  },
  navLoginBtn: {
    paddingVertical: 8, paddingHorizontal: 20, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  navLoginText: { color: '#FFF', fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  heroCenter: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 },
  heroLogo: { width: 100, height: 100, borderRadius: 24, marginBottom: 28 },
  heroH1: {
    fontSize: isWide ? 46 : 32, fontWeight: '800', color: '#FFF',
    textAlign: 'center', lineHeight: isWide ? 56 : 42,
    fontFamily: 'Inter_800ExtraBold', marginBottom: 16,
  },
  heroSub: {
    fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center',
    fontFamily: 'Inter_400Regular', marginBottom: 36, maxWidth: 380, lineHeight: 24,
  },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    paddingVertical: 18, paddingHorizontal: 36, borderRadius: 32,
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, minWidth: 260, justifyContent: 'center',
  },
  ctaBtnText: {
    color: '#0EA5E9', fontSize: 18, fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold', marginLeft: 10,
  },
  ctaSecondary: { marginTop: 20, paddingVertical: 8 },
  ctaSecondaryText: {
    color: 'rgba(255,255,255,0.8)', fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },

  waveSpacer: { height: 20 },

  /* How It Works */
  howSection: { paddingVertical: 52, paddingHorizontal: 24, backgroundColor: '#FFF' },
  howTitle: {
    fontSize: 28, fontWeight: '800', color: '#0F172A', textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold', marginBottom: 8,
  },
  howSubtitle: {
    fontSize: 15, color: '#64748B', textAlign: 'center',
    fontFamily: 'Inter_400Regular', marginBottom: 36,
  },
  howGrid: {
    flexDirection: isWide ? 'row' : 'column',
    justifyContent: 'center', alignItems: 'center', gap: 20,
  },
  howCard: {
    backgroundColor: '#FAFBFC', borderRadius: 20, padding: 28,
    alignItems: 'center', width: isWide ? '30%' : '100%', maxWidth: 320,
    borderWidth: 1, borderColor: '#F1F5F9', position: 'relative',
  },
  howIconBox: {
    width: 68, height: 68, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  howStep: {
    position: 'absolute', top: -12, right: 20,
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#0EA5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  howStepNum: {
    color: '#FFF', fontSize: 13, fontWeight: '800', fontFamily: 'Inter_800ExtraBold',
  },
  howCardTitle: {
    fontSize: 20, fontWeight: '700', color: '#0F172A',
    fontFamily: 'Inter_700Bold', marginBottom: 8,
  },
  howCardDesc: {
    fontSize: 14, color: '#64748B', textAlign: 'center',
    lineHeight: 21, fontFamily: 'Inter_400Regular',
  },

  /* Social Proof */
  proofSection: {
    paddingVertical: 36, paddingHorizontal: 24, backgroundColor: '#F8FAFC',
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  proofRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  proofStat: { alignItems: 'center', paddingHorizontal: 24 },
  proofNumber: {
    fontSize: 22, fontWeight: '800', color: '#0F172A',
    fontFamily: 'Inter_800ExtraBold', marginTop: 6,
  },
  proofLabel: {
    fontSize: 13, color: '#64748B', fontFamily: 'Inter_400Regular', marginTop: 2,
  },
  proofDivider: { width: 1, height: 40, backgroundColor: '#CBD5E1' },

  /* Final CTA */
  finalCta: { paddingVertical: 52, paddingHorizontal: 24, alignItems: 'center' },
  finalH: {
    fontSize: 24, fontWeight: '800', color: '#FFF', textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold', marginBottom: 24, maxWidth: 360,
  },
  finalBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    paddingVertical: 16, paddingHorizontal: 32, borderRadius: 28,
  },
  finalBtnText: {
    color: '#0EA5E9', fontSize: 17, fontWeight: '800', fontFamily: 'Inter_800ExtraBold',
  },

  /* Footer */
  footer: {
    paddingVertical: 40, paddingHorizontal: 24, backgroundColor: '#0F172A', alignItems: 'center',
  },
  footerLogo: { width: 60, height: 60, borderRadius: 14, marginBottom: 8 },
  footerBrand: {
    fontSize: 18, fontWeight: '700', color: '#FFF',
    fontFamily: 'Inter_700Bold', marginBottom: 20,
  },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0EA5E9',
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, marginBottom: 8,
  },
  downloadBtnText: {
    color: '#FFF', fontSize: 15, fontWeight: '700',
    fontFamily: 'Inter_700Bold', marginLeft: 8,
  },
  footerHint: {
    fontSize: 12, color: '#64748B', fontFamily: 'Inter_400Regular',
    textAlign: 'center', marginBottom: 24,
  },
  footerLinks: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12,
  },
  footerLink: { fontSize: 14, color: '#94A3B8', fontFamily: 'Inter_500Medium' },
  footerDot: { color: '#475569', fontSize: 14 },
  footerCopy: {
    fontSize: 13, color: '#475569', fontFamily: 'Inter_400Regular', marginBottom: 4,
  },
  footerEmail: { fontSize: 13, color: '#475569', fontFamily: 'Inter_400Regular' },
});
