import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Linking,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ReviewModal from '../../components/ReviewModal';
import { useTheme } from '../../contexts/ThemeContext';
import * as Contacts from 'expo-contacts';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function HomeScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

  const fetchData = async () => {
    try {
      const groupRes = await fetch(`${BACKEND_URL}/api/groups/my-group`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (groupRes.ok) {
        const data = await groupRes.json();
        setGroup(data.group);
        setMembers(data.members);
      }

      const streakRes = await fetch(`${BACKEND_URL}/api/attendance/streak`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (streakRes.ok) {
        const data = await streakRes.json();
        setStreak(data.streak);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ─── User Search ───
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setSearching(true);
    setShowSearchResults(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setSearching(false);
    }
  };

  const handleFindMatch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/matching/find-matches`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) { await fetchData(); }
    } catch (error) {
      console.error('Match error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/attendance/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        const data = await response.json();
        Alert.alert('Checked In', `Study session #${data.total_checkins} logged!`);
        await fetchData();
        if (data.should_prompt_review) {
          setTimeout(() => setShowReviewModal(true), 600);
        }
      }
    } catch (error) {
      console.error('Check-in error:', error);
    }
  };

  const handleReviewSubmit = async (rating: number, feedback: string) => {
    const response = await fetch(`${BACKEND_URL}/api/reviews/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ rating, feedback }),
    });
    if (!response.ok) {
      const data = await response.json();
      Alert.alert('Error', data.detail || 'Failed to submit review');
      throw new Error('Submit failed');
    }
  };

  // ─── Invite Functions ───
  const loadContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Allow access to your contacts to invite friends.');
      return;
    }
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Name],
    });
    if (data.length > 0) {
      setContacts(data.filter(c => c.name));
      setContactsLoaded(true);
      setShowContacts(true);
    }
  };

  const handleInviteViaEmail = (email?: string) => {
    const to = email || inviteEmail.trim();
    if (!to) { Alert.alert('Enter Email', 'Please enter an email address.'); return; }
    const subject = encodeURIComponent('Join me on Studynk!');
    const body = encodeURIComponent('Hey! I\'m using Studynk to find compatible study partners at university. You should check it out!\n\nhttps://studynk.co.uk');
    Linking.openURL(`mailto:${to}?subject=${subject}&body=${body}`);
    setInviteEmail('');
  };

  const handleInviteViaSMS = (phone?: string) => {
    const to = phone || invitePhone.trim();
    if (!to) { Alert.alert('Enter Phone', 'Please enter a phone number.'); return; }
    const body = encodeURIComponent('Hey! Check out Studynk - it matches uni students into study groups. https://studynk.co.uk');
    const sep = Platform.OS === 'ios' ? '&' : '?';
    Linking.openURL(`sms:${to}${sep}body=${body}`);
    setInvitePhone('');
  };

  const filteredContacts = contactSearch
    ? contacts.filter(c => c.name?.toLowerCase().includes(contactSearch.toLowerCase()))
    : contacts.slice(0, 30);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header with Search */}
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <View style={styles.headerTop}>
          <View style={styles.greetingCol}>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.name, { color: theme.accent }]}>{user?.name?.split(' ')[0]}!</Text>
          </View>
        </View>
        <View style={[styles.searchBarRow, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students by name, email, phone..."
            placeholderTextColor="#BBB"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {searching && <ActivityIndicator size="small" color="#2DAFE3" />}
          {searchQuery.length > 0 && !searching && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); }}>
              <Ionicons name="close-circle" size={18} color="#CCC" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Results Dropdown */}
      {showSearchResults && (
        <View style={styles.searchResultsContainer}>
          {searchResults.length > 0 ? searchResults.map((u) => (
            <View key={u.user_id} style={styles.searchResultRow}>
              <View style={styles.searchAvatar}>
                <Text style={styles.searchAvatarText}>{(u.name || '?').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.searchName}>{u.name}</Text>
                <Text style={styles.searchSub} numberOfLines={1}>{u.email}{u.phone_number ? ` · ${u.phone_number}` : ''}</Text>
              </View>
              <TouchableOpacity
                style={styles.viewProfileBtn}
                onPress={() => {
                  setShowSearchResults(false);
                  setSearchQuery('');
                  router.push('/(tabs)/groups');
                }}
              >
                <Ionicons name="person-outline" size={16} color="#2DAFE3" />
              </TouchableOpacity>
            </View>
          )) : (
            searchQuery.length >= 2 && !searching && (
              <Text style={styles.noResultsText}>No students found</Text>
            )
          )}
        </View>
      )}

      {/* Streak Card */}
      <View style={[styles.streakCard, { backgroundColor: theme.card }]}>
        <View style={[styles.streakIcon, { backgroundColor: theme.mode === 'dark' ? '#3D2A1A' : '#FFF3E0' }]}>
          <Ionicons name="flame" size={32} color="#FF6B35" />
        </View>
        <View style={styles.streakContent}>
          <Text style={[styles.streakNumber, { color: theme.text }]}>{streak} day{streak !== 1 ? 's' : ''}</Text>
          <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>Study Streak</Text>
        </View>
        {group && (
          <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.checkInText}>Check In</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Find Matches - only visible if verified */}
      {!user?.is_verified ? (
        <View style={[styles.verificationBanner, { backgroundColor: theme.card }]}>
          <View style={styles.verificationIconWrap}>
            <Ionicons name="shield-outline" size={40} color="#F59E0B" />
          </View>
          <Text style={[styles.noGroupTitle, { color: theme.text }]}>Verify Your Email First</Text>
          <Text style={[styles.noGroupText, { color: theme.textSecondary }]}>
            You need to verify your university email before you can find and join study groups.
          </Text>
          <TouchableOpacity style={styles.verifyBannerBtn} onPress={() => router.push('/verify-account')}>
            <Ionicons name="mail-outline" size={18} color="#FFF" />
            <Text style={styles.verifyBannerBtnText}>Verify Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.noGroupCard, { backgroundColor: theme.card }]}>
          <Ionicons name="search" size={48} color={theme.accent} />
          <Text style={[styles.noGroupTitle, { color: theme.text }]}>Find Your Study Group</Text>
          <Text style={[styles.noGroupText, { color: theme.textSecondary }]}>
            {group ? 'Search for more compatible students to grow your group' : 'Get matched with compatible students in your course'}
          </Text>
          <TouchableOpacity style={styles.findButton} onPress={handleFindMatch} disabled={loading}>
            <Text style={styles.findButtonText}>{loading ? 'Searching...' : 'Find Matches'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.card }]} onPress={() => router.push('/schedule')} activeOpacity={0.7}>
            <Ionicons name="calendar" size={32} color={theme.accent} />
            <Text style={[styles.actionText, { color: theme.text }]}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.card }]} onPress={() => router.push('/(tabs)/groups')} activeOpacity={0.7}>
            <Ionicons name="people" size={32} color={theme.accent} />
            <Text style={[styles.actionText, { color: theme.text }]}>My Group</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.card }]} onPress={() => router.push('/(tabs)/messages')} activeOpacity={0.7}>
            <Ionicons name="chatbubbles" size={32} color={theme.accent} />
            <Text style={[styles.actionText, { color: theme.text }]}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.card }]} onPress={() => router.push('/study-spots')} activeOpacity={0.7}>
            <Ionicons name="search" size={32} color="#FF9800" />
            <Text style={[styles.actionText, { color: theme.text }]}>Search &{'\n'}Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.card }]} onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.7}>
            <Ionicons name="person" size={32} color={theme.accent} />
            <Text style={[styles.actionText, { color: theme.text }]}>Profile</Text>
          </TouchableOpacity>
          {/* Invite Friends Card */}
          <TouchableOpacity style={[styles.actionCard, styles.inviteCard]} onPress={() => setShowInviteModal(true)} activeOpacity={0.7}>
            <Ionicons name="person-add" size={32} color="#FFF" />
            <Text style={[styles.actionText, { color: '#FFF' }]}>Invite{'\n'}Friends</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Invite Modal */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Friends</Text>
              <TouchableOpacity onPress={() => { setShowInviteModal(false); setShowContacts(false); setContactSearch(''); }} style={styles.modalClose}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Email Invite */}
              <Text style={styles.modalLabel}>Invite via Email</Text>
              <View style={styles.inviteRow}>
                <Ionicons name="mail-outline" size={20} color="#2DAFE3" />
                <TextInput
                  style={styles.inviteInput}
                  placeholder="friend@university.ac.uk"
                  placeholderTextColor="#BBB"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.sendBtn} onPress={() => handleInviteViaEmail()}>
                  <Ionicons name="send" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Phone Invite */}
              <Text style={styles.modalLabel}>Invite via SMS</Text>
              <View style={styles.inviteRow}>
                <Ionicons name="call-outline" size={20} color="#2DAFE3" />
                <TextInput
                  style={styles.inviteInput}
                  placeholder="+44 7XXX XXXXXX"
                  placeholderTextColor="#BBB"
                  value={invitePhone}
                  onChangeText={setInvitePhone}
                  keyboardType="phone-pad"
                />
                <TouchableOpacity style={styles.sendBtn} onPress={() => handleInviteViaSMS()}>
                  <Ionicons name="send" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Contacts */}
              <TouchableOpacity style={styles.contactsBtn} onPress={loadContacts}>
                <Ionicons name="people-outline" size={22} color="#2DAFE3" />
                <Text style={styles.contactsBtnText}>
                  {showContacts ? 'Refresh Contact List' : 'Choose from Contacts'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#BBB" />
              </TouchableOpacity>

              {showContacts && (
                <View style={styles.contactsSection}>
                  <View style={styles.contactSearchRow}>
                    <Ionicons name="search" size={16} color="#999" />
                    <TextInput
                      style={styles.contactSearchInput}
                      placeholder="Search contacts..."
                      placeholderTextColor="#BBB"
                      value={contactSearch}
                      onChangeText={setContactSearch}
                    />
                  </View>
                  {filteredContacts.map((c, idx) => {
                    const phone = c.phoneNumbers?.[0]?.number;
                    const email = c.emails?.[0]?.email;
                    return (
                      <View key={c.id || idx} style={styles.contactRow}>
                        <View style={styles.contactAvatar}>
                          <Text style={styles.contactAvatarText}>{(c.name || '?').charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.contactName}>{c.name}</Text>
                          <Text style={styles.contactDetail} numberOfLines={1}>
                            {phone || email || 'No contact info'}
                          </Text>
                        </View>
                        <View style={styles.contactActions}>
                          {phone && (
                            <TouchableOpacity style={styles.contactActionBtn} onPress={() => handleInviteViaSMS(phone)}>
                              <Ionicons name="chatbubble-outline" size={16} color="#2DAFE3" />
                            </TouchableOpacity>
                          )}
                          {email && (
                            <TouchableOpacity style={styles.contactActionBtn} onPress={() => handleInviteViaEmail(email)}>
                              <Ionicons name="mail-outline" size={16} color="#2DAFE3" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                  {filteredContacts.length === 0 && (
                    <Text style={styles.noContactsText}>No contacts found</Text>
                  )}
                </View>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <ReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleReviewSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  /* ── Header ── */
  header: { padding: 20, paddingTop: 48, backgroundColor: '#FFF', paddingBottom: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  greetingCol: {},
  greeting: { fontSize: 16, color: '#666' },
  name: { fontSize: 28, fontWeight: 'bold', color: '#2DAFE3' },
  searchBarRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333', marginLeft: 8, padding: 0 },

  /* ── Search Results ── */
  searchResultsContainer: {
    backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#E8E8E8', overflow: 'hidden',
  },
  searchResultRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  searchAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#2DAFE3',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  searchAvatarText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  searchName: { fontSize: 15, fontWeight: '600', color: '#333' },
  searchSub: { fontSize: 12, color: '#888', marginTop: 1 },
  viewProfileBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#E0F7FA',
    justifyContent: 'center', alignItems: 'center',
  },
  noResultsText: { textAlign: 'center', color: '#999', fontSize: 14, padding: 16 },

  /* ── Streak ── */
  streakCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    margin: 16, padding: 20, borderRadius: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  streakIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF3E0',
    justifyContent: 'center', alignItems: 'center',
  },
  streakContent: { flex: 1, marginLeft: 16 },
  streakNumber: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  streakLabel: { fontSize: 14, color: '#666' },
  checkInButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2DAFE3',
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
  },
  checkInText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 4 },

  /* ── Find Match ── */
  noGroupCard: {
    backgroundColor: '#FFF', margin: 16, marginTop: 0, padding: 32, borderRadius: 16, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  noGroupTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 8 },
  noGroupText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  findButton: { backgroundColor: '#2DAFE3', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 24 },
  findButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  /* ── Quick Actions ── */
  quickActions: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%', backgroundColor: '#FFF', padding: 20, borderRadius: 12, alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  actionText: { fontSize: 14, color: '#333', marginTop: 8, fontWeight: '500', textAlign: 'center' },
  inviteCard: { backgroundColor: '#2DAFE3' },

  /* ── Invite Modal ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 14 },
  inviteRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA',
    borderRadius: 12, borderWidth: 1, borderColor: '#E8E8E8', paddingLeft: 12,
  },
  inviteInput: { flex: 1, paddingVertical: 13, paddingHorizontal: 8, fontSize: 15, color: '#333' },
  sendBtn: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: '#2DAFE3',
    justifyContent: 'center', alignItems: 'center', margin: 3,
  },

  /* ── Contacts ── */
  contactsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E0F7FA', borderRadius: 12, paddingVertical: 14, marginTop: 20,
  },
  contactsBtnText: { fontSize: 15, fontWeight: '600', color: '#2DAFE3', marginLeft: 8, marginRight: 4 },
  contactsSection: { marginTop: 12 },
  contactSearchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  contactSearchInput: { flex: 1, fontSize: 14, color: '#333', marginLeft: 6, padding: 0 },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  contactAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#DDD',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  contactAvatarText: { fontSize: 14, fontWeight: '700', color: '#666' },
  contactName: { fontSize: 15, fontWeight: '600', color: '#333' },
  contactDetail: { fontSize: 12, color: '#888', marginTop: 1 },
  contactActions: { flexDirection: 'row', gap: 6 },
  contactActionBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#E0F7FA',
    justifyContent: 'center', alignItems: 'center',
  },
  noContactsText: { textAlign: 'center', color: '#999', fontSize: 14, padding: 16 },

  /* ── Verification Banner ── */
  verificationBanner: {
    backgroundColor: '#FFF', margin: 16, marginTop: 0, padding: 32, borderRadius: 16, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    borderWidth: 1.5, borderColor: '#FDE68A',
  },
  verificationIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFFBEB',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  verifyBannerBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B',
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 24,
  },
  verifyBannerBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
