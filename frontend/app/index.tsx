import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && user) {
      if (!user.onboarding_completed) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [user, loading]);

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth-callback`
      : 'http://localhost:3000/auth-callback';
    
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    
    if (typeof window !== 'undefined') {
      window.location.href = authUrl;
    } else {
      Linking.openURL(authUrl);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.logo}
        />
        
        <Text style={styles.title}>{t('landing.title')}</Text>
        <Text style={styles.subtitle}>{t('landing.subtitle')}</Text>
        
        <View style={styles.features}>
          <Feature icon="checkmark-circle" text={t('landing.features.aiMatching')} />
          <Feature icon="calendar" text={t('landing.features.scheduleCoordination')} />
          <Feature icon="trending-up" text={t('landing.features.trackProgress')} />
          <Feature icon="location" text={t('landing.features.findSpots')} />
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Ionicons name="logo-google" size={24} color="#fff" style={styles.googleIcon} />
          <Text style={styles.loginButtonText}>{t('landing.signInButton')}</Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>{t('landing.emailRequired')}</Text>
      </View>
    </View>
  );
}

function Feature({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name={icon} size={24} color="#2DAFE3" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 24,
    borderRadius: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2DAFE3',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 48,
    textAlign: 'center',
  },
  features: {
    width: '100%',
    marginBottom: 48,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#2DAFE3',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  googleIcon: {
    marginRight: 12,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});
