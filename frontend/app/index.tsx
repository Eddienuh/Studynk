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
  Linking,
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

  // Splash
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(t);
  }, []);

  // Auto-redirect logged-in users
  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(user.onboarding_completed ? '/(tabs)' : '/onboarding');
    }
  }, [user, loading]);

  // PWA prompt
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      router.push('/register');
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

      {/* ════════ HERO ════════ */}
      <LinearGradient colors={['#0EA5E9', '#38BDF8', '#7DD3FC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        {/* Nav */}
        <View style={s.nav}>
          <Image source={studynkLogo} style={s.navLogo} resizeMode="contain" />
          <TouchableOpacity style={s.navLoginBtn} onPress={() => router.push('/login')}>
            <Text style={s.navLoginText}>Log In</Text>
          </TouchableOpacity>
        </View>

        {/* Center Logo */}
        <View style={s.heroCenter}>
          <Image source={studynkLogo} style={s.heroLogo} resizeMode="contain" />
          <Text style={s.heroH1}>Stop Studying Alone.{'\n'}Match with your{'\n'}Course Mates.</Text>
          <Text style={s.heroSub}>Verified students. Compatible schedules. Better grades.</Text>

          {/* CTA */}
          <TouchableOpacity style={s.ctaBtn} onPress={handleInstall} activeOpacity={0.85}>
            <Ionicons name="download-outline" size={20} color="#0EA5E9" />
            <Text style={s.ctaBtnText}>Install Studynk App</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/register')} style={s.ctaSecondary}>
            <Text style={s.ctaSecondaryText}>or Sign Up Free</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ════════ SOCIAL PROOF ════════ */}
      <View style={s.proofBar}>
        <Text style={s.proofText}>Trusted by <Text style={s.proofBold}>100+ students</Text> across UK universities</Text>
      </View>

      {/* ════════ FEATURES ════════ */}
      <View style={s.featSection}>
        <Text style={s.sectionH2}>How It Works</Text>
        <View style={s.featGrid}>
          <FeatureCard step="1" icon="book" title="Match by Module" desc="Find students in the same course or module as you." />
          <FeatureCard step="2" icon="calendar" title="Sync Schedules" desc="Align free hours automatically with your group." />
          <FeatureCard step="3" icon="trophy" title="Ace Exams" desc="Study smarter together and boost your grades." />
        </View>
      </View>

      {/* ════════ PRICING ════════ */}
      <View style={s.priceSection}>
        <Text style={s.sectionH2}>Simple, Transparent Pricing</Text>
        <Text style={s.sectionSub}>Pro users are seen by 90% more study groups.</Text>

        <View style={s.priceGrid}>
          {/* Basic */}
          <View style={s.priceCard}>
            <Ionicons name="star" size={28} color="#0EA5E9" />
            <Text style={s.priceName}>Basic</Text>
            <Text style={s.priceAmount}>{'\u00A3'}2.99<Text style={s.pricePer}>/mo</Text></Text>
            <Text style={s.priceTag}>The Essentials</Text>
            <View style={s.priceFeats}>
              <PFeat text="Unlimited Invites" />
              <PFeat text="Ad-Free Experience" />
              <PFeat text="Verified Student Badge" />
            </View>
            <TouchableOpacity style={s.priceBtn} onPress={() => router.push('/register')}>
              <Text style={s.priceBtnText}>Get Started</Text>
            </TouchableOpacity>
          </View>

          {/* Pro */}
          <View style={[s.priceCard, s.priceCardPro]}>
            <View style={s.popTag}><Text style={s.popTagText}>BEST VALUE</Text></View>
            <Ionicons name="diamond" size={28} color="#F59E0B" />
            <Text style={[s.priceName, { color: '#F59E0B' }]}>Pro</Text>
            <Text style={[s.priceAmount, { color: '#F59E0B' }]}>{'\u00A3'}4.99<Text style={s.pricePer}>/mo</Text></Text>
            <Text style={s.priceTag}>The Closer</Text>
            <View style={s.priceFeats}>
              <PFeat text="Priority Discovery Boost" />
              <PFeat text="Everything in Basic" />
              <PFeat text={'\u26A1 Boosted Profile Status'} />
              <PFeat text="Unlimited Study Groups" />
            </View>
            <TouchableOpacity style={[s.priceBtn, { backgroundColor: '#F59E0B' }]} onPress={() => router.push('/register')}>
              <Text style={s.priceBtnText}>Go Pro</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ════════ FINAL CTA ════════ */}
      <LinearGradient colors={['#0EA5E9', '#38BDF8']} style={s.finalCta}>
        <Text style={s.finalCtaH}>Ready to Find Your Study Squad?</Text>
        <TouchableOpacity style={s.finalCtaBtn} onPress={() => router.push('/register')} activeOpacity={0.85}>
          <Text style={s.finalCtaBtnText}>Start Matching — It's Free</Text>
          <Ionicons name="arrow-forward" size={18} color="#0EA5E9" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </LinearGradient>

      {/* ════════ FOOTER ════════ */}
      <View style={s.footer}>
        <Image source={studynkLogo} style={s.footerLogo} resizeMode="contain" />
        <View style={s.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')}><Text style={s.footerLink}>Terms</Text></TouchableOpacity>
          <Text style={s.footerDot}> · </Text>
          <TouchableOpacity onPress={() => router.push('/privacy')}><Text style={s.footerLink}>Privacy</Text></TouchableOpacity>
          <Text style={s.footerDot}> · </Text>
          <TouchableOpacity onPress={() => router.push('/pricing')}><Text style={s.footerLink}>Pricing</Text></TouchableOpacity>
        </View>
        <Text style={s.footerCopy}>{'\u00A9'} 2026 Studynk. UK-compliant.</Text>
        <Text style={s.footerEmail}>Support: studynk0@outlook.com</Text>
      </View>
    </ScrollView>
  );
}

