import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ChoosePlanScreen() {
  const router = useRouter();
  const { token, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro'>('basic');

  const handleContinue = async () => {
    if (selectedPlan === 'basic') {
      router.replace('/(tabs)');
      return;
    }

    // Pro plan — initiate Stripe Checkout
    setLoading(true);
    try {
      const successUrl = Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? `${window.location.origin}/pro-welcome` : Linking.createURL('/pro-welcome'))
        : Linking.createURL('/pro-welcome');
      const cancelUrl = Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? `${window.location.origin}/choose-plan` : Linking.createURL('/choose-plan'))
        : Linking.createURL('/choose-plan');

      const response = await fetch(`${BACKEND_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ success_url: successUrl, cancel_url: cancelUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.detail || 'Failed to create checkout session');
        return;
      }

      if (data.checkout_url) {
        if (Platform.OS === 'web') {
          await Linking.openURL(data.checkout_url);
        } else {
          const result = await WebBrowser.openBrowserAsync(data.checkout_url);
          if (result.type === 'cancel') {
            // User closed the browser — check if payment was completed
            await refreshUser();
          }
        }
      }
    } catch (error) {
      console.error('Stripe checkout error:', error);
      Alert.alert('Error', 'Failed to open checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="diamond" size={48} color="#2DAFE3" />
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>Start free or unlock everything with Pro</Text>
        </View>

        {/* Basic Plan */}
        <TouchableOpacity
          style={[styles.planCard, selectedPlan === 'basic' && styles.planCardSelected]}
          onPress={() => setSelectedPlan('basic')}
          activeOpacity={0.7}
        >
          <View style={styles.planHeader}>
            <View style={styles.planIconWrap}>
              <Ionicons name="book-outline" size={28} color="#2DAFE3" />
            </View>
            <View style={styles.planTitleWrap}>
              <Text style={styles.planName}>Basic</Text>
              <Text style={styles.planPrice}>Free</Text>
            </View>
            <View style={[styles.radioOuter, selectedPlan === 'basic' && styles.radioOuterActive]}>
              {selectedPlan === 'basic' && <View style={styles.radioInner} />}
            </View>
          </View>
          <View style={styles.planFeatures}>
            <PlanFeature text="Smart study group matching" included />
            <PlanFeature text="Group messaging" included />
            <PlanFeature text="Study streak tracking" included />
            <PlanFeature text="1 active study group" included />
            <PlanFeature text="Advanced matching filters" included={false} />
            <PlanFeature text="Unlimited study groups" included={false} />
          </View>
        </TouchableOpacity>

        {/* Pro Plan */}
        <TouchableOpacity
          style={[styles.planCard, styles.proCard, selectedPlan === 'pro' && styles.planCardSelected]}
          onPress={() => setSelectedPlan('pro')}
          activeOpacity={0.7}
        >
          <View style={styles.trialBadge}>
            <Ionicons name="gift" size={14} color="#FFF" />
            <Text style={styles.trialBadgeText}>1 Month Free Trial</Text>
          </View>
          <View style={styles.planHeader}>
            <View style={[styles.planIconWrap, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="diamond" size={28} color="#FF9800" />
            </View>
            <View style={styles.planTitleWrap}>
              <Text style={styles.planName}>Pro</Text>
              <View style={styles.priceRow}>
                <Text style={styles.planPricePro}>{"\u00A3"}3.99</Text>
                <Text style={styles.planPricePeriod}>/month</Text>
              </View>
              <Text style={styles.trialNote}>Free for 30 days, then {"\u00A3"}3.99/mo</Text>
            </View>
            <View style={[styles.radioOuter, selectedPlan === 'pro' && styles.radioOuterActive]}>
              {selectedPlan === 'pro' && <View style={styles.radioInner} />}
            </View>
          </View>
          <View style={styles.planFeatures}>
            <PlanFeature text="Everything in Basic" included />
            <PlanFeature text="Advanced matching filters" included />
            <PlanFeature text="Unlimited study groups" included />
            <PlanFeature text="Priority re-matching" included />
            <PlanFeature text="Group analytics & insights" included />
            <PlanFeature text="Priority support" included />
          </View>
        </TouchableOpacity>

        <Text style={styles.legalText}>
          Pro subscription auto-renews at {"\u00A3"}3.99/month unless cancelled at least 24 hours before the trial ends. By subscribing you agree to our{' '}
          <Text style={styles.legalLink} onPress={() => router.push('/terms')}>Terms of Service</Text>.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, loading && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.continueBtnText}>
              {selectedPlan === 'basic' ? 'Continue with Basic' : 'Start Free Trial'}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function PlanFeature({ text, included }: { text: string; included: boolean }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons
        name={included ? 'checkmark-circle' : 'close-circle'}
        size={18}
        color={included ? '#4CAF50' : '#CCC'}
      />
      <Text style={[styles.featureText, !included && styles.featureTextDisabled]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollContent: { padding: 20, paddingBottom: 160 },
  header: { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginTop: 12 },
  subtitle: { fontSize: 15, color: '#666', marginTop: 6 },

  planCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: 'transparent' },
  planCardSelected: { borderColor: '#2DAFE3' },
  proCard: { position: 'relative', overflow: 'visible' },

  trialBadge: { position: 'absolute', top: -12, right: 16, backgroundColor: '#FF9800', flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 12, zIndex: 1, elevation: 2, shadowColor: '#FF9800', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  trialBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700', marginLeft: 4 },

  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  planIconWrap: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#E0F7FA', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  planTitleWrap: { flex: 1 },
  planName: { fontSize: 20, fontWeight: '700', color: '#333' },
  planPrice: { fontSize: 24, fontWeight: '800', color: '#2DAFE3' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  planPricePro: { fontSize: 24, fontWeight: '800', color: '#FF9800' },
  planPricePeriod: { fontSize: 14, color: '#999', marginLeft: 2 },
  trialNote: { fontSize: 12, color: '#999', marginTop: 2 },

  radioOuter: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
  radioOuterActive: { borderColor: '#2DAFE3' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2DAFE3' },

  planFeatures: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureText: { fontSize: 14, color: '#333', marginLeft: 8, flex: 1 },
  featureTextDisabled: { color: '#CCC' },

  legalText: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 8, lineHeight: 18, paddingHorizontal: 8 },
  legalLink: { color: '#2DAFE3', fontWeight: '600' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  continueBtn: { backgroundColor: '#2DAFE3', paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  continueBtnDisabled: { opacity: 0.6 },
  continueBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 15, color: '#999' },
});
