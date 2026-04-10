import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { capture } from '../config/analytics';

export default function WelcomeScreen() {
  const router = useRouter();

  useEffect(() => {
    capture('Landing_Page_View');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Launch Banner */}
        <View style={styles.launchBanner}>
          <Ionicons name="rocket" size={16} color="#FFF" />
          <Text style={styles.launchBannerText}>Public Beta — Now Live</Text>
        </View>

        <View style={styles.logoBox}>
          <Ionicons name="school" size={40} color="#FFF" />
        </View>

        <Text style={styles.title}>Studynk</Text>
        <Text style={styles.tagline}>The Verified Way to Find{"\n"}Your Study Squad.</Text>

        {/* Pro Hook */}
        <View style={styles.proHook}>
          <Ionicons name="flash" size={18} color="#FF9800" />
          <Text style={styles.proHookText}>
            Get Invited First. Pro users are seen by 90% more study groups.
          </Text>
        </View>

        {/* Pricing Cards */}
        <View style={styles.pricingSection}>
          <View style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <Ionicons name="star" size={20} color="#2DAFE3" />
              <Text style={styles.pricingName}>Basic</Text>
            </View>
            <Text style={styles.pricingPrice}>{"\u00A3"}2.99<Text style={styles.pricingPeriod}>/mo</Text></Text>
            <View style={styles.pricingFeatures}>
              <PricingFeature text="Unlimited Invites" />
              <PricingFeature text="Ad-Free Experience" />
              <PricingFeature text="Verified Student Badge" />
            </View>
          </View>

          <View style={[styles.pricingCard, styles.pricingCardPro]}>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>POPULAR</Text>
            </View>
            <View style={styles.pricingHeader}>
              <Ionicons name="diamond" size={20} color="#FF9800" />
              <Text style={[styles.pricingName, { color: '#FF9800' }]}>Pro</Text>
            </View>
            <Text style={[styles.pricingPrice, { color: '#FF9800' }]}>{"\u00A3"}4.99<Text style={styles.pricingPeriod}>/mo</Text></Text>
            <View style={styles.pricingFeatures}>
              <PricingFeature text="Priority Discovery Boost" />
              <PricingFeature text="Everything in Basic" />
              <PricingFeature text={"\u26A1 Boosted Profile Status"} />
            </View>
          </View>
        </View>

        <View style={styles.features}>
          <Feature icon="people" text="Match with compatible students" />
          <Feature icon="calendar" text="Find overlapping schedules" />
          <Feature icon="trending-up" text="Achieve better grades together" />
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Join 1000+ students finding better study groups</Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Feature({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={20} color="#2DAFE3" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function PricingFeature({ text }: { text: string }) {
  return (
    <View style={styles.pricingFeatureRow}>
      <Ionicons name="checkmark" size={16} color="#4CAF50" />
      <Text style={styles.pricingFeatureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scroll: { alignItems: 'center', padding: 24, paddingTop: 0 },

  /* Launch Banner */
  launchBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2DAFE3', paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 24, marginTop: 12, marginBottom: 20,
  },
  launchBannerText: { color: '#FFF', fontSize: 14, fontWeight: '700', marginLeft: 8 },

  logoBox: {
    width: 88, height: 88, borderRadius: 22, backgroundColor: '#2DAFE3',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#2DAFE3', marginBottom: 6 },
  tagline: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 16, lineHeight: 26 },

  /* Pro Hook */
  proHook: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1',
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12,
    marginBottom: 20, borderWidth: 1, borderColor: '#FFE082', width: '100%',
  },
  proHookText: { fontSize: 14, color: '#5D4037', marginLeft: 10, flex: 1, lineHeight: 20, fontWeight: '500' },

  /* Pricing Cards */
  pricingSection: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 24 },
  pricingCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  pricingCardPro: { borderColor: '#FF9800', position: 'relative' },
  proBadge: {
    position: 'absolute', top: -10, right: 12, backgroundColor: '#FF9800',
    paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10,
  },
  proBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  pricingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pricingName: { fontSize: 18, fontWeight: '700', color: '#2DAFE3', marginLeft: 6 },
  pricingPrice: { fontSize: 26, fontWeight: '800', color: '#2DAFE3', marginBottom: 10 },
  pricingPeriod: { fontSize: 14, fontWeight: '400', color: '#999' },
  pricingFeatures: {},
  pricingFeatureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pricingFeatureText: { fontSize: 13, color: '#444', marginLeft: 6, flex: 1 },

  /* Features */
  features: { width: '100%', marginBottom: 24 },
  feature: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  featureIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F7FA',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  featureText: { fontSize: 16, color: '#333', flex: 1 },

  /* Buttons */
  primaryButton: {
    flexDirection: 'row', backgroundColor: '#2DAFE3', paddingVertical: 16,
    paddingHorizontal: 32, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', width: '100%', maxWidth: 400, marginBottom: 12,
  },
  primaryButtonText: { color: '#FFF', fontSize: 18, fontWeight: '600', marginRight: 8 },
  secondaryButton: {
    paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 400,
    borderWidth: 2, borderColor: '#2DAFE3',
  },
  secondaryButtonText: { color: '#2DAFE3', fontSize: 16, fontWeight: '600' },
  footer: { marginTop: 20, fontSize: 14, color: '#999', textAlign: 'center' },
});