/* ── Sub-components ── */
function FeatureCard({ step, icon, title, desc }: { step: string; icon: any; title: string; desc: string }) {
  return (
    <View style={s.featCard}>
      <View style={s.featBadge}><Text style={s.featBadgeText}>{step}</Text></View>
      <View style={s.featIconBox}><Ionicons name={icon} size={28} color="#0EA5E9" /></View>
      <Text style={s.featTitle}>{title}</Text>
      <Text style={s.featDesc}>{desc}</Text>
    </View>
  );
}

function PFeat({ text }: { text: string }) {
  return (
    <View style={s.pfRow}>
      <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
      <Text style={s.pfText}>{text}</Text>
    </View>
  );
}

/* ── Styles ── */
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFF' },

  /* Splash */
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  splashLogo: { width: 160, height: 160, borderRadius: 32 },

  /* Hero */
  hero: { paddingTop: Platform.OS === 'web' ? 0 : 48 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14 },
  navLogo: { width: 110, height: 36, borderRadius: 6 },
  navLoginBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  navLoginText: { color: '#FFF', fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  heroCenter: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 56 },
  heroLogo: { width: 120, height: 120, borderRadius: 28, marginBottom: 24 },
  heroH1: { fontSize: isWide ? 44 : 30, fontWeight: '800', color: '#FFF', textAlign: 'center', lineHeight: isWide ? 54 : 40, fontFamily: 'Inter_800ExtraBold', marginBottom: 12 },
  heroSub: { fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center', fontFamily: 'Inter_400Regular', marginBottom: 32, maxWidth: 420, lineHeight: 24 },

  ctaBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 28, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  ctaBtnText: { color: '#0EA5E9', fontSize: 17, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', marginLeft: 10 },
  ctaSecondary: { marginTop: 16, paddingVertical: 8 },
  ctaSecondaryText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontFamily: 'Inter_500Medium', textDecorationLine: 'underline' },

  /* Social proof */
  proofBar: { paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  proofText: { fontSize: 15, color: '#64748B', fontFamily: 'Inter_400Regular', textAlign: 'center' },
  proofBold: { fontWeight: '700', color: '#334155', fontFamily: 'Inter_700Bold' },

  /* Features */
  featSection: { paddingVertical: 48, paddingHorizontal: 24, backgroundColor: '#FFF' },
  sectionH2: { fontSize: 26, fontWeight: '800', color: '#0F172A', textAlign: 'center', fontFamily: 'Inter_800ExtraBold', marginBottom: 8 },
  sectionSub: { fontSize: 15, color: '#64748B', textAlign: 'center', fontFamily: 'Inter_400Regular', marginBottom: 32 },
  featGrid: { flexDirection: isWide ? 'row' : 'column', justifyContent: 'center', alignItems: isWide ? 'flex-start' : 'center', gap: 16 },
  featCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 24, alignItems: 'center', width: isWide ? '30%' : '100%', maxWidth: 340, position: 'relative' },
  featBadge: { position: 'absolute', top: -10, left: 20, width: 28, height: 28, borderRadius: 14, backgroundColor: '#0EA5E9', justifyContent: 'center', alignItems: 'center' },
  featBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  featIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  featTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', fontFamily: 'Inter_700Bold', marginBottom: 6 },
  featDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, fontFamily: 'Inter_400Regular' },

  /* Pricing */
  priceSection: { paddingVertical: 48, paddingHorizontal: 24, backgroundColor: '#F8FAFC' },
  priceGrid: { flexDirection: isWide ? 'row' : 'column', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 },
  priceCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 28, width: isWide ? '44%' : '100%', maxWidth: 380, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center', position: 'relative' },
  priceCardPro: { borderColor: '#F59E0B' },
  popTag: { position: 'absolute', top: -12, backgroundColor: '#F59E0B', paddingVertical: 4, paddingHorizontal: 16, borderRadius: 12 },
  popTagText: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, fontFamily: 'Inter_800ExtraBold' },
  priceName: { fontSize: 22, fontWeight: '700', color: '#0EA5E9', fontFamily: 'Inter_700Bold', marginTop: 8 },
  priceAmount: { fontSize: 40, fontWeight: '800', color: '#0EA5E9', fontFamily: 'Inter_800ExtraBold', marginVertical: 4 },
  pricePer: { fontSize: 16, fontWeight: '400', color: '#94A3B8' },
  priceTag: { fontSize: 15, color: '#64748B', marginBottom: 16, fontFamily: 'Inter_500Medium' },
  priceFeats: { width: '100%', marginBottom: 20 },
  pfRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pfText: { fontSize: 15, color: '#334155', marginLeft: 10, flex: 1, fontFamily: 'Inter_500Medium' },
  priceBtn: { backgroundColor: '#0EA5E9', paddingVertical: 15, borderRadius: 12, alignItems: 'center', width: '100%', minHeight: 50, justifyContent: 'center' },
  priceBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  /* Final CTA */
  finalCta: { paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center' },
  finalCtaH: { fontSize: 24, fontWeight: '800', color: '#FFF', textAlign: 'center', fontFamily: 'Inter_800ExtraBold', marginBottom: 24 },
  finalCtaBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 28 },
  finalCtaBtnText: { color: '#0EA5E9', fontSize: 17, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },

  /* Footer */
  footer: { paddingVertical: 32, paddingHorizontal: 24, backgroundColor: '#0F172A', alignItems: 'center' },
  footerLogo: { width: 80, height: 80, borderRadius: 16, marginBottom: 16 },
  footerLinks: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  footerLink: { fontSize: 14, color: '#94A3B8', fontFamily: 'Inter_500Medium' },
  footerDot: { color: '#475569' },
  footerCopy: { fontSize: 13, color: '#64748B', fontFamily: 'Inter_400Regular', marginBottom: 4 },
  footerEmail: { fontSize: 13, color: '#64748B', fontFamily: 'Inter_400Regular' },
});
