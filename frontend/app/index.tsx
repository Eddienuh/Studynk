import React, { useCallback, useRef, useEffect, useState } from 'react';
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
import { Head } from 'expo-router';
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

  // Splash timer
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-redirect logged-in users
  useEffect(() => {
    if (loading) return;
    if (user) {
      if (!user.onboarding_completed) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [user, loading]);

  // PWA install prompt
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      router.push('/register');
    }
  };

  const handleStartMatching = () => {
    if (user) {
      router.push('/(tabs)');
    } else {
      router.push('/register');
    }
  };

  if (!fontsLoaded || showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Image source={studynkLogo} style={styles.splashLogo} resizeMode="contain" />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <Image source={studynkLogo} style={styles.splashLogo} resizeMode="contain" />
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 24 }} />
      </View>
    );
  }

  // If user is logged in, they'll be redirected by useEffect
  if (user) return null;

  return (
    <ScrollView style={styles.page} bounces={false} showsVerticalScrollIndicator={false}>
      <Head>
        <title>Studynk — Find Your Perfect Study Partner</title>
        <meta name="description" content="The verified way to find your study squad. Match with compatible students in your course." />
        <link rel="canonical" href="https://studynk.co.uk" />
      </Head>
      {/* ───── HERO ───── */}
      <LinearGradient
        colors={['#2563EB', '#60A5FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroNav}>
          <Image source={studynkLogo} style={styles.navLogo} resizeMode="contain" />
          <TouchableOpacity style={styles.heroLoginBtn} onPress={() => router.push('/login')}>
            <Text style={styles.heroLoginText}>Log In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroContent}>
          <Image source={studynkLogo} style={styles.heroLogo} resizeMode="contain" />
          <Text style={styles.heroHeadline}>
            Find your perfect{'\n'}study partner at{'\n'}
            <Text style={styles.heroHighlight}>your university</Text>.
          </Text>
          <Text style={styles.heroSub}>
            Ace exams together. Get matched with{'\n'}compatible students in your course.
          </Text>
          <TouchableOpacity style={styles.heroCta} onPress={handleStartMatching} activeOpacity={0.85}>
            <Text style={styles.heroCtaText}>Start Matching</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ───── SOCIAL PROOF ───── */}
      <View style={styles.proofSection}>
        <Text style={styles.proofText}>Join <Text style={styles.proofBold}>100+ students</Text> from your course.</Text>
        <View style={styles.proofDivider} />
        <View style={styles.statsRow}>
          <StatItem number="100+" label="Students" />
          <StatItem number="50+" label="Study Groups" />
          <StatItem number="15+" label="Universities" />
        </View>
      </View>

      {/* ───── HOW IT WORKS ───── */}
      <View style={styles.howSection}>
        <Text style={styles.sectionTitle}>How Studynk Works</Text>
        <Text style={styles.sectionSub}>Three simple steps to your dream study group</Text>
        <View style={styles.stepsRow}>
          <StepCard
            step="1"
            icon="person-add"
            title="Create Profile"
            desc="Add your course, schedule, and study preferences."
          />
          <StepCard
            step="2"
            icon="search"
            title="Get Matched"
            desc="Our algorithm finds compatible study partners."
          />
          <StepCard
            step="3"
            icon="people"
            title="Study Together"
            desc="Join your group, chat, and schedule sessions."
          />
        </View>
      </View>

      {/* ───── PRICING ───── */}
      <View style={styles.pricingSection}>
        <Text style={styles.sectionTitle}>Simple Pricing</Text>
        <Text style={styles.sectionSub}>Get Invited First. Pro users are seen by 90% more study groups.</Text>

        <View style={styles.pricingCards}>
          {/* Basic */}
          <View style={styles.pricingCard}>
            <View style={styles.pricingIconBox}>
              <Ionicons name="star" size={24} color="#2563EB" />
            </View>
            <Text style={styles.pricingName}>Basic</Text>
            <Text style={styles.pricingPrice}>
              {"\u00A3"}2.99<Text style={styles.pricingPeriod}>/mo</Text>
            </Text>
            <Text style={styles.pricingTagline}>The Essentials</Text>
            <View style={styles.pricingFeatures}>
              <PricingFeature text="Unlimited Invites" />
              <PricingFeature text="Ad-Free Experience" />
              <PricingFeature text="Verified Student Badge" />
            </View>
            <TouchableOpacity style={styles.pricingBtn} onPress={() => router.push('/register')}>
              <Text style={styles.pricingBtnText}>Get Started</Text>
            </TouchableOpacity>
          </View>

          {/* Pro */}
          <View style={[styles.pricingCard, styles.pricingCardPro]}>
            <View style={styles.popularTag}>
              <Text style={styles.popularTagText}>MOST POPULAR</Text>
            </View>
            <View style={[styles.pricingIconBox, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="diamond" size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.pricingName, { color: '#F59E0B' }]}>Pro</Text>
            <Text style={[styles.pricingPrice, { color: '#F59E0B' }]}>
              {"\u00A3"}4.99<Text style={styles.pricingPeriod}>/mo</Text>
            </Text>
            <Text style={styles.pricingTagline}>The Closer</Text>
            <View style={styles.pricingFeatures}>
              <PricingFeature text="Priority Discovery Boost" />
              <PricingFeature text="Everything in Basic" />
              <PricingFeature text={"\u26A1 Boosted Profile Status"} />
              <PricingFeature text="Unlimited Study Groups" />
            </View>
            <TouchableOpacity style={[styles.pricingBtn, styles.pricingBtnPro]} onPress={() => router.push('/register')}>
              <Text style={styles.pricingBtnText}>Go Pro</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ───── PWA INSTALL ───── */}
      <View style={styles.installSection}>
        <Text style={styles.installTitle}>Take Studynk Everywhere</Text>
        <Text style={styles.installSub}>Install on your home screen for the best experience</Text>
        <TouchableOpacity style={styles.installBtn} onPress={handleInstallPWA} activeOpacity={0.85}>
          <Ionicons name="download-outline" size={20} color="#FFF" />
          <Text style={styles.installBtnText}>Install Studynk to Home Screen</Text>
        </TouchableOpacity>
      </View>

      {/* ───── FOOTER ───── */}
      <View style={styles.footer}>
        <Text style={styles.footerBrand}>Studynk</Text>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}> · </Text>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.footerLink}>Privacy</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}> · </Text>
          <TouchableOpacity onPress={() => router.push('/pricing')}>
            <Text style={styles.footerLink}>Pricing</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerCopy}>{"\u00A9"} 2026 Studynk. UK-compliant.</Text>
        <Text style={styles.footerEmail}>Support: studynk0@outlook.com</Text>
      </View>
    </ScrollView>
  );
}

