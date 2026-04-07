import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type LocationType = 'all' | 'library' | 'cafe' | 'study_hub';

interface BusynessInfo {
  level: string;
  percentage: number;
}

interface StudyLocation {
  location_id: string;
  name: string;
  type: string;
  address: string;
  description: string;
  opening_hours: { weekday: string; saturday: string; sunday: string };
  amenities: string[];
  busyness: BusynessInfo;
  capacity: number;
}

const TYPE_FILTERS: { key: LocationType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid' },
  { key: 'library', label: 'Libraries', icon: 'library' },
  { key: 'cafe', label: 'Cafes', icon: 'cafe' },
  { key: 'study_hub', label: 'Study Hubs', icon: 'business' },
];

function getBusynessColor(level: string) {
  switch (level) {
    case 'quiet': return '#4CAF50';
    case 'moderate': return '#FF9800';
    case 'busy': return '#F44336';
    case 'very_busy': return '#B71C1C';
    default: return '#999';
  }
}

function getBusynessLabel(level: string) {
  switch (level) {
    case 'quiet': return 'Quiet';
    case 'moderate': return 'Moderate';
    case 'busy': return 'Busy';
    case 'very_busy': return 'Very Busy';
    default: return 'Unknown';
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'library': return 'library';
    case 'cafe': return 'cafe';
    case 'study_hub': return 'business';
    default: return 'location';
  }
}

