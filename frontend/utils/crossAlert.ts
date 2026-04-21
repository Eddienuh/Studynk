import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/**
 * Cross-platform alert that works on both native (Alert.alert) and web (window.confirm/prompt).
 */
export function crossAlert(
  title: string,
  message: string,
  buttons?: AlertButton[]
) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  // Web fallback
  if (!buttons || buttons.length === 0) {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  // If there's only one button (OK), just show alert
  if (buttons.length === 1) {
    window.alert(`${title}\n\n${message}`);
    buttons[0].onPress?.();
    return;
  }

  // Find the destructive/action button and cancel button
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const actionBtn = buttons.find((b) => b.style === 'destructive') || buttons.find((b) => b.style !== 'cancel');

  if (actionBtn) {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) {
      actionBtn.onPress?.();
    } else {
      cancelBtn?.onPress?.();
    }
  } else {
    window.alert(`${title}\n\n${message}`);
  }
}

/**
 * Cross-platform action sheet / option picker for web and native.
 * On native: uses Alert.alert with multiple buttons.
 * On web: uses a simple numbered prompt.
 */
export function crossActionSheet(
  title: string,
  message: string,
  options: AlertButton[]
) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, options);
    return;
  }

  // Web: show numbered options via prompt
  const nonCancelOptions = options.filter((o) => o.style !== 'cancel');
  const optionList = nonCancelOptions.map((o, i) => `${i + 1}. ${o.text}`).join('\n');

  const choice = window.prompt(`${title}\n${message}\n\n${optionList}\n\nEnter a number:`);
  if (choice) {
    const idx = parseInt(choice, 10) - 1;
    if (idx >= 0 && idx < nonCancelOptions.length) {
      nonCancelOptions[idx].onPress?.();
    }
  }
}
