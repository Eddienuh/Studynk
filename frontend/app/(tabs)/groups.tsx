import React, { useState, useEffect, useCallback } from 'react';
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
  Share,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function GroupsScreen() {
  const { user, token } = useAuth();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteList, setInviteList] = useState<string[]>([]);
  const [streakEnabled, setStreakEnabled] = useState(true);

  const fetchGroup = useCallback(async () => {
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groups/my-group`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGroup(data.group);
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Failed to fetch group:', error);
    }
  }, [token]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGroup();
    setRefreshing(false);
  };

  const handleLeaveGroup = () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
            await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groups/leave`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
            });
            setSelectedGroup(null);
            await fetchGroup();
          } catch (error) {
            console.error('Leave group error:', error);
          }
        },
      },
    ]);
  };

  const handleShareGroup = async () => {
    if (!group) return;
    const APP_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://studymatch.app';
    try {
      await Share.share({
        message: `Join my study group on StudyMatch! Click here to join the session: ${APP_URL}/join/${group.group_id}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
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
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const handleAddInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (inviteList.includes(email)) return;
    setInviteList(prev => [...prev, email]);
    setInviteEmail('');
  };

  // ───── Group Detail View ─────
  if (selectedGroup) {
    return (
      <ScrollView style={styles.container}>
        {/* Detail Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedGroup(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.detailHeaderCenter}>
            <View style={styles.detailAvatar}>
              <Text style={styles.detailAvatarText}>
                {(group?.group_name || group?.course || 'S').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.detailTitle} numberOfLines={1}>{group?.group_name || group?.course}</Text>
              <Text style={styles.detailSub}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleShareGroup} style={styles.detailAction}>
            <Ionicons name="share-social-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Compatibility */}
        <View style={styles.compatCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNum}>{Math.round(group?.compatibility_score || 0)}</Text>
            <Text style={styles.scorePct}>%</Text>
          </View>
          <View style={styles.compatInfo}>
            <Text style={styles.compatTitle}>Compatibility Score</Text>
            <Text style={styles.compatDesc}>High compatibility leads to better study outcomes</Text>
          </View>
        </View>

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          {members.map((member) => (
            <View key={member.user_id} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInit}>{member.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  {member.is_verified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={14} color="#43A047" />
                    </View>
                  )}
                </View>
                <Text style={styles.memberSub}>{member.study_style || 'Active'}</Text>
              </View>
              {member.user_id === user?.user_id ? (
                <View style={styles.youTag}><Text style={styles.youTagText}>You</Text></View>
              ) : (
                <TouchableOpacity
                  onPress={() => Alert.alert('Reported to Admin', `${member.name} has been reported. Our team will review this.`)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="flag-outline" size={18} color="#CCC" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Details</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Ionicons name="book" size={20} color="#2DAFE3" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Course</Text>
                <Text style={styles.detailValue}>{group?.course}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location" size={20} color="#2DAFE3" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{group?.suggested_location}</Text>
              </View>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Ionicons name="calendar" size={20} color="#2DAFE3" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>{new Date(group?.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Health */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Health</Text>
          <View style={styles.healthCard}>
            <View style={styles.healthBar}>
              <View style={[styles.healthFill, { width: `${group?.health_score || 0}%` }]} />
            </View>
            <Text style={styles.healthText}>{Math.round(group?.health_score || 0)}% Active</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGroup}>
          <Ionicons name="exit-outline" size={20} color="#E53935" />
          <Text style={styles.leaveBtnText}>Leave Group</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  // ───── WhatsApp-style Group List ─────
  const groups = group ? [group] : [];

  return (
    <View style={styles.container}>
      {/* List Header */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Groups</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={group ? () => Alert.alert('Already in a group', 'Leave your current group first.') : () => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={groups.length === 0 ? { flex: 1 } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>No Groups Yet</Text>
            <Text style={styles.emptyText}>Tap + to create a study group{'\n'}or find one from the Home tab</Text>
          </View>
        ) : (
          groups.map((g) => (
            <TouchableOpacity
              key={g.group_id}
              style={styles.groupRow}
              onPress={() => setSelectedGroup(g)}
              activeOpacity={0.7}
            >
              <View style={styles.groupAvatar}>
                <Text style={styles.groupAvatarText}>
                  {(g.group_name || g.course || 'S').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName} numberOfLines={1}>{g.group_name || g.course}</Text>
                <Text style={styles.groupPreview} numberOfLines={1}>
                  {members.length} member{members.length !== 1 ? 's' : ''} · {g.suggested_location}
                </Text>
              </View>
              <View style={styles.groupMeta}>
                <Text style={styles.groupTime}>{new Date(g.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
                <View style={styles.groupBadge}>
                  <Text style={styles.groupBadgeText}>{Math.round(g.compatibility_score)}%</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Study Group</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.modalClose}>
                  <Ionicons name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Group Name</Text>
              <TextInput style={styles.modalInput} value={newGroupName} onChangeText={setNewGroupName} placeholder="e.g. CS101 Study Squad" placeholderTextColor="#BBB" />

              <Text style={styles.modalLabel}>Invite Friends</Text>
              <View style={styles.inviteRow}>
                <TextInput style={[styles.modalInput, { flex: 1, marginRight: 8 }]} value={inviteEmail} onChangeText={setInviteEmail} placeholder="friend@university.ac.uk" placeholderTextColor="#BBB" keyboardType="email-address" autoCapitalize="none" onSubmitEditing={handleAddInvite} />
                <TouchableOpacity style={styles.addInviteBtn} onPress={handleAddInvite}>
                  <Ionicons name="person-add" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
              {inviteList.length > 0 && (
                <View style={styles.chipWrap}>
                  {inviteList.map(e => (
                    <View key={e} style={styles.chip}>
                      <Text style={styles.chipText} numberOfLines={1}>{e}</Text>
                      <TouchableOpacity onPress={() => setInviteList(prev => prev.filter(x => x !== e))}>
                        <Ionicons name="close-circle" size={16} color="#999" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.modalLabel}>Preferred Meetup Location</Text>
              <TextInput style={styles.modalInput} value={newLocation} onChangeText={setNewLocation} placeholder="e.g. Main Library" placeholderTextColor="#BBB" />

              <TouchableOpacity style={styles.streakRow} onPress={() => setStreakEnabled(!streakEnabled)} activeOpacity={0.7}>
                <View style={[styles.streakIcon, streakEnabled && styles.streakIconActive]}>
                  <Ionicons name="flame" size={22} color={streakEnabled ? '#FFF' : '#CCC'} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.streakTitle}>Weekly Study Streak</Text>
                  <Text style={styles.streakDesc}>Meet once a week to keep it alive</Text>
                </View>
                <View style={[styles.toggle, streakEnabled && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, streakEnabled && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.createGroupBtn, !newGroupName.trim() && { opacity: 0.5 }]} onPress={handleCreateGroup} disabled={creating || !newGroupName.trim()}>
                {creating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.createGroupBtnText}>Create Group</Text>}
              </TouchableOpacity>
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },

  /* ── List Header ── */
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  listTitle: { fontSize: 28, fontWeight: '700', color: '#2DAFE3' },
  createBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#2DAFE3',
    justifyContent: 'center', alignItems: 'center',
  },

  /* ── WhatsApp Group Row ── */
  groupRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  groupAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#2DAFE3',
    justifyContent: 'center', alignItems: 'center',
  },
  groupAvatarText: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  groupInfo: { flex: 1, marginLeft: 14 },
  groupName: { fontSize: 17, fontWeight: '600', color: '#1A1A2E' },
  groupPreview: { fontSize: 14, color: '#888', marginTop: 2 },
  groupMeta: { alignItems: 'flex-end' },
  groupTime: { fontSize: 12, color: '#AAA', marginBottom: 4 },
  groupBadge: { backgroundColor: '#E0F7FA', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  groupBadgeText: { fontSize: 11, fontWeight: '700', color: '#2DAFE3' },

  /* ── Empty State ── */
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginTop: 16 },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center', marginTop: 8, lineHeight: 22 },

  /* ── Detail Header ── */
  detailHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#2DAFE3', paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16,
  },
  backBtn: { padding: 8, marginRight: 4 },
  detailHeaderCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  detailAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  detailAvatarText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  detailSub: { fontSize: 13, color: '#E0F7FA' },
  detailAction: { padding: 8 },

  /* ── Compat Card ── */
  compatCard: {
    flexDirection: 'row', backgroundColor: '#FFF', margin: 16, padding: 20, borderRadius: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  scoreCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#E0F7FA',
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#2DAFE3',
  },
  scoreNum: { fontSize: 24, fontWeight: '700', color: '#2DAFE3' },
  scorePct: { fontSize: 12, color: '#2DAFE3' },
  compatInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  compatTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 4 },
  compatDesc: { fontSize: 13, color: '#888', lineHeight: 18 },

  /* ── Section ── */
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 12 },

  /* ── Members ── */
  memberRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    padding: 14, borderRadius: 12, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2,
  },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#2DAFE3',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  memberInit: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  memberName: { fontSize: 16, fontWeight: '600', color: '#333' },
  memberNameRow: { flexDirection: 'row', alignItems: 'center' },
  verifiedBadge: { marginLeft: 6 },
  memberSub: { fontSize: 13, color: '#888', marginTop: 1 },
  youTag: { backgroundColor: '#E0F7FA', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10 },
  youTagText: { fontSize: 12, fontWeight: '600', color: '#2DAFE3' },

  /* ── Detail Card ── */
  detailCard: {
    backgroundColor: '#FFF', padding: 16, borderRadius: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2,
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  detailContent: { marginLeft: 12, flex: 1 },
  detailLabel: { fontSize: 12, color: '#888' },
  detailValue: { fontSize: 15, fontWeight: '500', color: '#333', marginTop: 1 },

  /* ── Health ── */
  healthCard: { backgroundColor: '#FFF', padding: 18, borderRadius: 12 },
  healthBar: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  healthFill: { height: '100%', backgroundColor: '#2DAFE3' },
  healthText: { fontSize: 16, fontWeight: '700', color: '#333' },

  /* ── Leave ── */
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#E53935',
  },
  leaveBtnText: { fontSize: 16, fontWeight: '600', color: '#E53935', marginLeft: 8 },

  /* ── Create Modal ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 14 },
  modalInput: { backgroundColor: '#F8F9FA', borderRadius: 12, borderWidth: 1, borderColor: '#E8E8E8', padding: 14, fontSize: 15, color: '#333' },
  inviteRow: { flexDirection: 'row', alignItems: 'center' },
  addInviteBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#2DAFE3', justifyContent: 'center', alignItems: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F7FA', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 },
  chipText: { fontSize: 13, color: '#00838F', marginRight: 6 },
  streakRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 14, padding: 14, marginTop: 18, borderWidth: 1, borderColor: '#E8E8E8' },
  streakIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  streakIconActive: { backgroundColor: '#FF9800' },
  streakTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  streakDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#DDD', padding: 2, justifyContent: 'center' },
  toggleActive: { backgroundColor: '#2DAFE3' },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  createGroupBtn: { backgroundColor: '#2DAFE3', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 24, minHeight: 52, justifyContent: 'center' },
  createGroupBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
