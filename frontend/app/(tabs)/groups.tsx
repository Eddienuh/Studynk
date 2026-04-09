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
  const [newCourse, setNewCourse] = useState('');
  const [newLocation, setNewLocation] = useState('');

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
    if (!newCourse.trim()) {
      Alert.alert('Required', 'Please enter a course name.');
      return;
    }
    setCreating(true);
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ course: newCourse.trim(), location: newLocation.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        setShowCreateModal(false);
        setNewCourse('');
        setNewLocation('');
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

  const renderCreateModal = () => (
    <Modal visible={showCreateModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Study Group</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Course / Module</Text>
          <TextInput
            style={styles.modalInput}
            value={newCourse}
            onChangeText={setNewCourse}
            placeholder="e.g. Computer Science 101"
            placeholderTextColor="#BBB"
          />

          <Text style={styles.modalLabel}>Preferred Location</Text>
          <TextInput
            style={styles.modalInput}
            value={newLocation}
            onChangeText={setNewLocation}
            placeholder="e.g. Library, Campus Cafe"
            placeholderTextColor="#BBB"
          />

          <TouchableOpacity
            style={[styles.modalCreateBtn, !newCourse.trim() && { opacity: 0.5 }]}
            onPress={handleCreateGroup}
            disabled={creating || !newCourse.trim()}
          >
            {creating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.modalCreateBtnText}>Create Group</Text>
            )}
          </TouchableOpacity>
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
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#25D366',
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    marginTop: 12,
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
  modalCreateBtn: {
    backgroundColor: '#25D366',
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
