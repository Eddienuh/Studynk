import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function GroupsScreen() {
  const { user, token } = useAuth();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteList, setInviteList] = useState<string[]>([]);
  const [streakEnabled, setStreakEnabled] = useState(true);

  const fetchGroup = async () => {
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groups/my-group`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setGroup(data.group);
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to fetch group:', error);
    }
  };

  useEffect(() => {
    fetchGroup();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGroup();
    setRefreshing(false);
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group? You can find a new match afterwards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
              const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groups/leave`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              
              if (response.ok) {
                alert('Left group successfully');
                await fetchGroup();
              }
            } catch (error) {
              console.error('Leave group error:', error);
            }
          },
        },
      ]
    );
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Required', 'Please enter a group name.');
      return;
    }
    setCreating(true);
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          group_name: newGroupName.trim(),
          location: newLocation.trim(),
          invite_emails: inviteList,
          streak_enabled: streakEnabled,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setShowCreateModal(false);
        setNewGroupName('');
        setNewLocation('');
        setInviteList([]);
        setInviteEmail('');
        setStreakEnabled(true);
        Alert.alert('Success', 'Study group created!');
        await fetchGroup();
      } else {
        Alert.alert('Error', data.detail || 'Failed to create group');
      }
    } catch (error) {
      console.error('Create group error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const handleAddInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid', 'Enter a valid email address.');
      return;
    }
    if (inviteList.includes(email)) {
      Alert.alert('Duplicate', 'This email is already added.');
      return;
    }
    setInviteList(prev => [...prev, email]);
    setInviteEmail('');
  };

  const handleRemoveInvite = (email: string) => {
    setInviteList(prev => prev.filter(e => e !== email));
  };

  const renderCreateModal = () => (
    <Modal visible={showCreateModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Study Group</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Group Name */}
            <Text style={styles.modalLabel}>Group Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="e.g. CS101 Study Squad"
              placeholderTextColor="#BBB"
            />

            {/* Invite Friends */}
            <Text style={styles.modalLabel}>Invite Friends</Text>
            <View style={styles.inviteRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginRight: 8 }]}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="friend@university.ac.uk"
                placeholderTextColor="#BBB"
                keyboardType="email-address"
                autoCapitalize="none"
                onSubmitEditing={handleAddInvite}
              />
              <TouchableOpacity style={styles.addInviteBtn} onPress={handleAddInvite}>
                <Ionicons name="person-add" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
            {inviteList.length > 0 && (
              <View style={styles.inviteChips}>
                {inviteList.map(email => (
                  <View key={email} style={styles.chip}>
                    <Text style={styles.chipText} numberOfLines={1}>{email}</Text>
                    <TouchableOpacity onPress={() => handleRemoveInvite(email)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={16} color="#999" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Meetup Location */}
            <Text style={styles.modalLabel}>Preferred Meetup Location</Text>
            <TextInput
              style={styles.modalInput}
              value={newLocation}
              onChangeText={setNewLocation}
              placeholder="e.g. Main Library, Room 2.14"
              placeholderTextColor="#BBB"
            />

            {/* Study Streak Toggle */}
            <TouchableOpacity
              style={styles.streakRow}
              onPress={() => setStreakEnabled(!streakEnabled)}
              activeOpacity={0.7}
            >
              <View style={styles.streakLeft}>
                <View style={[styles.streakIcon, streakEnabled && styles.streakIconActive]}>
                  <Ionicons name="flame" size={22} color={streakEnabled ? '#FFF' : '#CCC'} />
                </View>
                <View style={styles.streakInfo}>
                  <Text style={styles.streakTitle}>Weekly Study Streak</Text>
                  <Text style={styles.streakDesc}>Keep the streak alive by meeting once a week</Text>
                </View>
              </View>
              <View style={[styles.toggle, streakEnabled && styles.toggleActive]}>
                <View style={[styles.toggleThumb, streakEnabled && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.modalCreateBtn, !newGroupName.trim() && { opacity: 0.5 }]}
              onPress={handleCreateGroup}
              disabled={creating || !newGroupName.trim()}
            >
              {creating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.modalCreateBtnText}>Create Group</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (!group) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Groups</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No Group Yet</Text>
          <Text style={styles.emptyText}>
            Find your study group from the Home tab{'\n'}or create one with the + button above
          </Text>
        </View>
        {renderCreateModal()}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Your Study Group</Text>
        <TouchableOpacity
          style={[styles.createBtn, styles.createBtnDisabled]}
          onPress={() => Alert.alert('Already in a group', 'Leave your current group first to create a new one.')}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.compatibilityCard}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreNumber}>{Math.round(group.compatibility_score)}</Text>
          <Text style={styles.scoreLabel}>%</Text>
        </View>
        <View style={styles.compatibilityInfo}>
          <Text style={styles.compatibilityTitle}>Compatibility Score</Text>
          <Text style={styles.compatibilityText}>
            High compatibility leads to better study outcomes
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members ({members.length})</Text>
        {members.map((member) => (
          <View key={member.user_id} style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberInitial}>
                {member.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberDetail}>{member.study_style || 'Mixed style'}</Text>
            </View>
            {member.user_id === user?.user_id && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Group Details</Text>
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Ionicons name="book" size={20} color="#2DAFE3" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Course</Text>
              <Text style={styles.detailValue}>{group.course}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location" size={20} color="#2DAFE3" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Preferred Location</Text>
              <Text style={styles.detailValue}>{group.suggested_location}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={20} color="#2DAFE3" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>
                {new Date(group.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Group Health</Text>
        <View style={styles.healthCard}>
          <View style={styles.healthBar}>
            <View style={[styles.healthFill, { width: `${group.health_score}%` }]} />
          </View>
          <Text style={styles.healthText}>{Math.round(group.health_score)}% Active</Text>
          <Text style={styles.healthSubtext}>
            Keep attending sessions to maintain group health
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
        <Ionicons name="exit-outline" size={20} color="#E53935" />
        <Text style={styles.leaveButtonText}>Leave Group</Text>
      </TouchableOpacity>

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
    backgroundColor: '#FFF',
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2DAFE3',
  },
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2DAFE3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#2DAFE3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  createBtnDisabled: {
    backgroundColor: '#B0BEC5',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  compatibilityCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#2DAFE3',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2DAFE3',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#2DAFE3',
  },
  compatibilityInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  compatibilityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  compatibilityText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2DAFE3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  memberDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  youBadge: {
    backgroundColor: '#E0F7FA',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  youBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2DAFE3',
  },
  detailCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  healthCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  healthBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  healthFill: {
    height: '100%',
    backgroundColor: '#2DAFE3',
  },
  healthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  healthSubtext: {
    fontSize: 14,
    color: '#666',
  },
  leaveButton: {
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
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E53935',
    marginLeft: 8,
  },

  /* Create Group Modal */
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 14,
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 14,
    fontSize: 15,
    color: '#333',
  },

  /* Invite friends */
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addInviteBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2DAFE3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7FA',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    maxWidth: '90%',
  },
  chipText: {
    fontSize: 13,
    color: '#00838F',
    marginRight: 6,
    flexShrink: 1,
  },

  /* Study Streak toggle */
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  streakIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakIconActive: {
    backgroundColor: '#FF9800',
  },
  streakInfo: {
    marginLeft: 12,
    flex: 1,
  },
  streakTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  streakDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DDD',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#2DAFE3',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },

  modalCreateBtn: {
    backgroundColor: '#2DAFE3',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
    minHeight: 52,
    justifyContent: 'center',
  },
  modalCreateBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