/* ── Sub-components ── */
function StatItem({ number, label }: { number: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{number}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StepCard({ step, icon, title, desc }: { step: string; icon: any; title: string; desc: string }) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{step}</Text>
      </View>
      <View style={styles.stepIconBox}>
        <Ionicons name={icon} size={28} color="#2563EB" />
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDesc}>{desc}</Text>
    </View>
  );
}

function PricingFeature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

/* ── Styles ── */
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFF' },

  /* Splash */
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  splashLogo: { width: 180, height: 180, borderRadius: 36 },

  /* Hero */
  hero: { paddingTop: Platform.OS === 'web' ? 0 : 44, paddingBottom: 56 },
  heroNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
  },
  navLogo: { width: 120, height: 40, borderRadius: 8 },
  heroLoginBtn: {
    paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  heroLoginText: { color: '#FFF', fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  heroContent: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 16 },
  heroLogo: { width: 140, height: 140, borderRadius: 28, marginBottom: 16, overflow: 'hidden' },
  heroHeadline: {
    fontSize: width > 600 ? 42 : 32, fontWeight: '800', color: '#FFF', textAlign: 'center',
    lineHeight: width > 600 ? 52 : 42, fontFamily: 'Inter_800ExtraBold', marginBottom: 16,
  },
  heroHighlight: { color: '#BFDBFE' },
  heroSub: {
    fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center',
    lineHeight: 24, fontFamily: 'Inter_400Regular', marginBottom: 32, maxWidth: 400,
  },
  heroCta: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E3A5F',
    paddingVertical: 16, paddingHorizontal: 36, borderRadius: 12,
    minHeight: 52,
  },
  heroCtaText: { color: '#FFF', fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  /* Social Proof */
  proofSection: { paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center', backgroundColor: '#FFF' },
  proofText: { fontSize: 16, color: '#6B7280', textAlign: 'center', fontFamily: 'Inter_400Regular' },
  proofBold: { fontWeight: '700', color: '#374151', fontFamily: 'Inter_700Bold' },
  proofDivider: { width: 48, height: 2, backgroundColor: '#E5E7EB', marginVertical: 24 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: width > 600 ? 48 : 32 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '800', color: '#2563EB', fontFamily: 'Inter_800ExtraBold' },
  statLabel: { fontSize: 14, color: '#6B7280', marginTop: 2, fontFamily: 'Inter_500Medium' },

  /* How It Works */
  howSection: { paddingVertical: 48, paddingHorizontal: 24, backgroundColor: '#F9FAFB' },
  sectionTitle: {
    fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold', marginBottom: 8,
  },
  sectionSub: {
    fontSize: 15, color: '#6B7280', textAlign: 'center',
    fontFamily: 'Inter_400Regular', marginBottom: 32,
  },
  stepsRow: {
    flexDirection: width > 600 ? 'row' : 'column',
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  stepCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center',
    width: width > 600 ? '30%' : '100%', maxWidth: 320,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
    elevation: 2, position: 'relative',
  },
  stepBadge: {
    position: 'absolute', top: -10, left: 20,
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center',
  },
  stepBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  stepIconBox: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  stepTitle: { fontSize: 17, fontWeight: '700', color: '#111827', fontFamily: 'Inter_700Bold', marginBottom: 6 },
  stepDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, fontFamily: 'Inter_400Regular' },

  /* Pricing */
  pricingSection: { paddingVertical: 48, paddingHorizontal: 24, backgroundColor: '#FFF' },
  pricingCards: {
    flexDirection: width > 600 ? 'row' : 'column',
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  pricingCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 28,
    width: width > 600 ? '45%' : '100%', maxWidth: 380,
    borderWidth: 1.5, borderColor: '#E5E7EB', position: 'relative',
  },
  pricingCardPro: { borderColor: '#F59E0B' },
  popularTag: {
    position: 'absolute', top: -12, alignSelf: 'center',
    backgroundColor: '#F59E0B', paddingVertical: 4, paddingHorizontal: 16, borderRadius: 12,
  },
  popularTagText: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, fontFamily: 'Inter_800ExtraBold' },
  pricingIconBox: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  pricingName: { fontSize: 22, fontWeight: '700', color: '#2563EB', fontFamily: 'Inter_700Bold' },
  pricingPrice: { fontSize: 36, fontWeight: '800', color: '#2563EB', fontFamily: 'Inter_800ExtraBold', marginVertical: 4 },
  pricingPeriod: { fontSize: 16, fontWeight: '400', color: '#9CA3AF' },
  pricingTagline: { fontSize: 15, color: '#6B7280', marginBottom: 16, fontFamily: 'Inter_500Medium' },
  pricingFeatures: { marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  featureText: { fontSize: 15, color: '#374151', marginLeft: 10, flex: 1, fontFamily: 'Inter_500Medium' },
  pricingBtn: {
    backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', minHeight: 48, justifyContent: 'center',
  },
  pricingBtnPro: { backgroundColor: '#F59E0B' },
  pricingBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  /* PWA Install */
  installSection: { paddingVertical: 48, paddingHorizontal: 24, backgroundColor: '#F9FAFB', alignItems: 'center' },
  installTitle: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', fontFamily: 'Inter_700Bold', marginBottom: 8 },
  installSub: { fontSize: 15, color: '#6B7280', textAlign: 'center', fontFamily: 'Inter_400Regular', marginBottom: 24 },
  installBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E3A5F',
    paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, minHeight: 52,
  },
  installBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', marginLeft: 10 },

  /* Footer */
  footer: { paddingVertical: 32, paddingHorizontal: 24, backgroundColor: '#111827', alignItems: 'center' },
  footerBrand: { fontSize: 20, fontWeight: '800', color: '#FFF', fontFamily: 'Inter_800ExtraBold', marginBottom: 12 },
  footerLinks: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  footerLink: { fontSize: 14, color: '#9CA3AF', fontFamily: 'Inter_500Medium' },
  footerDot: { color: '#4B5563' },
  footerCopy: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular', marginBottom: 4 },
  footerEmail: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular' },
});
