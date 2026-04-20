import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.updated}>Last Updated: 2 April 2025</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.text}>
Studynk ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
        </Text>

        <Text style={styles.sectionTitle}>2. Data Controller</Text>
        <Text style={styles.text}>
Studynk is the data controller responsible for your personal data.
{"\n\n"}Contact: studynk0@outlook.com
{"\n"}Registered in England and Wales
        </Text>

        <Text style={styles.sectionTitle}>3. Information We Collect</Text>
        
        <Text style={styles.subsectionTitle}>3.1 Information You Provide</Text>
        <Text style={styles.text}>
• Name and email address (via Google OAuth)
{"\n"}• University and course information
{"\n"}• Study preferences (style, goals, location)
{"\n"}• Weekly availability schedule
{"\n"}• Profile photo (optional)
{"\n"}• Messages sent within study groups
        </Text>

        <Text style={styles.subsectionTitle}>3.2 Automatically Collected Data</Text>
        <Text style={styles.text}>
• Device information (type, OS version)
{"\n"}• Usage data (app interactions, features used)
{"\n"}• Session data (login times, session duration)
{"\n"}• Push notification tokens (if enabled)
        </Text>

        <Text style={styles.subsectionTitle}>3.3 Third-Party Data</Text>
        <Text style={styles.text}>
• Google OAuth: We receive your name, email, and profile picture from Google when you sign in.
{"\n"}• Stripe Payments: We do NOT store credit card details. All payment data is securely processed and stored by Stripe PCI-DSS compliant systems.
        </Text>

        <Text style={styles.sectionTitle}>4. How We Use Your Data</Text>
        <Text style={styles.text}>
We use your information to:
{"\n\n"}• Match you with compatible study group members
{"\n"}• Facilitate communication within groups
{"\n"}• Process subscription payments via Stripe
{"\n"}• Track attendance and study streaks
{"\n"}• Send important service notifications
{"\n"}• Improve our matching algorithm
{"\n"}• Prevent fraud and abuse
{"\n"}• Comply with legal obligations
        </Text>

        <Text style={styles.sectionTitle}>5. Legal Basis for Processing (GDPR)</Text>
        <Text style={styles.text}>
We process your data under the following legal bases:
{"\n\n"}• Consent: When you agree to our terms and privacy policy
{"\n"}• Contract Performance: To provide study matching services
{"\n"}• Legitimate Interest: To improve services and prevent fraud
{"\n"}• Legal Obligation: To comply with UK laws and regulations
        </Text>

        <Text style={styles.sectionTitle}>6. Data Sharing</Text>
        <Text style={styles.text}>
We share your data only as follows:
{"\n\n"}• Study Group Members: Name, course, study preferences, and availability
{"\n"}• Stripe: Payment processing (they do NOT receive your personal profile data)
{"\n"}• Google: OAuth authentication (as per their privacy policy)
{"\n"}• Legal Requirements: When required by law or to protect rights
{"\n\n"}We do NOT sell your personal data to third parties.
        </Text>

        <Text style={styles.sectionTitle}>7. Data Retention</Text>
        <Text style={styles.text}>
• Active Accounts: We retain your data while your account is active
{"\n"}• Deleted Accounts: Personal data is anonymized within 30 days
{"\n"}• Study Logs: Anonymized data retained for service improvement
{"\n"}• Payment Records: Retained for 7 years (UK tax law requirement)
        </Text>

        <Text style={styles.sectionTitle}>8. Your Rights (GDPR/UK GDPR)</Text>
        <Text style={styles.text}>
You have the right to:
{"\n\n"}• Access: Request a copy of your personal data
{"\n"}• Rectification: Correct inaccurate data
{"\n"}• Erasure: Request deletion of your data ("right to be forgotten")
{"\n"}• Portability: Receive your data in a portable format
{"\n"}• Object: Object to processing based on legitimate interest
{"\n"}• Restrict Processing: Limit how we use your data
{"\n"}• Withdraw Consent: At any time, without affecting prior processing
{"\n\n"}To exercise these rights, contact: studynk0@outlook.com
        </Text>

        <Text style={styles.sectionTitle}>9. Data Security</Text>
        <Text style={styles.text}>
We implement industry-standard security measures:
{"\n\n"}• Encryption in transit (HTTPS/TLS)
{"\n"}• Encrypted database storage
{"\n"}• Secure authentication (Google OAuth)
{"\n"}• Regular security audits
{"\n"}• Access controls and logging
{"\n\n"}Note: Payments are securely processed by Stripe. Studynk does not store credit card details.
        </Text>

        <Text style={styles.sectionTitle}>10. International Transfers</Text>
        <Text style={styles.text}>
Your data is primarily stored in the UK/EU. If transferred outside the EEA, we ensure adequate safeguards are in place (e.g., Standard Contractual Clauses).
        </Text>

        <Text style={styles.sectionTitle}>11. Children's Privacy</Text>
        <Text style={styles.text}>
Studynk is intended for users aged 16 and over. We do not knowingly collect data from children under 16. If we discover such data, it will be deleted immediately.
        </Text>

        <Text style={styles.sectionTitle}>12. Cookies & Tracking</Text>
        <Text style={styles.text}>
We use essential cookies for:
{"\n\n"}• Authentication (session tokens)
{"\n"}• User preferences (language, settings)
{"\n\n"}We do NOT use third-party advertising or analytics cookies.
        </Text>

        <Text style={styles.sectionTitle}>13. Changes to This Policy</Text>
        <Text style={styles.text}>
We may update this Privacy Policy. Material changes will be notified via email or in-app notification. Continued use after changes constitutes acceptance.
        </Text>

        <Text style={styles.sectionTitle}>14. Contact & Complaints</Text>
        <Text style={styles.text}>
For privacy concerns or to exercise your rights:
{"\n\n"}Email: studynk0@outlook.com
{"\n\n"}You also have the right to lodge a complaint with the Information Commissioner's Office (ICO):
{"\n"}Website: ico.org.uk
{"\n"}Phone: 0303 123 1113
        </Text>

        <Text style={styles.sectionTitle}>15. Governing Law</Text>
        <Text style={styles.text}>
This Privacy Policy is governed by the laws of England and Wales.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  updated: {
    fontSize: 12,
    color: '#999',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A365D',
    marginTop: 24,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
});
