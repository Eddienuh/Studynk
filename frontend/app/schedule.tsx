import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Meeting {
  meeting_id: string;
  title: string;
  location: string;
  meeting_time: string;
  duration_minutes: number;
  notes: string;
  status: 'upcoming' | 'past';
  attendees: string[];
}

export default function ScheduleScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [past, setPast] = useState<Meeting[]>([]);
  const [course, setCourse] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notesModal, setNotesModal] = useState<Meeting | null>(null);
  const [notesText, setNotesText] = useState('');

  const fetchMeetings = useCallback(async () => {
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/meetings/list`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUpcoming(data.upcoming || []);
        setPast(data.past || []);
        setCourse(data.course || '');
      }
    } catch (e) {
      console.error('Failed to fetch meetings:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeetings();
    setRefreshing(false);
  };

  const handleViewNotes = (meeting: Meeting) => {
    setNotesText(meeting.notes || '');
    setNotesModal(meeting);
  };

  const handleSaveNotes = async () => {
    if (!notesModal) return;
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/meetings/${notesModal.meeting_id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ notes: notesText }),
      });
      // Update local state
      setPast(prev => prev.map(m =>
        m.meeting_id === notesModal.meeting_id ? { ...m, notes: notesText } : m
      ));
      setNotesModal(null);
      Alert.alert('Saved', 'Meeting notes updated.');
    } catch (e) {
      console.error('Save notes error:', e);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const renderMeetingCard = (meeting: Meeting) => {
    const isPast = meeting.status === 'past';
    return (
      <View
        key={meeting.meeting_id}
        style={[styles.meetingCard, isPast && { opacity: 0.6 }]}
      >
        {/* Status label */}
        <View style={[styles.statusLabel, isPast ? styles.statusPast : styles.statusUpcoming]}>
          <Text style={[styles.statusText, isPast ? styles.statusTextPast : styles.statusTextUpcoming]}>
            {isPast ? 'Past' : 'Upcoming'}
          </Text>
        </View>

        {/* Card body — existing card style kept */}
        <View style={styles.meetingBody}>
          <View style={styles.meetingLeft}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeText}>{formatTime(meeting.meeting_time)}</Text>
              <Text style={styles.dateText}>{formatDate(meeting.meeting_time)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.meetingInfo}>
              <Text style={styles.meetingTitle} numberOfLines={1}>{meeting.title}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#888" />
                <Text style={styles.locationText}>{meeting.location}</Text>
              </View>
              <View style={styles.durationRow}>
                <Ionicons name="time-outline" size={14} color="#888" />
                <Text style={styles.durationText}>{meeting.duration_minutes} min</Text>
              </View>
            </View>
          </View>

          {/* Action button */}
          {isPast ? (
            <TouchableOpacity
              style={styles.viewNotesBtn}
              onPress={() => handleViewNotes(meeting)}
            >
              <Ionicons name="document-text-outline" size={16} color="#888" />
              <Text style={styles.viewNotesBtnText}>View Notes</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.joinBtn}>
              <Ionicons name="videocam" size={16} color="#FFF" />
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Attendee dots */}
        <View style={styles.attendeesRow}>
          <Ionicons name="people-outline" size={14} color="#AAA" />
          <Text style={styles.attendeesText}>
            {meeting.attendees?.length || 0} member{(meeting.attendees?.length || 0) !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2DAFE3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Schedule</Text>
          {course ? <Text style={styles.headerSub}>{course}</Text> : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Upcoming section */}
        {upcoming.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {upcoming.map(renderMeetingCard)}
          </View>
        )}

        {/* Past section */}
        {past.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past</Text>
            {past.map(renderMeetingCard)}
          </View>
        )}

        {upcoming.length === 0 && past.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={56} color="#CCC" />
            <Text style={styles.emptyTitle}>No Meetings Yet</Text>
            <Text style={styles.emptyText}>Meetings will appear here once scheduled.</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Notes Modal */}
      <Modal visible={!!notesModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{notesModal?.title}</Text>
              <TouchableOpacity onPress={() => setNotesModal(null)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDate}>
              {notesModal ? `${formatDate(notesModal.meeting_time)} at ${formatTime(notesModal.meeting_time)}` : ''}
            </Text>
            <TextInput
              style={styles.notesInput}
              value={notesText}
              onChangeText={setNotesText}
              placeholder="Add meeting notes..."
              placeholderTextColor="#BBB"
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.saveNotesBtn} onPress={handleSaveNotes}>
              <Text style={styles.saveNotesBtnText}>Save Notes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#333' },
  headerSub: { fontSize: 13, color: '#888', marginTop: 2 },

  scrollContent: { padding: 16 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#555', marginBottom: 10 },

  /* ── Meeting Card (Teams-style, kept existing look) ── */
  meetingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  /* Status label */
  statusLabel: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 12,
  },
  statusUpcoming: { backgroundColor: '#E8F5E9' },
  statusPast: { backgroundColor: '#F0F0F0' },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statusTextUpcoming: { color: '#43A047' },
  statusTextPast: { color: '#999' },

  meetingBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingTop: 10,
  },
  meetingLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },

  timeBlock: { alignItems: 'center', minWidth: 56 },
  timeText: { fontSize: 16, fontWeight: '700', color: '#333' },
  dateText: { fontSize: 11, color: '#999', marginTop: 2 },

  divider: { width: 1, height: 36, backgroundColor: '#E0E0E0', marginHorizontal: 12 },

  meetingInfo: { flex: 1 },
  meetingTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  locationText: { fontSize: 12, color: '#888', marginLeft: 4 },
  durationRow: { flexDirection: 'row', alignItems: 'center' },
  durationText: { fontSize: 12, color: '#888', marginLeft: 4 },

  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2DAFE3',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 8,
  },
  joinBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600', marginLeft: 4 },

  viewNotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  viewNotesBtnText: { color: '#666', fontSize: 12, fontWeight: '600', marginLeft: 4 },

  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  attendeesText: { fontSize: 11, color: '#AAA', marginLeft: 4 },

  /* Empty state */
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#666', marginTop: 12 },
  emptyText: { fontSize: 14, color: '#999', marginTop: 4 },

  /* Notes modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 320,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333', flex: 1 },
  modalDate: { fontSize: 13, color: '#888', marginBottom: 16 },
  notesInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 14,
    fontSize: 15,
    color: '#333',
    minHeight: 120,
    maxHeight: 200,
  },
  saveNotesBtn: {
    backgroundColor: '#2DAFE3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveNotesBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