export default function StudySpotsScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [locations, setLocations] = useState<StudyLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<LocationType>('all');
  const [selectedLocation, setSelectedLocation] = useState<StudyLocation | null>(null);
  const [sharing, setSharing] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (activeFilter !== 'all') params.append('type', activeFilter);

      const response = await fetch(
        `${BACKEND_URL}/api/locations/search?${params.toString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    setLoading(true);
    const debounce = setTimeout(() => fetchLocations(), 300);
    return () => clearTimeout(debounce);
  }, [fetchLocations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLocations();
  };

  const handleShare = async (location: StudyLocation) => {
    if (!user?.group_id) {
      Alert.alert('No Group', 'Join a study group first to share locations with your team.');
      return;
    }

    setSharing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/locations/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ location_id: location.location_id }),
      });

      if (response.ok) {
        Alert.alert(
          'Shared!',
          `"${location.name}" has been shared to your group chat.`,
          [
            { text: 'View Chat', onPress: () => { setSelectedLocation(null); router.push('/(tabs)/messages'); } },
            { text: 'OK' },
          ]
        );
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'Failed to share location');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  // Detail view
  if (selectedLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedLocation(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>{selectedLocation.name}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.detailContent}>
          {/* Hero section */}
          <View style={styles.detailHero}>
            <View style={styles.detailIconBig}>
              <Ionicons name={getTypeIcon(selectedLocation.type) as any} size={48} color="#2DAFE3" />
            </View>
            <Text style={styles.detailName}>{selectedLocation.name}</Text>
            <Text style={styles.detailAddress}>{selectedLocation.address}</Text>
            <View style={[styles.busynessBadgeLarge, { backgroundColor: getBusynessColor(selectedLocation.busyness.level) + '18' }]}>
              <View style={[styles.busynessDot, { backgroundColor: getBusynessColor(selectedLocation.busyness.level) }]} />
              <Text style={[styles.busynessTextLarge, { color: getBusynessColor(selectedLocation.busyness.level) }]}>
                {getBusynessLabel(selectedLocation.busyness.level)} — {selectedLocation.busyness.percentage}% full
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>About</Text>
            <Text style={styles.detailDescription}>{selectedLocation.description}</Text>
          </View>

          {/* Opening Hours */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Opening Hours</Text>
            <View style={styles.hoursCard}>
              <HoursRow label="Weekdays" value={selectedLocation.opening_hours.weekday} />
              <HoursRow label="Saturday" value={selectedLocation.opening_hours.saturday} />
              <HoursRow label="Sunday" value={selectedLocation.opening_hours.sunday} />
            </View>
          </View>

          {/* Amenities */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {selectedLocation.amenities.map((amenity, i) => (
                <View key={i} style={styles.amenityChip}>
                  <Ionicons name="checkmark-circle" size={14} color="#2DAFE3" />
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Capacity */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Capacity</Text>
            <View style={styles.capacityRow}>
              <Ionicons name="people" size={20} color="#666" />
              <Text style={styles.capacityText}>Up to {selectedLocation.capacity} people</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Share button */}
        <View style={styles.shareFooter}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => handleShare(selectedLocation)}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color="#FFF" />
                <Text style={styles.shareButtonText}>Share with Group</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // List view
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Spots</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search libraries, cafes, study hubs..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Type filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow} contentContainerStyle={styles.filtersContent}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Ionicons name={f.icon as any} size={16} color={activeFilter === f.key ? '#FFF' : '#2DAFE3'} />
            <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results */}
      <ScrollView
        style={styles.resultsContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2DAFE3" />
            <Text style={styles.loadingText}>Finding study spots...</Text>
          </View>
        ) : locations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={48} color="#CCC" />
            <Text style={styles.emptyTitle}>No locations found</Text>
            <Text style={styles.emptyText}>Try a different search or filter</Text>
          </View>
        ) : (
          locations.map((loc) => (
            <TouchableOpacity
              key={loc.location_id}
              style={styles.locationCard}
              onPress={() => setSelectedLocation(loc)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name={getTypeIcon(loc.type) as any} size={28} color="#2DAFE3" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{loc.name}</Text>
                  <Text style={styles.cardAddress} numberOfLines={1}>{loc.address}</Text>
                  <Text style={styles.cardType}>{loc.type.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCC" />
              </View>

              <View style={styles.cardBottom}>
                <View style={styles.busynessRow}>
                  <View style={[styles.busynessDot, { backgroundColor: getBusynessColor(loc.busyness.level) }]} />
                  <Text style={[styles.busynessText, { color: getBusynessColor(loc.busyness.level) }]}>
                    {getBusynessLabel(loc.busyness.level)} ({loc.busyness.percentage}%)
                  </Text>
                </View>
                <View style={styles.hoursCompact}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text style={styles.hoursCompactText}>{loc.opening_hours.weekday}</Text>
                </View>
              </View>

              <View style={styles.amenitiesRow}>
                {loc.amenities.slice(0, 4).map((a, i) => (
                  <View key={i} style={styles.amenityMini}>
                    <Text style={styles.amenityMiniText}>{a}</Text>
                  </View>
                ))}
                {loc.amenities.length > 4 && (
                  <Text style={styles.moreAmenities}>+{loc.amenities.length - 4}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function HoursRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.hoursRow}>
      <Text style={styles.hoursLabel}>{label}</Text>
      <Text style={styles.hoursValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  filtersRow: {
    marginTop: 12,
    maxHeight: 48,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#E0F7FA',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2DAFE3',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2DAFE3',
    marginLeft: 6,
  },
  filterTextActive: {
    color: '#FFF',
  },
  resultsContainer: {
    flex: 1,
    marginTop: 12,
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  locationCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  cardAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  cardType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2DAFE3',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  busynessRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busynessDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  busynessText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hoursCompact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursCompactText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  amenityMini: {
    backgroundColor: '#F5F7FA',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  amenityMiniText: {
    fontSize: 11,
    color: '#666',
  },
  moreAmenities: {
    fontSize: 11,
    color: '#2DAFE3',
    fontWeight: '600',
    alignSelf: 'center',
    marginLeft: 4,
  },
  // Detail view styles
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  detailContent: {
    padding: 16,
  },
  detailHero: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  detailIconBig: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  detailAddress: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  busynessBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 16,
  },
  busynessTextLarge: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailSection: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  detailDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  hoursCard: {},
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  hoursLabel: {
    fontSize: 14,
    color: '#666',
  },
  hoursValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7FA',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 4,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capacityText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 8,
  },
  shareFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#2DAFE3',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
  },
});
