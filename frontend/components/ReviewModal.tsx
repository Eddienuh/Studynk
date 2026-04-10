import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => Promise<void>;
}

export default function ReviewModal({ visible, onClose, onSubmit }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Star scale animations
  const starScales = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      setRating(0);
      setFeedback('');
      setSubmitted(false);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleStarPress = (star: number) => {
    setRating(star);
    // Bounce animation
    Animated.sequence([
      Animated.timing(starScales[star - 1], {
        toValue: 1.4,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(starScales[star - 1], {
        toValue: 1,
        tension: 200,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, feedback);
      setSubmitted(true);
      // Auto-close after showing thank you
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const getStarColor = (star: number) => {
    if (star <= rating) {
      if (rating <= 2) return '#FF9800';
      if (rating <= 3) return '#FFC107';
      return '#FFD600';
    }
    return '#E0E0E0';
  };

  if (submitted) {
    return (
      <Modal visible={visible} transparent animationType="none">
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.thankYouContainer}>
              <View style={styles.thankYouIcon}>
                <Ionicons name="heart" size={48} color="#FF4081" />
              </View>
              <Text style={styles.thankYouTitle}>Thank You!</Text>
              <Text style={styles.thankYouText}>
                Your feedback helps us make StudyMatch better for everyone.
              </Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="none">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.overlayTouch} activeOpacity={1} onPress={Keyboard.dismiss}>
          <Animated.View
            style={[
              styles.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Close button */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.headerSection}>
              <View style={styles.emojiCircle}>
                <Text style={styles.emoji}>
                  {rating === 0 ? '🎓' : rating <= 2 ? '😔' : rating <= 3 ? '😊' : rating <= 4 ? '🤩' : '🌟'}
                </Text>
              </View>
              <Text style={styles.title}>How's StudyMatch?</Text>
              <Text style={styles.subtitle}>
                Your first study session is scheduled! Rate your experience so far.
              </Text>
            </View>

            {/* Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleStarPress(star)}
                  activeOpacity={0.7}
                  style={styles.starTouch}
                >
                  <Animated.View style={{ transform: [{ scale: starScales[star - 1] }] }}>
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={42}
                      color={getStarColor(star)}
                    />
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </View>

            {rating > 0 && (
              <Text style={styles.ratingLabel}>{STAR_LABELS[rating]}</Text>
            )}

            {/* Feedback input — shows after selecting a rating */}
            {rating > 0 && (
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackLabel}>
                  {rating <= 3
                    ? 'What could we do better?'
                    : 'What do you love about StudyMatch?'}
                </Text>
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Share your thoughts (optional)"
                  placeholderTextColor="#B0B0B0"
                  value={feedback}
                  onChangeText={setFeedback}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
                {feedback.length > 0 && (
                  <Text style={styles.charCount}>{feedback.length}/500</Text>
                )}
              </View>
            )}

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={rating === 0 || submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Review</Text>
              )}
            </TouchableOpacity>

            {/* Skip */}
            <TouchableOpacity style={styles.skipBtn} onPress={onClose}>
              <Text style={styles.skipText}>Maybe later</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  emojiCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  starTouch: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFC107',
    marginBottom: 16,
  },

  feedbackSection: {
    width: '100%',
    marginBottom: 16,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  feedbackInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    padding: 14,
    fontSize: 15,
    color: '#333',
    minHeight: 80,
    maxHeight: 140,
  },
  charCount: {
    fontSize: 11,
    color: '#B0B0B0',
    textAlign: 'right',
    marginTop: 4,
  },

  submitBtn: {
    backgroundColor: '#1A365D',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#B0D4E8',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  skipBtn: {
    paddingVertical: 10,
    marginTop: 4,
  },
  skipText: {
    fontSize: 14,
    color: '#999',
  },

  // Thank you state
  thankYouContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  thankYouIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  thankYouTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  thankYouText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
});
