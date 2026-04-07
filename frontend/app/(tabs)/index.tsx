import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { user, token } = useAuth();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      
      // Fetch group
      const groupRes = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/groups/my-group`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (groupRes.ok) {
        const data = await groupRes.json();
        setGroup(data.group);
        setMembers(data.members);
      }

      // Fetch streak
      const streakRes = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/attendance/streak`, {
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

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleFindMatch = async () => {
    setLoading(true);
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/matching/find-matches`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        await fetchData();
      } else {
        alert(data.detail || 'Failed to find matches');
      }
    } catch (error) {
      console.error('Match error:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/attendance/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        alert('✅ Checked in successfully!');
        await fetchData();
      }
    } catch (error) {
      console.error('Check-in error:', error);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{user?.name?.split(' ')[0]}!</Text>
      </View>

      {/* Streak Card */}
      <View style={styles.streakCard}>
        <View style={styles.streakIcon}>
          <Ionicons name="flame" size={32} color="#FF6B35" />
        </View>
        <View style={styles.streakContent}>
          <Text style={styles.streakNumber}>{streak} day{streak !== 1 ? 's' : ''}</Text>
          <Text style={styles.streakLabel}>Study Streak</Text>
        </View>
        {group && (
          <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.checkInText}>Check In</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Group Status */}
      {group ? (
        <View style={styles.groupCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="people" size={24} color="#2DAFE3" />
            <Text style={styles.cardTitle}>Your Study Group</Text>
          </View>
          
          <View style={styles.compatibilityBadge}>
            <Text style={styles.compatibilityText}>
              {Math.round(group.compatibility_score)}% Compatible
            </Text>
          </View>

          <View style={styles.membersList}>
            {members.map((member) => (
              <View key={member.user_id} style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberStyle}>{member.study_style || 'Mixed'}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.groupInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="book" size={16} color="#666" />
              <Text style={styles.infoText}>{group.course}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.infoText}>{group.suggested_location}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.noGroupCard}>
          <Ionicons name="search" size={48} color="#2DAFE3" />
          <Text style={styles.noGroupTitle}>Find Your Study Group</Text>
          <Text style={styles.noGroupText}>
            Get matched with compatible students in your course
          </Text>
          <TouchableOpacity
            style={styles.findButton}
            onPress={handleFindMatch}
            disabled={loading}
          >
            <Text style={styles.findButtonText}>
              {loading ? 'Searching...' : 'Find Matches'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="calendar" size={32} color="#2DAFE3" />
            <Text style={styles.actionText}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="stats-chart" size={32} color="#2DAFE3" />
            <Text style={styles.actionText}>Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="location" size={32} color="#2DAFE3" />
            <Text style={styles.actionText}>Study Spots</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="help-circle" size={32} color="#2DAFE3" />
            <Text style={styles.actionText}>Help</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 24,
    paddingTop: 48,
    backgroundColor: '#FFF',
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2DAFE3',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  streakIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakContent: {
    flex: 1,
    marginLeft: 16,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  streakLabel: {
    fontSize: 14,
    color: '#666',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2DAFE3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  checkInText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: '#FFF',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  compatibilityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F7FA',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  compatibilityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2DAFE3',
  },
  membersList: {
    marginBottom: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2DAFE3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  memberStyle: {
    fontSize: 14,
    color: '#666',
  },
  groupInfo: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  noGroupCard: {
    backgroundColor: '#FFF',
    margin: 16,
    marginTop: 0,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noGroupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noGroupText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  findButton: {
    backgroundColor: '#2DAFE3',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  findButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    fontWeight: '500',
  },
});
