import { usePostHog } from 'posthog-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const STUDY_STYLES = ['Active', 'Passive', 'Mixed'];
const GRADE_GOALS = ['High achiever', 'Pass-focused'];
const LOCATIONS = ['Library', 'Home', 'Campus spaces'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, refreshUser, token } = useAuth();
  const posthog = usePostHog();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    university: '',
    course: '',
    study_style: '',
    grade_goal: '',
    location_preference: '',
    work_ethic: 5,
    weekly_availability: [] as any[],
  });
  const [loading, setLoading] = useState(false);

  const addTimeSlot = () => {
    setFormData(prev => ({
      ...prev,
      weekly_availability: [
        ...prev.weekly_availability,
        { day: 'Monday', start_time: '09:00', end_time: '17:00' }
      ]
    }));
  };

  const updateTimeSlot = (index: number, field: string, value: string) => {
    const updated = [...formData.weekly_availability];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, weekly_availability: updated }));
  };

  const removeTimeSlot = (index: number) => {
    const updated = formData.weekly_availability.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, weekly_availability: updated }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        posthog?.capture('Onboarding_Finished');
        await refreshUser();
        router.replace('/choose-plan');
      } else {
        alert('Failed to save profile');
      }
    } catch (error) {
      console.error('Profile save error:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Basic Information</Text>
            <Text style={styles.label}>University</Text>
            <TextInput
              style={styles.input}
              value={formData.university}
              onChangeText={(text) => setFormData(prev => ({ ...prev, university: text }))}
              placeholder="Enter your university name"
              placeholderTextColor="#999"
            />
            
            <Text style={styles.label}>Course/Module</Text>
            <TextInput
              style={styles.input}
              value={formData.course}
              onChangeText={(text) => setFormData(prev => ({ ...prev, course: text }))}
              placeholder="e.g. Computer Science 101"
              placeholderTextColor="#999"
            />
          </View>
        );
      
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Study Preferences</Text>
            
            <Text style={styles.label}>Study Style</Text>
            <View style={styles.optionGrid}>
              {STUDY_STYLES.map(style => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.optionButton,
                    formData.study_style === style && styles.optionButtonSelected
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, study_style: style }))}
                >
                  <Text style={[
                    styles.optionText,
                    formData.study_style === style && styles.optionTextSelected
                  ]}>{style}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Grade Goal</Text>
            <View style={styles.optionGrid}>
              {GRADE_GOALS.map(goal => (
                <TouchableOpacity
                  key={goal}
                  style={[
                    styles.optionButton,
                    formData.grade_goal === goal && styles.optionButtonSelected
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, grade_goal: goal }))}
                >
                  <Text style={[
                    styles.optionText,
                    formData.grade_goal === goal && styles.optionTextSelected
                  ]}>{goal}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Preferred Location</Text>
            <View style={styles.optionGrid}>
              {LOCATIONS.map(loc => (
                <TouchableOpacity
                  key={loc}
                  style={[
                    styles.optionButton,
                    formData.location_preference === loc && styles.optionButtonSelected
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, location_preference: loc }))}
                >
                  <Text style={[
                    styles.optionText,
                    formData.location_preference === loc && styles.optionTextSelected
                  ]}>{loc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Availability</Text>
            <Text style={styles.subtitle}>When are you available to study?</Text>
            
            <ScrollView style={styles.timeSlotsContainer}>
              {formData.weekly_availability.map((slot, index) => (
                <View key={index} style={styles.timeSlot}>
                  <View style={styles.timeSlotRow}>
                    <Text style={styles.label}>Day</Text>
                    <View style={styles.daySelector}>
                      {DAYS.map(day => (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.dayButton,
                            slot.day === day && styles.dayButtonSelected
                          ]}
                          onPress={() => updateTimeSlot(index, 'day', day)}
                        >
                          <Text style={[
                            styles.dayButtonText,
                            slot.day === day && styles.dayButtonTextSelected
                          ]}>{day.slice(0, 3)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.timeRow}>
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.label}>Start</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={slot.start_time}
                        onChangeText={(text) => updateTimeSlot(index, 'start_time', text)}
                        placeholder="09:00"
                        placeholderTextColor="#999"
                      />
                    </View>
                    
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.label}>End</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={slot.end_time}
                        onChangeText={(text) => updateTimeSlot(index, 'end_time', text)}
                        placeholder="17:00"
                        placeholderTextColor="#999"
                      />
                    </View>
                    
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeTimeSlot(index)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#E53935" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity style={styles.addButton} onPress={addTimeSlot}>
              <Ionicons name="add-circle-outline" size={24} color="#2DAFE3" />
              <Text style={styles.addButtonText}>Add Time Slot</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <View style={styles.progressBar}>
            {[1, 2, 3].map(s => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  s <= step && styles.progressDotActive
                ]}
              />
            ))}
          </View>
        </View>

        {renderStep()}

        <View style={styles.navigation}>
          {step > 1 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setStep(step - 1)}
            >
              <Text style={styles.navButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          {step < 3 ? (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrimary]}
              onPress={() => setStep(step + 1)}
              disabled={!formData.university || !formData.course}
            >
              <Text style={styles.navButtonTextPrimary}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrimary]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.navButtonTextPrimary}>
                {loading ? 'Saving...' : 'Complete'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2DAFE3',
    marginBottom: 16,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    flex: 1,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: '#2DAFE3',
  },
  stepContent: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#DDD',
  },
  optionButtonSelected: {
    backgroundColor: '#2DAFE3',
    borderColor: '#2DAFE3',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#FFF',
  },
  timeSlotsContainer: {
    maxHeight: 300,
  },
  timeSlot: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  timeSlotRow: {
    marginBottom: 12,
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dayButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  dayButtonSelected: {
    backgroundColor: '#2DAFE3',
    borderColor: '#2DAFE3',
  },
  dayButtonText: {
    fontSize: 12,
    color: '#666',
  },
  dayButtonTextSelected: {
    color: '#FFF',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeInput: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  removeButton: {
    padding: 12,
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#E0F7FA',
    borderRadius: 12,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: '#2DAFE3',
    fontWeight: '600',
    marginLeft: 8,
  },
  navigation: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  navButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#2DAFE3',
  },
  navButtonPrimary: {
    backgroundColor: '#2DAFE3',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2DAFE3',
  },
  navButtonTextPrimary: {
    color: '#FFF',
  },
});
