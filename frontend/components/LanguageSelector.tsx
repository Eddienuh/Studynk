import React, { useState } from 'react';
import {\n  View,\n  Text,\n  StyleSheet,\n  TouchableOpacity,\n  Modal,\n  ScrollView,\n} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

export default function LanguageSelector() {
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const handleLanguageChange = async (languageCode: string) => {
    await changeLanguage(languageCode);
    setModalVisible(false);
  };

  const currentLang = LANGUAGES.find(lang => lang.code === currentLanguage) || LANGUAGES[0];

  return (
    <>
      <TouchableOpacity 
        style={styles.settingsItem} 
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="language" size={24} color="#2DAFE3" />
        <View style={styles.languageInfo}>
          <Text style={styles.settingsText}>{t('profile.settings.language')}</Text>
          <Text style={styles.currentLanguage}>{currentLang.flag} {currentLang.name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#CCC" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.settings.language')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.languageList}>
              {LANGUAGES.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageOption,
                    currentLanguage === language.code && styles.languageOptionSelected
                  ]}
                  onPress={() => handleLanguageChange(language.code)}
                >
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                  <Text style={[
                    styles.languageName,
                    currentLanguage === language.code && styles.languageNameSelected
                  ]}>
                    {language.name}
                  </Text>
                  {currentLanguage === language.code && (
                    <Ionicons name="checkmark-circle" size={24} color="#2DAFE3" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  languageInfo: {
    flex: 1,
    marginLeft: 12,
  },
  settingsText: {
    fontSize: 16,
    color: '#333',
  },
  currentLanguage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  languageList: {
    padding: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  languageOptionSelected: {
    backgroundColor: '#E0F7FA',
    borderWidth: 2,
    borderColor: '#2DAFE3',
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageName: {
    flex: 1,
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  languageNameSelected: {
    color: '#2DAFE3',
    fontWeight: '600',
  },
});
