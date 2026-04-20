import React, { useEffect, useState, useCallback } from 'react';
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

const studynkLogo = require('../assets/studynk-logo.png');

const HERO_IMG = 'https://images.pexels.com/photos/6684600/pexels-photo-6684600.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940';
const QR_CODE_URL = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://studynk.co.uk&color=0EA5E9&bgcolor=FFFFFF';

// App store links (placeholders — swap with real IDs when published)
const APP_STORE_URL = 'https://apps.apple.com/app/studynk/id000000000';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.studynk.app';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  const isDesktop = screenWidth > 800;
  const isTablet = screenWidth > 600;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(user.onboarding_completed ? '/(tabs)' : '/onboarding');
    }
  }, [user, loading]);

  const openLink = useCallback((url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  }, []);

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

  const maxW = { maxWidth: 1200, width: '100%' as const, alignSelf: 'center' as const };

  return (
    <ScrollView style={s.page} bounces={false} showsVerticalScrollIndicator={false}>

      {/* ══════════ NAVIGATION BAR ══════════ */}
      <View style={s.navWrap}>
        <View style={[s.nav, maxW]}>
          <View style={s.navLeft}>
            <Image source={studynkLogo} style={s.navLogo} resizeMode="contain" />
            <Text style={s.navBrand}>Studynk</Text>
          </View>
          <View style={s.navRight}>
            <TouchableOpacity onPress={() => router.push('/login')} style={s.navLoginBtn}>
              <Text style={s.navLoginText}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/register')} style={s.navSignupBtn}>
              <Text style={s.navSignupText}>Sign Up Free</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ══════════ HERO SECTION ══════════ */}
      <LinearGradient
        colors={['#0EA5E9', '#38BDF8', '#7DD3FC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.heroGradient}
      >
        <View style={[s.heroInner, maxW, isDesktop && s.heroRow]}>
          {/* Left: Copy */}
          <View style={[s.heroText, isDesktop && { flex: 1, paddingRight: 40 }]}>
            <View style={s.heroBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#0EA5E9" />
              <Text style={s.heroBadgeText}>Verified UK University Students Only</Text>
            </View>

            <Text style={[s.heroH1, isDesktop && { fontSize: 52, lineHeight: 62 }]}>
              Stop Studying Alone.{'\n'}Find Your Perfect{'\n'}Study Partner.
            </Text>

            <Text style={s.heroSub}>
              Studynk matches you with compatible course mates based on your schedule, study style, and goals. Better grades start with better groups.
            </Text>

            <View style={s.heroCTArow}>
              <TouchableOpacity
                style={s.heroCTA}
                onPress={() => router.push('/register')}
                activeOpacity={0.85}
              >
                <Ionicons name="search" size={20} color="#0EA5E9" />
                <Text style={s.heroCTAtext}>Find My Study Partner</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.heroSecondary}
                onPress={() => router.push('/login')}
                activeOpacity={0.8}
              >
                <Text style={s.heroSecondaryText}>I Have an Account</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Trust badges */}
            <View style={s.trustRow}>
              <View style={s.trustItem}>
                <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={s.trustText}>GDPR Compliant</Text>
              </View>
              <View style={s.trustItem}>
                <Ionicons name="people" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={s.trustText}>100+ Students</Text>
              </View>
              <View style={s.trustItem}>
                <Ionicons name="star" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={s.trustText}>Free to Start</Text>
              </View>
            </View>
          </View>

          {/* Right: Hero image */}
          <View style={[s.heroImgWrap, isDesktop && { flex: 1 }]}>
            <Image
              source={{ uri: HERO_IMG }}
              style={[s.heroImg, isDesktop && { height: 420, borderRadius: 24 }]}
              resizeMode="cover"
            />
            {/* Floating card overlay */}
            <View style={s.floatingCard}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View style={{ marginLeft: 10 }}>
                <Text style={s.floatingTitle}>New Match Found!</Text>
                <Text style={s.floatingDesc}>3 students in your course</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <View style={s.section}>
        <View style={maxW}>
          <Text style={s.sectionLabel}>HOW IT WORKS</Text>
          <Text style={s.sectionH2}>Three Steps to Your Dream Study Group</Text>

          <View style={[s.stepsGrid, isTablet && { flexDirection: 'row' }]}>
            {[
              { icon: 'shield-checkmark' as const, color: '#0EA5E9', bg: '#DBEAFE', num: '1', title: 'Verify', desc: 'Sign up with your .ac.uk university email. We verify every student to keep the community safe and genuine.' },
              { icon: 'people' as const, color: '#F59E0B', bg: '#FEF3C7', num: '2', title: 'Match', desc: 'Our smart algorithm analyses your schedule, study style, and grade goals to find your most compatible course mates.' },
              { icon: 'trophy' as const, color: '#10B981', bg: '#D1FAE5', num: '3', title: 'Succeed', desc: 'Join your study group, coordinate sessions, and ace your exams together. Students in groups score 23% higher.' },
            ].map((step, i) => (
              <View key={i} style={[s.stepCard, isTablet && { flex: 1 }]}>
                <View style={[s.stepIconBox, { backgroundColor: step.bg }]}>
                  <Ionicons name={step.icon} size={32} color={step.color} />
                </View>
                <View style={[s.stepNum, { backgroundColor: step.color }]}>
                  <Text style={s.stepNumText}>{step.num}</Text>
                </View>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepDesc}>{step.desc}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ══════════ APP PREVIEW + FEATURES ══════════ */}
      <View style={[s.section, { backgroundColor: '#F0F9FF' }]}>
        <View style={[maxW, isDesktop && { flexDirection: 'row', alignItems: 'center' }]}>
          {/* Phone mockup */}
          <View style={[s.phoneWrap, isDesktop && { flex: 1, marginRight: 48 }]}>
            <View style={s.phoneMockup}>
              <View style={s.phoneNotch} />
              <View style={s.phoneScreen}>
                <LinearGradient
                  colors={['#0EA5E9', '#38BDF8']}
                  style={s.phoneHeader}
                >
                  <Image source={studynkLogo} style={s.phoneLogoImg} resizeMode="contain" />
                  <Text style={s.phoneHeaderText}>Studynk</Text>
                </LinearGradient>
                {/* Mock app content */}
                <View style={s.phoneContent}>
                  <Text style={s.phoneGreeting}>Welcome back!</Text>
                  <View style={s.phoneCard}>
                    <Ionicons name="people-circle" size={28} color="#0EA5E9" />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={s.phoneCardTitle}>Your Study Group</Text>
                      <Text style={s.phoneCardSub}>4 members · Next session: Tomorrow</Text>
                    </View>
                  </View>
                  <View style={s.phoneCard}>
                    <Ionicons name="flash" size={28} color="#F59E0B" />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={s.phoneCardTitle}>Match Score: 94%</Text>
                      <Text style={s.phoneCardSub}>Based on schedule & study style</Text>
                    </View>
                  </View>
                  <View style={[s.phoneCard, { borderBottomWidth: 0 }]}>
                    <Ionicons name="calendar" size={28} color="#10B981" />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={s.phoneCardTitle}>Study Session</Text>
                      <Text style={s.phoneCardSub}>Library · 2pm - 4pm</Text>
                    </View>
                  </View>
                </View>
                {/* Tab bar */}
                <View style={s.phoneTabBar}>
                  {(['home', 'people', 'chatbubbles', 'person'] as const).map((icon, i) => (
                    <Ionicons key={i} name={icon} size={22} color={i === 0 ? '#0EA5E9' : '#94A3B8'} />
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Feature list */}
          <View style={[s.featuresWrap, isDesktop && { flex: 1 }]}>
            <Text style={s.sectionLabel}>WHY STUDYNK</Text>
            <Text style={[s.sectionH2, { textAlign: 'left' }]}>Built for How Students Actually Study</Text>

            {[
              { icon: 'git-compare' as const, color: '#0EA5E9', title: 'Smart Matching', desc: 'Our algorithm considers schedule, study style, grade goals, and location to find your perfect match.' },
              { icon: 'chatbubbles' as const, color: '#8B5CF6', title: 'Group Messaging', desc: 'Coordinate sessions, share notes, and stay connected with your study group in real-time.' },
              { icon: 'calendar' as const, color: '#10B981', title: 'Schedule Sync', desc: 'See when your group is free and plan sessions that work for everyone.' },
              { icon: 'shield-checkmark' as const, color: '#F59E0B', title: 'Verified Students', desc: 'Every member verified with a .ac.uk email. No strangers — only real university students.' },
            ].map((feat, i) => (
              <View key={i} style={s.featureItem}>
                <View style={[s.featureIcon, { backgroundColor: feat.color + '18' }]}>
                  <Ionicons name={feat.icon} size={24} color={feat.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.featureTitle}>{feat.title}</Text>
                  <Text style={s.featureDesc}>{feat.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ══════════ SOCIAL PROOF — LIFESTYLE IMAGE ══════════ */}
      <View style={s.section}>
        <View style={maxW}>
          <Text style={s.sectionLabel}>REAL STUDENTS, REAL RESULTS</Text>
          <Text style={s.sectionH2}>Join Thousands of Students Studying Smarter</Text>

          <View style={[s.lifestyleRow, isDesktop && { flexDirection: 'row' }]}>
            <Image
              source={{ uri: HERO_IMG }}
              style={[s.lifestyleImg, isDesktop && { flex: 1, height: 320 }]}
              resizeMode="cover"
            />
            <View style={[s.lifestyleStats, isDesktop && { flex: 1, marginLeft: 32 }]}>
              {[
                { num: '23%', label: 'Higher grades for students in study groups', icon: 'trending-up' as const },
                { num: '4.8x', label: 'More likely to complete coursework on time', icon: 'time' as const },
                { num: '92%', label: 'Of users matched within 48 hours', icon: 'flash' as const },
              ].map((stat, i) => (
                <View key={i} style={s.statCard}>
                  <View style={s.statLeft}>
                    <Ionicons name={stat.icon} size={28} color="#0EA5E9" />
                    <Text style={s.statNum}>{stat.num}</Text>
                  </View>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* ══════════ DOWNLOAD THE APP ══════════ */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={s.downloadSection}
      >
        <View style={[maxW, isDesktop && { flexDirection: 'row', alignItems: 'center' }]}>
          {/* Left: Copy */}
          <View style={[s.downloadText, isDesktop && { flex: 1, paddingRight: 48 }]}>
            <Text style={s.downloadLabel}>GET STUDYNK</Text>
            <Text style={s.downloadH2}>Take Your Study Group{'\n'}Everywhere</Text>
            <Text style={s.downloadSub}>
              Download Studynk on your phone for the full experience — push notifications, quick messaging, and instant match alerts.
            </Text>

            {/* Mobile: Show store buttons */}
            {!isDesktop && (
              <View style={s.storeRow}>
                <TouchableOpacity style={s.storeBtn} onPress={() => openLink(APP_STORE_URL)} activeOpacity={0.8}>
                  <Ionicons name="logo-apple" size={24} color="#FFF" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={s.storeBtnSmall}>Download on the</Text>
                    <Text style={s.storeBtnBig}>App Store</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={s.storeBtn} onPress={() => openLink(PLAY_STORE_URL)} activeOpacity={0.8}>
                  <Ionicons name="logo-google-playstore" size={24} color="#FFF" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={s.storeBtnSmall}>Get it on</Text>
                    <Text style={s.storeBtnBig}>Google Play</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Both: Web app option */}
            <TouchableOpacity style={s.webAppBtn} onPress={() => router.push('/register')} activeOpacity={0.8}>
              <Ionicons name="globe-outline" size={20} color="#0EA5E9" />
              <Text style={s.webAppBtnText}>Use Web App Instead</Text>
            </TouchableOpacity>
          </View>

          {/* Desktop: QR Code */}
          {isDesktop && (
            <View style={s.qrWrap}>
              <View style={s.qrCard}>
                <Image
                  source={{ uri: QR_CODE_URL }}
                  style={s.qrImage}
                  resizeMode="contain"
                />
                <Text style={s.qrTitle}>Scan to Download</Text>
                <Text style={s.qrDesc}>Point your phone camera at{'\n'}this QR code to get Studynk</Text>

                <View style={s.qrStoreIcons}>
                  <TouchableOpacity style={s.qrStoreBtn} onPress={() => openLink(APP_STORE_URL)}>
                    <Ionicons name="logo-apple" size={20} color="#64748B" />
                    <Text style={s.qrStoreName}>App Store</Text>
                  </TouchableOpacity>
                  <View style={s.qrDivider} />
                  <TouchableOpacity style={s.qrStoreBtn} onPress={() => openLink(PLAY_STORE_URL)}>
                    <Ionicons name="logo-google-playstore" size={20} color="#64748B" />
                    <Text style={s.qrStoreName}>Google Play</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* ══════════ FINAL CTA ══════════ */}
      <LinearGradient
        colors={['#0EA5E9', '#38BDF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.finalCTA}
      >
        <View style={[maxW, { alignItems: 'center' }]}>
          <Text style={s.finalH}>Ready to Ace Your Exams Together?</Text>
          <Text style={s.finalSub}>Join Studynk today — it takes 30 seconds to sign up.</Text>
          <TouchableOpacity style={s.finalBtn} onPress={() => router.push('/register')} activeOpacity={0.85}>
            <Text style={s.finalBtnText}>Get Started — It's Free</Text>
            <Ionicons name="arrow-forward" size={18} color="#0EA5E9" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ══════════ FOOTER ══════════ */}
      <View style={s.footer}>
        <View style={[maxW, isDesktop && { flexDirection: 'row', justifyContent: 'space-between' }]}>
          <View style={s.footerLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Image source={studynkLogo} style={s.footerLogo} resizeMode="contain" />
              <Text style={s.footerBrand}>Studynk</Text>
            </View>
            <Text style={s.footerDesc}>AI-powered study group matching for UK university students. Find your people, study smarter, get better grades.</Text>
          </View>
          <View style={[s.footerLinks, isDesktop && { flexDirection: 'row', gap: 48 }]}>
            <View style={s.footerCol}>
              <Text style={s.footerColTitle}>Product</Text>
              <TouchableOpacity onPress={() => router.push('/register')}><Text style={s.footerLink}>Sign Up</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/login')}><Text style={s.footerLink}>Log In</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/pricing')}><Text style={s.footerLink}>Pricing</Text></TouchableOpacity>
            </View>
            <View style={s.footerCol}>
              <Text style={s.footerColTitle}>Legal</Text>
              <TouchableOpacity onPress={() => router.push('/privacy')}><Text style={s.footerLink}>Privacy Policy</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/terms')}><Text style={s.footerLink}>Terms of Service</Text></TouchableOpacity>
            </View>
            <View style={s.footerCol}>
              <Text style={s.footerColTitle}>Contact</Text>
              <Text style={s.footerLink}>studynk0@outlook.com</Text>
            </View>
          </View>
        </View>
        <View style={[s.footerBottom, maxW]}>
          <Text style={s.footerCopy}>{'\u00A9'} 2025 Studynk. All rights reserved.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

/* ═══════════════════ STYLES ═══════════════════ */
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFF' },
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  splashLogo: { width: 140, height: 140, borderRadius: 28 },

  /* ── Nav ── */
  navWrap: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingTop: Platform.OS === 'web' ? 0 : 44 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14 },
  navLeft: { flexDirection: 'row', alignItems: 'center' },
  navLogo: { width: 36, height: 36, borderRadius: 10, marginRight: 10 },
  navBrand: { fontSize: 20, fontWeight: '800', color: '#0F172A', fontFamily: 'Inter_800ExtraBold' },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navLoginBtn: { paddingVertical: 8, paddingHorizontal: 18 },
  navLoginText: { fontSize: 14, fontWeight: '600', color: '#0EA5E9', fontFamily: 'Inter_600SemiBold' },
  navSignupBtn: { backgroundColor: '#0EA5E9', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  navSignupText: { fontSize: 14, fontWeight: '700', color: '#FFF', fontFamily: 'Inter_700Bold' },

  /* ── Hero ── */
  heroGradient: { paddingTop: 40, paddingBottom: 56 },
  heroInner: { paddingHorizontal: 24 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroText: { marginBottom: 32 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  heroBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFF', marginLeft: 6, fontFamily: 'Inter_700Bold' },
  heroH1: { fontSize: 36, fontWeight: '800', color: '#FFF', lineHeight: 46, fontFamily: 'Inter_800ExtraBold', marginBottom: 16 },
  heroSub: { fontSize: 17, color: 'rgba(255,255,255,0.9)', lineHeight: 26, fontFamily: 'Inter_400Regular', marginBottom: 28, maxWidth: 500 },
  heroCTArow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  heroCTA: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 16, paddingHorizontal: 28, borderRadius: 14, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  heroCTAtext: { color: '#0EA5E9', fontSize: 17, fontWeight: '800', marginLeft: 10, fontFamily: 'Inter_800ExtraBold' },
  heroSecondary: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  heroSecondaryText: { color: '#FFF', fontSize: 15, fontWeight: '600', marginRight: 8, fontFamily: 'Inter_600SemiBold' },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  trustItem: { flexDirection: 'row', alignItems: 'center' },
  trustText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginLeft: 6, fontFamily: 'Inter_500Medium' },
  heroImgWrap: { alignItems: 'center', position: 'relative' },
  heroImg: { width: '100%', height: 280, borderRadius: 20 },
  floatingCard: { position: 'absolute', bottom: -16, left: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
  floatingTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', fontFamily: 'Inter_700Bold' },
  floatingDesc: { fontSize: 12, color: '#64748B', fontFamily: 'Inter_400Regular' },

  /* ── Section ── */
  section: { paddingVertical: 64, paddingHorizontal: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#0EA5E9', letterSpacing: 2, textAlign: 'center', marginBottom: 8, fontFamily: 'Inter_800ExtraBold' },
  sectionH2: { fontSize: 28, fontWeight: '800', color: '#0F172A', textAlign: 'center', lineHeight: 38, marginBottom: 40, fontFamily: 'Inter_800ExtraBold' },

  /* ── Steps ── */
  stepsGrid: { gap: 16 },
  stepCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', position: 'relative' },
  stepIconBox: { width: 68, height: 68, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  stepNum: { position: 'absolute', top: -10, right: 20, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  stepNumText: { color: '#FFF', fontSize: 13, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 8, fontFamily: 'Inter_700Bold' },
  stepDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, fontFamily: 'Inter_400Regular' },

  /* ── Phone mockup ── */
  phoneWrap: { alignItems: 'center', marginBottom: 40 },
  phoneMockup: { width: 280, backgroundColor: '#0F172A', borderRadius: 32, padding: 8, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20 },
  phoneNotch: { width: 120, height: 6, backgroundColor: '#1E293B', borderRadius: 3, alignSelf: 'center', marginTop: 6, marginBottom: 8 },
  phoneScreen: { backgroundColor: '#F8FAFC', borderRadius: 24, overflow: 'hidden' },
  phoneHeader: { paddingVertical: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  phoneLogoImg: { width: 28, height: 28, borderRadius: 8 },
  phoneHeaderText: { fontSize: 16, fontWeight: '700', color: '#FFF', marginLeft: 8, fontFamily: 'Inter_700Bold' },
  phoneContent: { padding: 16 },
  phoneGreeting: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 16, fontFamily: 'Inter_700Bold' },
  phoneCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  phoneCardTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', fontFamily: 'Inter_600SemiBold' },
  phoneCardSub: { fontSize: 12, color: '#64748B', fontFamily: 'Inter_400Regular', marginTop: 2 },
  phoneTabBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0', backgroundColor: '#FFF' },

  /* ── Features ── */
  featuresWrap: { marginBottom: 20 },
  featureItem: { flexDirection: 'row', marginBottom: 24 },
  featureIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  featureTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 4, fontFamily: 'Inter_700Bold' },
  featureDesc: { fontSize: 14, color: '#64748B', lineHeight: 21, fontFamily: 'Inter_400Regular' },

  /* ── Lifestyle / Social proof ── */
  lifestyleRow: { gap: 24 },
  lifestyleImg: { width: '100%', height: 220, borderRadius: 20 },
  lifestyleStats: {},
  statCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  statLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statNum: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginLeft: 12, fontFamily: 'Inter_800ExtraBold' },
  statLabel: { fontSize: 14, color: '#64748B', lineHeight: 21, fontFamily: 'Inter_400Regular' },

  /* ── Download ── */
  downloadSection: { paddingVertical: 72, paddingHorizontal: 24 },
  downloadText: { marginBottom: 40 },
  downloadLabel: { fontSize: 13, fontWeight: '800', color: '#38BDF8', letterSpacing: 2, marginBottom: 8, fontFamily: 'Inter_800ExtraBold' },
  downloadH2: { fontSize: 32, fontWeight: '800', color: '#FFF', lineHeight: 42, marginBottom: 16, fontFamily: 'Inter_800ExtraBold' },
  downloadSub: { fontSize: 16, color: '#94A3B8', lineHeight: 26, marginBottom: 28, fontFamily: 'Inter_400Regular', maxWidth: 460 },
  storeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  storeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  storeBtnSmall: { fontSize: 10, color: '#94A3B8', fontFamily: 'Inter_400Regular' },
  storeBtnBig: { fontSize: 16, fontWeight: '700', color: '#FFF', fontFamily: 'Inter_700Bold' },
  webAppBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#FFF', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  webAppBtnText: { fontSize: 15, fontWeight: '700', color: '#0EA5E9', marginLeft: 8, fontFamily: 'Inter_700Bold' },

  /* ── QR Code ── */
  qrWrap: { alignItems: 'center' },
  qrCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 36, alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16 },
  qrImage: { width: 200, height: 200, marginBottom: 20 },
  qrTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 6, fontFamily: 'Inter_800ExtraBold' },
  qrDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21, marginBottom: 20, fontFamily: 'Inter_400Regular' },
  qrStoreIcons: { flexDirection: 'row', alignItems: 'center' },
  qrStoreBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  qrStoreName: { fontSize: 13, color: '#64748B', marginLeft: 6, fontFamily: 'Inter_500Medium' },
  qrDivider: { width: 1, height: 20, backgroundColor: '#E2E8F0' },

  /* ── Final CTA ── */
  finalCTA: { paddingVertical: 56, paddingHorizontal: 24, alignItems: 'center' },
  finalH: { fontSize: 28, fontWeight: '800', color: '#FFF', textAlign: 'center', marginBottom: 12, fontFamily: 'Inter_800ExtraBold' },
  finalSub: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 28, fontFamily: 'Inter_400Regular' },
  finalBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14 },
  finalBtnText: { color: '#0EA5E9', fontSize: 17, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },

  /* ── Footer ── */
  footer: { backgroundColor: '#0F172A', paddingTop: 48, paddingHorizontal: 24 },
  footerLeft: { marginBottom: 32, maxWidth: 360 },
  footerLogo: { width: 40, height: 40, borderRadius: 10, marginRight: 10 },
  footerBrand: { fontSize: 20, fontWeight: '800', color: '#FFF', fontFamily: 'Inter_800ExtraBold' },
  footerDesc: { fontSize: 14, color: '#64748B', lineHeight: 22, fontFamily: 'Inter_400Regular' },
  footerLinks: { gap: 28, marginBottom: 32 },
  footerCol: {},
  footerColTitle: { fontSize: 14, fontWeight: '700', color: '#E2E8F0', marginBottom: 12, fontFamily: 'Inter_700Bold' },
  footerLink: { fontSize: 14, color: '#64748B', marginBottom: 8, fontFamily: 'Inter_400Regular' },
  footerBottom: { borderTopWidth: 1, borderTopColor: '#1E293B', paddingVertical: 20, marginTop: 8 },
  footerCopy: { fontSize: 13, color: '#475569', fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
