import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PricingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A365D" />
        </TouchableOpacity>

        <Text style={styles.heading}>Choose Your Plan</Text>
        <Text style={styles.subheading}>
          Get Invited First. Pro users are seen by 90% more study groups.
        </Text>

        {/* Basic Plan */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="star" size={24} color="#1A365D" />
            <Text style={styles.planName}>Basic</Text>
          </View>
          <Text style={styles.price}>{"\u00A3"}2.99<Text style={styles.period}>/mo</Text></Text>
          <Text style={styles.tagline}>The Essentials. Send unlimited invites and get a verified student badge.</Text>
          <View style={styles.features}>
            <Feature text="Unlimited Invites" />
            <Feature text="Ad-Free Experience" />
            <Feature text="Verified Student Badge" />
          </View>
          <TouchableOpacity style={styles.selectBtn} onPress={() => router.push('/choose-plan')}>
            <Text style={styles.selectBtnText}>Get Basic</Text>
          </TouchableOpacity>
        </View>

        {/* Pro Plan */}
        <View style={[styles.card, styles.cardPro]}>
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
          <View style={styles.cardHeader}>
            <Ionicons name="diamond" size={24} color="#FF9800" />
            <Text style={[styles.planName, { color: '#FF9800' }]}>Pro</Text>
          </View>
          <Text style={[styles.price, { color: '#FF9800' }]}>{"\u00A3"}4.99<Text style={styles.period}>/mo</Text></Text>
          <Text style={styles.tagline}>The Closer. Priority Discovery Boost + everything in Basic.</Text>
          <View style={styles.features}>
            <Feature text="Priority Discovery Boost" />
            <Feature text="Everything in Basic" />
            <Feature text={"\u26A1 Boosted Profile Status"} />
            <Feature text="Unlimited Study Groups" />
            <Feature text="Group Analytics & Insights" />
          </View>
          <TouchableOpacity style={[styles.selectBtn, styles.selectBtnPro]} onPress={() => router.push('/choose-plan')}>
            <Text style={styles.selectBtnText}>Get Pro</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legal}>
          Digital services (Boosts) are non-refundable once activated. Users waive the 14-day cancellation right upon accessing Pro features.
        </Text>
        <Text style={styles.support}>Support: studynk0@outlook.com</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 24 },
  backBtn: { marginBottom: 16, width: 44, height: 44, justifyContent: 'center' },
  heading: { fontSize: 28, fontWeight: '800', color: '#1A365D', marginBottom: 6 },
  subheading: { fontSize: 15, color: '#5D6B7A', lineHeight: 22, marginBottom: 24 },
  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 24, marginBottom: 16,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  cardPro: { borderColor: '#FF9800', position: 'relative' },
  popularBadge: {
    position: 'absolute', top: -12, right: 16, backgroundColor: '#FF9800',
    paddingVertical: 4, paddingHorizontal: 14, borderRadius: 12,
  },
  popularBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  planName: { fontSize: 22, fontWeight: '700', color: '#1A365D', marginLeft: 8 },
  price: { fontSize: 36, fontWeight: '800', color: '#1A365D', marginBottom: 8 },
  period: { fontSize: 16, fontWeight: '400', color: '#94A3B8' },
  tagline: { fontSize: 15, color: '#5D6B7A', lineHeight: 22, marginBottom: 16 },
  features: { marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  featureText: { fontSize: 15, color: '#334155', marginLeft: 10, flex: 1 },
  selectBtn: {
    backgroundColor: '#1A365D', paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', minHeight: 52, justifyContent: 'center',
  },
  selectBtnPro: { backgroundColor: '#FF9800' },
  selectBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  legal: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 16, lineHeight: 18, paddingHorizontal: 8 },
  support: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 8 },
});
