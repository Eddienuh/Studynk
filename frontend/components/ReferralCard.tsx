import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReferralCardProps {
  userId?: string;
  token?: string | null;
}

export default function ReferralCard({ userId, token }: ReferralCardProps) {
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralCount, setReferralCount] = useState<number>(0);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      
      // Get subscription status
      const statusRes = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/subscription/status`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (statusRes.ok) {
        const data = await statusRes.json();
        setReferralCode(data.referral_code || '');
        setReferralCount(data.referrals_count || 0);
        setIsPro(data.is_pro || false);
        
        // Generate code if doesn't exist
        if (!data.referral_code) {
          await generateReferralCode();
        }
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    }
  };

  const generateReferralCode = async () => {
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/subscription/generate-referral`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (response.ok) {
        const data = await response.json();
        setReferralCode(data.referral_code);
      }
    } catch (error) {
      console.error('Error generating referral code:', error);
    }
  };

  const handleShare = async () => {
    if (!referralCode) {
      Alert.alert('Error', 'Referral code not available');
      return;
    }

    try {
      const message = `Join me on StudyMatch! 📚\n\nFind the perfect study group for your course.\n\nUse my referral code: ${referralCode}\n\nDownload now: [App Link]`;
      
      await Share.share({
        message: message,
        title: 'Join StudyMatch',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const progressToReward = Math.min(referralCount, 3);
  const rewardProgress = (progressToReward / 3) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="gift" size={24} color="#2DAFE3" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Invite Friends</Text>
          <Text style={styles.subtitle}>Get 1 month Pro free!</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${rewardProgress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {referralCount}/3 friends invited
        </Text>
      </View>

      {!isPro && referralCount >= 2 && (
        <View style={styles.rewardBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
          <Text style={styles.rewardText}>Almost there! 1 more friend = Pro free!</Text>
        </View>
      )}

      <View style={styles.codeContainer}>
        <Text style={styles.codeLabel}>Your Referral Code</Text>
        <View style={styles.codeBox}>
          <Text style={styles.code}>{referralCode || 'Loading...'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Ionicons name="share-social" size={20} color="#FFF" />
        <Text style={styles.shareButtonText}>Share with Friends</Text>
      </TouchableOpacity>

      <Text style={styles.benefits}>Invite 2-3 friends to unlock 1 month of Pro for free!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#2DAFE3',
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2DAFE3',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  rewardText: {
    fontSize: 12,
    color: '#2E7D32',
    marginLeft: 6,
    fontWeight: '600',
  },
  codeContainer: {
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  codeBox: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2DAFE3',
    borderStyle: 'dashed',
  },
  code: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2DAFE3',
    textAlign: 'center',
    letterSpacing: 2,
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#2DAFE3',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  benefits: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});
