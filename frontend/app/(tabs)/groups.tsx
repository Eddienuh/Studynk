import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function GroupsScreen() {
  const { user } = useAuth();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGroup = async () => {
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groups/my-group`, {
        credentials: 'include',
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
                credentials: 'include',
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

  if (!group) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Groups</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No Group Yet</Text>
          <Text style={styles.emptyText}>
            Find your study group from the Home tab
          </Text>
        </View>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2DAFE3',
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
});
