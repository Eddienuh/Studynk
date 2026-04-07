import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProfileScreen() {
  const { user, logout, token, refreshUser } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
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
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
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
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
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
      Alert.alert('Permission Required', 'Please allow camera access to take a profile picture.');
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
        Alert.alert('Success', 'Profile photo updated!');
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'Failed to upload photo');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Profile Photo', 'Choose how to update your photo', [
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
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
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <TouchableOpacity onPress={showPhotoOptions} style={styles.changePhotoLink}>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      {user?.university && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="school" size={20} color="#2DAFE3" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>University</Text>
                <Text style={styles.infoValue}>{user.university}</Text>
              </View>
            </View>
            {user.course && (
              <View style={styles.infoRow}>
                <Ionicons name="book" size={20} color="#2DAFE3" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Course</Text>
                  <Text style={styles.infoValue}>{user.course}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {user?.study_style && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study Preferences</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="bulb" size={20} color="#2DAFE3" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Study Style</Text>
                <Text style={styles.infoValue}>{user.study_style}</Text>
              </View>
            </View>
            {user.grade_goal && (
              <View style={styles.infoRow}>
                <Ionicons name="trophy" size={20} color="#2DAFE3" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Grade Goal</Text>
                  <Text style={styles.infoValue}>{user.grade_goal}</Text>
                </View>
              </View>
            )}
            {user.location_preference && (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color="#2DAFE3" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Preferred Location</Text>
                  <Text style={styles.infoValue}>{user.location_preference}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.settings.title')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingsItem} onPress={handleEditProfile}>
            <Ionicons name="create-outline" size={24} color="#2DAFE3" />
            <Text style={styles.settingsText}>{t('profile.settings.editProfile')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem} onPress={showPhotoOptions}>
            <Ionicons name="camera-outline" size={24} color="#2DAFE3" />
            <Text style={styles.settingsText}>Change Profile Photo</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem} onPress={() => router.push('/privacy')}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#2DAFE3" />
            <Text style={styles.settingsText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem} onPress={() => router.push('/terms')}>
            <Ionicons name="document-text-outline" size={24} color="#2DAFE3" />
            <Text style={styles.settingsText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <Ionicons name="information-circle-outline" size={24} color="#2DAFE3" />
            <Text style={styles.settingsText}>{t('profile.settings.about')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#E53935" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} disabled={deleting}>
        {deleting ? (
          <ActivityIndicator color="#E53935" size="small" />
        ) : (
          <>
            <Ionicons name="trash-outline" size={18} color="#E53935" />
            <Text style={styles.deleteText}>Delete Account</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>StudyMatch v1.0</Text>
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
    borderBottomWidth: 1,
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
    borderBottomWidth: 1,
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
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E53935',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E53935',
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
  footer: {
    alignItems: 'center',
    padding: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
});
