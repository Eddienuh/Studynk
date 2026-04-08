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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type LocationType = 'all' | 'library' | 'cafe' | 'study_hub';

interface Prediction {
  place_id: string;
  name: string;
  description: string;
  types: string[];
}

interface PlaceDetails {
  place_id: string;
  name: string;
  address: string;
  type: string;
  latitude: number;
  longitude: number;
  rating?: number;
  total_ratings?: number;
  is_open_now?: boolean;
  opening_hours: string[];
  phone?: string;
  website?: string;
  photo_url?: string;
  business_status?: string;
  google_types: string[];
}

interface SeededLocation {
  location_id: string;
  name: string;
  type: string;
  address: string;
  description: string;
  opening_hours: { weekday: string; saturday: string; sunday: string };
  amenities: string[];
  busyness: { level: string; percentage: number };
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
    case 'university': return 'school';
    default: return 'location';
  }
}

export default function StudySpotsScreen() {
  const router = useRouter();
  const { token, user } = useAuth();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);

  // Featured (seeded) locations
  const [featured, setFeatured] = useState<SeededLocation[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<LocationType>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Detail view
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [selectedSeeded, setSelectedSeeded] = useState<SeededLocation | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [meetingNote, setMeetingNote] = useState('');

  // Fetch featured/seeded locations
  const fetchFeatured = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.append('type', activeFilter);
      const response = await fetch(`${BACKEND_URL}/api/locations/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setFeatured(data.locations);
      }
    } catch (error) {
      console.error('Failed to fetch featured:', error);
    } finally {
      setFeaturedLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  // Google Places Autocomplete
  useEffect(() => {
    if (searchQuery.length < 2) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    setSearchLoading(true);
    const debounce = setTimeout(async () => {
      try {
        const resp = await fetch(
          `${BACKEND_URL}/api/places/autocomplete?q=${encodeURIComponent(searchQuery)}`
        );
        if (resp.ok) {
          const data = await resp.json();
          setPredictions(data.predictions || []);
          setShowPredictions(true);
        }
      } catch (e) {
        console.error('Autocomplete error:', e);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Select a Google Place prediction
  const selectPrediction = async (prediction: Prediction) => {
    setShowPredictions(false);
    setSearchQuery(prediction.name);
    setDetailLoading(true);

    try {
      const resp = await fetch(`${BACKEND_URL}/api/places/details/${prediction.place_id}`);
      if (resp.ok) {
        const details = await resp.json();
        setSelectedPlace(details);
      } else {
        Alert.alert('Error', 'Could not load place details');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setDetailLoading(false);
    }
  };

  // Share handler
  const handleSharePlace = async () => {
    if (!user?.group_id) {
      Alert.alert('No Group', 'Join a study group first to share locations with your team.');
      return;
    }

    setSharing(true);
    try {
      const body: any = {};
      if (selectedPlace) {
        body.place_data = {
          place_id: selectedPlace.place_id,
          name: selectedPlace.name,
          address: selectedPlace.address,
          type: selectedPlace.type,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
          opening_hours: selectedPlace.opening_hours?.[0] || 'Check online',
        };
      } else if (selectedSeeded) {
        body.location_id = selectedSeeded.location_id;
      }
      if (meetingNote.trim()) {
        body.meeting_note = meetingNote.trim();
      }

      const response = await fetch(`${BACKEND_URL}/api/locations/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const placeName = selectedPlace?.name || selectedSeeded?.name;
        Alert.alert('Shared!', `"${placeName}" sent to your group chat.`, [
          { text: 'View Chat', onPress: () => { setSelectedPlace(null); setSelectedSeeded(null); setMeetingNote(''); router.push('/(tabs)/messages'); } },
          { text: 'OK', onPress: () => setMeetingNote('') },
        ]);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'Failed to share');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setSharing(false);
    }
  };

  const handleShareSeeded = async (loc: SeededLocation) => {
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
        body: JSON.stringify({ location_id: loc.location_id, ...(meetingNote.trim() ? { meeting_note: meetingNote.trim() } : {}) }),
      });

      if (response.ok) {
        Alert.alert('Shared!', `"${loc.name}" sent to your group chat.`, [
          { text: 'View Chat', onPress: () => router.push('/(tabs)/messages') },
          { text: 'OK' },
        ]);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'Failed to share');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setSharing(false);
    }
  };

  // =================== DETAIL VIEW (Google Place) ===================
  if (selectedPlace) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedPlace(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>{selectedPlace.name}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.detailContent}>
          {/* Photo */}
          {selectedPlace.photo_url && (
            <Image source={{ uri: selectedPlace.photo_url }} style={styles.placePhoto} />
          )}

          {/* Hero */}
          <View style={styles.detailHero}>
            <View style={styles.detailIconBig}>
              <Ionicons name={getTypeIcon(selectedPlace.type) as any} size={48} color="#2DAFE3" />
            </View>
            <Text style={styles.detailName}>{selectedPlace.name}</Text>
            <Text style={styles.detailAddress}>{selectedPlace.address}</Text>

            <View style={styles.metaRow}>
              {selectedPlace.is_open_now !== undefined && (
                <View style={[styles.openBadge, { backgroundColor: selectedPlace.is_open_now ? '#E8F5E9' : '#FFEBEE' }]}>
                  <View style={[styles.busynessDot, { backgroundColor: selectedPlace.is_open_now ? '#4CAF50' : '#E53935' }]} />
                  <Text style={{ color: selectedPlace.is_open_now ? '#4CAF50' : '#E53935', fontWeight: '600', fontSize: 14 }}>
                    {selectedPlace.is_open_now ? 'Open Now' : 'Closed'}
                  </Text>
                </View>
              )}
              {selectedPlace.rating && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={16} color="#FF9800" />
                  <Text style={styles.ratingText}>{selectedPlace.rating}</Text>
                  {selectedPlace.total_ratings && (
                    <Text style={styles.ratingCount}>({selectedPlace.total_ratings})</Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Opening Hours */}
          {selectedPlace.opening_hours.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Opening Hours</Text>
              {selectedPlace.opening_hours.map((line, i) => (
                <Text key={i} style={styles.hoursLine}>{line}</Text>
              ))}
            </View>
          )}

          {/* Contact */}
          {(selectedPlace.phone || selectedPlace.website) && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Contact</Text>
              {selectedPlace.phone && (
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={18} color="#2DAFE3" />
                  <Text style={styles.contactText}>{selectedPlace.phone}</Text>
                </View>
              )}
              {selectedPlace.website && (
                <View style={styles.contactRow}>
                  <Ionicons name="globe-outline" size={18} color="#2DAFE3" />
                  <Text style={styles.contactText} numberOfLines={1}>{selectedPlace.website}</Text>
                </View>
              )}
            </View>
          )}

          {/* Meeting Spot Note */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Meeting Spot</Text>
            <Text style={styles.meetingHint}>Help your group find you — specify a room, table, or area</Text>
            <TextInput
              style={styles.meetingInput}
              placeholder='e.g. "Room 3.14", "Table by the window", "2nd floor silent zone"'
              placeholderTextColor="#999"
              value={meetingNote}
              onChangeText={setMeetingNote}
              multiline
              maxLength={120}
            />
            {meetingNote.length > 0 && (
              <Text style={styles.meetingCharCount}>{meetingNote.length}/120</Text>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Share button */}
        <View style={styles.shareFooter}>
          <TouchableOpacity style={styles.shareButton} onPress={handleSharePlace} disabled={sharing}>
            {sharing ? <ActivityIndicator color="#FFF" /> : (
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

  // =================== DETAIL VIEW (Seeded) ===================
  if (selectedSeeded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedSeeded(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>{selectedSeeded.name}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.detailContent}>
          <View style={styles.detailHero}>
            <View style={styles.detailIconBig}>
              <Ionicons name={getTypeIcon(selectedSeeded.type) as any} size={48} color="#2DAFE3" />
            </View>
            <Text style={styles.detailName}>{selectedSeeded.name}</Text>
            <Text style={styles.detailAddress}>{selectedSeeded.address}</Text>
            <View style={[styles.openBadge, { backgroundColor: getBusynessColor(selectedSeeded.busyness.level) + '18' }]}>
              <View style={[styles.busynessDot, { backgroundColor: getBusynessColor(selectedSeeded.busyness.level) }]} />
              <Text style={{ color: getBusynessColor(selectedSeeded.busyness.level), fontWeight: '600', fontSize: 14 }}>
                {getBusynessLabel(selectedSeeded.busyness.level)} — {selectedSeeded.busyness.percentage}% full
              </Text>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>About</Text>
            <Text style={styles.detailDescription}>{selectedSeeded.description}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Opening Hours</Text>
            <HoursRow label="Weekdays" value={selectedSeeded.opening_hours.weekday} />
            <HoursRow label="Saturday" value={selectedSeeded.opening_hours.saturday} />
            <HoursRow label="Sunday" value={selectedSeeded.opening_hours.sunday} />
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {selectedSeeded.amenities.map((a, i) => (
                <View key={i} style={styles.amenityChip}>
                  <Ionicons name="checkmark-circle" size={14} color="#2DAFE3" />
                  <Text style={styles.amenityChipText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Meeting Spot Note */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Meeting Spot</Text>
            <Text style={styles.meetingHint}>Help your group find you — specify a room, table, or area</Text>
            <TextInput
              style={styles.meetingInput}
              placeholder='e.g. "Room 3.14", "Table by the window", "2nd floor silent zone"'
              placeholderTextColor="#999"
              value={meetingNote}
              onChangeText={setMeetingNote}
              multiline
              maxLength={120}
            />
            {meetingNote.length > 0 && (
              <Text style={styles.meetingCharCount}>{meetingNote.length}/120</Text>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.shareFooter}>
          <TouchableOpacity style={styles.shareButton} onPress={() => handleShareSeeded(selectedSeeded)} disabled={sharing}>
            {sharing ? <ActivityIndicator color="#FFF" /> : (
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

  // =================== LIST VIEW ===================
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Spots</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Google Places Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search any place, e.g. 'Cardiff University'"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={(text) => { setSearchQuery(text); if (text.length < 2) setShowPredictions(false); }}
          autoCorrect={false}
        />
        {searchLoading && <ActivityIndicator size="small" color="#2DAFE3" style={{ marginRight: 8 }} />}
        {searchQuery.length > 0 && !searchLoading && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setPredictions([]); setShowPredictions(false); }}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Autocomplete Predictions Dropdown */}
      {showPredictions && predictions.length > 0 && (
        <View style={styles.predictionsContainer}>
          <View style={styles.predictionsHeader}>
            <Ionicons name="logo-google" size={14} color="#4285F4" />
            <Text style={styles.predictionsLabel}>Google Places</Text>
          </View>
          {predictions.map((p) => (
            <TouchableOpacity
              key={p.place_id}
              style={styles.predictionItem}
              onPress={() => selectPrediction(p)}
            >
              <Ionicons name="location-outline" size={20} color="#2DAFE3" />
              <View style={styles.predictionText}>
                <Text style={styles.predictionName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.predictionDesc} numberOfLines={1}>{p.description}</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {detailLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2DAFE3" />
          <Text style={styles.loadingText}>Loading place details...</Text>
        </View>
      )}

      {/* Featured Locations */}
      {!showPredictions && !detailLoading && (
        <>
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

          <ScrollView
            style={styles.resultsContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeatured(); }} />}
          >
            <Text style={styles.featuredTitle}>Featured Study Spots</Text>

            {featuredLoading ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator size="large" color="#2DAFE3" />
              </View>
            ) : featured.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search" size={48} color="#CCC" />
                <Text style={styles.emptyTitle}>No locations found</Text>
              </View>
            ) : (
              featured.map((loc) => (
                <TouchableOpacity
                  key={loc.location_id}
                  style={styles.locationCard}
                  onPress={() => setSelectedSeeded(loc)}
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
        </>
      )}
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
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#333' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1.5, borderColor: '#E0E0E0' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#333' },

  predictionsContainer: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: '#E0E0E0', overflow: 'hidden' },
  predictionsHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  predictionsLabel: { fontSize: 11, color: '#999', fontWeight: '600', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  predictionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  predictionText: { flex: 1, marginLeft: 10 },
  predictionName: { fontSize: 15, fontWeight: '600', color: '#333' },
  predictionDesc: { fontSize: 12, color: '#666', marginTop: 1 },

  loadingOverlay: { padding: 48, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#666' },
  loadingCenter: { padding: 48, alignItems: 'center' },

  filtersRow: { marginTop: 12, maxHeight: 48 },
  filtersContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#E0F7FA', marginRight: 8 },
  filterChipActive: { backgroundColor: '#2DAFE3' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#2DAFE3', marginLeft: 6 },
  filterTextActive: { color: '#FFF' },

  resultsContainer: { flex: 1, marginTop: 8 },
  featuredTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginHorizontal: 16, marginTop: 8, marginBottom: 10 },

  emptyContainer: { padding: 48, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 16 },

  locationCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardIconContainer: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#E0F7FA', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 17, fontWeight: '700', color: '#333' },
  cardAddress: { fontSize: 13, color: '#666', marginTop: 2 },
  cardType: { fontSize: 11, fontWeight: '600', color: '#2DAFE3', marginTop: 3, letterSpacing: 0.5 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  busynessRow: { flexDirection: 'row', alignItems: 'center' },
  busynessDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  busynessText: { fontSize: 13, fontWeight: '600' },
  hoursCompact: { flexDirection: 'row', alignItems: 'center' },
  hoursCompactText: { fontSize: 12, color: '#666', marginLeft: 4 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  amenityMini: { backgroundColor: '#F5F7FA', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  amenityMiniText: { fontSize: 11, color: '#666' },
  moreAmenities: { fontSize: 11, color: '#2DAFE3', fontWeight: '600', alignSelf: 'center', marginLeft: 4 },

  // Detail view styles
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  detailHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#333', flex: 1, textAlign: 'center' },
  detailContent: { padding: 16 },
  placePhoto: { width: '100%', height: 200, borderRadius: 14, marginBottom: 16 },
  detailHero: { alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 24, marginBottom: 16 },
  detailIconBig: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#E0F7FA', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  detailName: { fontSize: 24, fontWeight: '700', color: '#333', textAlign: 'center' },
  detailAddress: { fontSize: 15, color: '#666', marginTop: 4, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  openBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  ratingText: { fontSize: 14, fontWeight: '700', color: '#FF9800', marginLeft: 4 },
  ratingCount: { fontSize: 12, color: '#999', marginLeft: 2 },
  detailSection: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12 },
  detailSectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10 },
  detailDescription: { fontSize: 15, color: '#555', lineHeight: 22 },
  hoursLine: { fontSize: 14, color: '#555', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  hoursLabel: { fontSize: 14, color: '#666' },
  hoursValue: { fontSize: 14, fontWeight: '600', color: '#333' },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  contactText: { fontSize: 14, color: '#333', marginLeft: 10, flex: 1 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F7FA', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  amenityChipText: { fontSize: 13, color: '#333', marginLeft: 4 },
  shareFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  shareButton: { flexDirection: 'row', backgroundColor: '#2DAFE3', paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  shareButtonText: { color: '#FFF', fontSize: 17, fontWeight: '700', marginLeft: 10 },

  meetingHint: { fontSize: 13, color: '#999', marginBottom: 8 },
  meetingInput: { backgroundColor: '#F5F7FA', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', padding: 12, fontSize: 15, color: '#333', minHeight: 60, textAlignVertical: 'top' },
  meetingCharCount: { fontSize: 11, color: '#999', textAlign: 'right', marginTop: 4 },
});
