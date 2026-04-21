import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { crossAlert, crossActionSheet } from '../../utils/crossAlert';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProfileScreen() {
  const { user, logout, token, refreshUser } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  };
  const [subTier, setSubTier] = useState('free');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/subscription/status`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSubTier(data.tier || 'free');
        }
      } catch {}
    })();
  }, []);

  const handleLogout = () => {
    crossAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    crossAlert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            crossAlert(
              'Are you absolutely sure?',
              'All your study groups, messages, and profile data will be permanently erased.',
              [
                { text: 'Keep Account', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: performDeleteAccount,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const performDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/delete-account`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        await logout();
        router.replace('/welcome');
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'Failed to delete account');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      crossAlert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      await uploadPhoto(result.assets[0].base64, result.assets[0].mimeType || 'image/jpeg');
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      crossAlert('Permission Required', 'Please allow camera access to take a profile picture.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      await uploadPhoto(result.assets[0].base64, result.assets[0].mimeType || 'image/jpeg');
    }
  };

  const uploadPhoto = async (base64Data: string, mimeType: string) => {
    setUploading(true);
    try {
      const photoUri = `data:${mimeType};base64,${base64Data}`;
      const response = await fetch(`${BACKEND_URL}/api/users/upload-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ photo: photoUri }),
      });

      if (response.ok) {
        await refreshUser();
        crossAlert('Success', 'Profile photo updated!');
      } else {
        const data = await response.json();
        crossAlert('Error', data.detail || 'Failed to upload photo');
      }
    } catch (error) {
      crossAlert('Error', 'Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const showPhotoOptions = () => {
    crossActionSheet('Profile Photo', 'Choose how to update your photo', [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Library', onPress: handlePickPhoto },
      ...(user?.profile_photo ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: removePhoto }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const removePhoto = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/upload-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ photo: '' }),
      });
      if (response.ok) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Remove photo error:', error);
    }
  };

  const handleEditProfile = () => {
    router.push('/onboarding');
  };

  const profilePhoto = user?.profile_photo || user?.picture;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <TouchableOpacity onPress={showPhotoOptions} style={styles.avatarContainer}>
          {uploading ? (
            <View style={styles.avatarPlaceholder}>
              <ActivityIndicator size="large" color="#2DAFE3" />
            </View>
          ) : profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.cameraOverlay}>
            <Ionicons name="camera" size={16} color="#FFF" />
          </View>
        </TouchableOpacity>
        <Text style={[styles.name, { color: theme.text }]}>{user?.name}</Text>
        <Text style={[styles.email, { color: theme.textSecondary }]}>{user?.email}</Text>
        <TouchableOpacity onPress={showPhotoOptions} style={styles.changePhotoLink}>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Subscription Card */}
      <View style={[styles.section, { backgroundColor: theme.bg }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Subscription</Text>
        <View style={styles.subCard}>
          <View style={styles.subLeft}>
            <View style={[styles.subBadge, subTier === 'pro' ? styles.subBadgePro : subTier === 'basic' ? styles.subBadgeBasic : styles.subBadgeFree]}>
              <Ionicons name={subTier === 'pro' ? 'diamond' : subTier === 'basic' ? 'star' : 'star-outline'} size={16} color="#FFF" />
              <Text style={styles.subBadgeText}>
                {subTier === 'pro' ? 'Pro' : subTier === 'basic' ? 'Basic' : 'Free'}
              </Text>
            </View>
            <Text style={styles.subDesc}>
              {subTier === 'pro'
                ? 'All premium features unlocked'
                : subTier === 'basic'
                ? 'Core study matching features'
                : 'Limited features — upgrade to unlock more'}
            </Text>
          </View>
          {subTier !== 'pro' && (
            <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/choose-plan')}>
              <Ionicons name="arrow-up-circle" size={18} color="#FFF" />
              <Text style={styles.upgradeBtnText}>Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {user?.university && (
        <View style={[styles.section, { backgroundColor: theme.bg }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Academic Information</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.infoRow, { borderBottomColor: theme.divider }, !user.course && { borderBottomWidth: 0 }]}>
              <Ionicons name="school" size={20} color="#2DAFE3" />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>University</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{user.university}</Text>
              </View>
            </View>
            {user.course && (
              <View style={[styles.infoRow, { borderBottomColor: theme.divider, borderBottomWidth: 0 }]}>
                <Ionicons name="book" size={20} color="#2DAFE3" />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Course</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{user.course}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {user?.study_style && (
        <View style={[styles.section, { backgroundColor: theme.bg }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Study Preferences</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.infoRow, { borderBottomColor: theme.divider }]}>
              <Ionicons name="bulb" size={20} color="#2DAFE3" />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Study Style</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{user.study_style}</Text>
              </View>
            </View>
            {user.grade_goal && (
              <View style={[styles.infoRow, { borderBottomColor: theme.divider }]}>
                <Ionicons name="trophy" size={20} color="#2DAFE3" />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Grade Goal</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{user.grade_goal}</Text>
                </View>
              </View>
            )}
            {user.location_preference && (
              <View style={[styles.infoRow, { borderBottomColor: theme.divider, borderBottomWidth: 0 }]}>
                <Ionicons name="location" size={20} color="#2DAFE3" />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Preferred Location</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{user.location_preference}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: theme.bg }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('profile.settings.title')}</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <TouchableOpacity style={[styles.settingsItem, { borderBottomColor: theme.divider }]} onPress={handleEditProfile}>
            <Ionicons name="create-outline" size={24} color="#2DAFE3" />
            <Text style={[styles.settingsText, { color: theme.text }]}>{t('profile.settings.editProfile')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.settingsItem, { borderBottomColor: theme.divider }]} onPress={showPhotoOptions}>
            <Ionicons name="camera-outline" size={24} color="#2DAFE3" />
            <Text style={[styles.settingsText, { color: theme.text }]}>Change Profile Photo</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.settingsItem, { borderBottomColor: theme.divider }]} onPress={() => router.push('/privacy')}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#2DAFE3" />
            <Text style={[styles.settingsText, { color: theme.text }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.settingsItem, { borderBottomColor: theme.divider }]} onPress={() => router.push('/terms')}>
            <Ionicons name="document-text-outline" size={24} color="#2DAFE3" />
            <Text style={[styles.settingsText, { color: theme.text }]}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsItem, { borderBottomWidth: 0 }]}>
            <Ionicons name="information-circle-outline" size={24} color="#2DAFE3" />
            <Text style={[styles.settingsText, { color: theme.text }]}>{t('profile.settings.about')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Appearance */}
      <View style={[styles.section, { backgroundColor: theme.card, borderRadius: 12, marginHorizontal: 16, marginBottom: 12, padding: 16 }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
        <TouchableOpacity style={styles.themeToggleRow} onPress={toggleTheme} activeOpacity={0.7}>
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={isDark ? '#FFD700' : '#FF9800'} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.themeToggleLabel, { color: theme.text }]}>Dark Mode</Text>
            <Text style={{ fontSize: 13, color: theme.textMuted }}>{isDark ? 'On' : 'Off'}</Text>
          </View>
          <View style={[styles.themeToggle, isDark && styles.themeToggleActive]}>
            <View style={[styles.themeToggleThumb, isDark && styles.themeToggleThumbActive]} />
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#FFF" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Legal & Safety */}
      <View style={[styles.section, { backgroundColor: theme.bg }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Legal & Safety</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.legalRow, { borderBottomColor: theme.divider }]}>
            <Ionicons name="time-outline" size={20} color="#888" />
            <Text style={[styles.legalText, { color: theme.textSecondary }]}>Accounts inactive for 24 months will be deleted.</Text>
          </View>
          <View style={[styles.legalRow, { borderBottomColor: theme.divider }]}>
            <Ionicons name="card-outline" size={20} color="#888" />
            <Text style={[styles.legalText, { color: theme.textSecondary }]}>
              As Studynk provides instant digital access to Priority Boosts, all sales are final. By upgrading, you waive your 14-day right to cancel. Contact studynk0@outlook.com for support.
            </Text>
          </View>
          <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount} disabled={deleting}>
            {deleting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#FFF" />
                <Text style={styles.deleteAccountBtnText}>Delete My Account</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Studynk v1.0</Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#2DAFE3',
    padding: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2DAFE3',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  changePhotoLink: {
    marginTop: 4,
    paddingVertical: 4,
  },
  changePhotoText: {
    color: '#E0F7FA',
    fontSize: 14,
    fontWeight: '500',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#E0F7FA',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  settingsText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E53935',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    minHeight: 48,
  },
  logoutText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    minHeight: 48,
  },
  deleteText: {
    fontSize: 14,
    color: '#E53935',
    marginLeft: 6,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  legalText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E53935',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 16,
    minHeight: 48,
  },
  deleteAccountBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  themeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  themeToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DDD',
    padding: 2,
    justifyContent: 'center',
  },
  themeToggleActive: {
    backgroundColor: '#2DAFE3',
  },
  themeToggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  themeToggleThumbActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    alignItems: 'center',
    padding: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },

  /* Subscription Card */
  subCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  subLeft: {
    flex: 1,
    marginRight: 12,
  },
  subBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  subBadgeFree: { backgroundColor: '#B0BEC5' },
  subBadgeBasic: { backgroundColor: '#2DAFE3' },
  subBadgePro: { backgroundColor: '#FF9800' },
  subBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 4,
  },
  subDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2DAFE3',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  upgradeBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
});
