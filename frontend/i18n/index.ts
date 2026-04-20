import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';

const i18n = new I18n({
  en,
  es,
  fr,
});

// Set default locale
i18n.locale = 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// Load saved language preference
export const loadLanguagePreference = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem('language');
    if (savedLanguage) {
      i18n.locale = savedLanguage;
    }
  } catch (error) {
    console.log('Error loading language preference:', error);
  }
};

// Save language preference
export const saveLanguagePreference = async (language: string) => {
  try {
    await AsyncStorage.setItem('language', language);
    i18n.locale = language;
  } catch (error) {
    console.log('Error saving language preference:', error);
  }
};

export default i18n;
