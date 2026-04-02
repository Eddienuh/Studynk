import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.logo}
        />
        
        <Text style={styles.title}>StudyMatch</Text>
        <Text style={styles.tagline}>Find the perfect study group{"\n"}for your course in seconds</Text>
        
        <View style={styles.features}>
          <Feature icon="people" text="Match with compatible students" />
          <Feature icon="calendar" text="Find overlapping schedules" />
          <Feature icon="trending-up" text="Achieve better grades together" />
        </View>

        <TouchableOpacity 
          style={styles.getStartedButton} 
          onPress={() => router.push('/auth-start')}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
        
        <Text style={styles.footer}>Join 1000+ students finding better study groups</Text>
      </View>
    </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
    borderRadius: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2DAFE3',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
  },
  features: {
    width: '100%',
    marginBottom: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  getStartedButton: {
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
  getStartedText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  footer: {
    marginTop: 24,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
