/**
 * MyTrips Screen
 * 
 * Displays user's trips in a card-based layout with tabs for Upcoming, Ongoing, and Completed trips.
 * Matches the original MyTrips design with Sanchari brand colors.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../api/authService';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';

// Brand Colors
const COLORS = {
  primary: '#FF5C02',
  primary80: '#FF5C02CC',
  primary20: '#FF5C0233',
  textPrimary: '#3C3C3B',
  textSecondary: '#757574',
  cardBg: '#F8F5F1',
  border: '#D1D1D0',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  accentPeach: '#F9CBAF',
  white: '#FFFFFF',
};

type TripStatus = 'upcoming' | 'ongoing' | 'completed';

interface UserTrip {
  id: string;
  postId: string;
  title: string;
  destination?: string;
  destinationImage?: string;
  startDate?: any;
  endDate?: any;
  status: TripStatus;
  travelers?: number;
  bookingId?: string;
  createdAt?: any;
}

export default function TripsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TripStatus>('upcoming');
  const [trips, setTrips] = useState<UserTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (user) {
      loadUserTrips();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Fade in animation when tab changes
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const loadUserTrips = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch posts where user has joined (joinedProfiles contains user.uid)
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        where('joinedProfiles', 'array-contains', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const userTrips: UserTrip[] = [];
          const now = new Date();

          snapshot.forEach((doc) => {
            const data = doc.data();
            const tripId = doc.id;

            // Determine trip status based on dates
            let status: TripStatus = 'upcoming';
            if (data.startDate && data.endDate) {
              const startDate = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
              const endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);

              if (now >= startDate && now <= endDate) {
                status = 'ongoing';
              } else if (now > endDate) {
                status = 'completed';
              } else {
                status = 'upcoming';
              }
            }

            // Get traveler count (joinedCount or length of joinedProfiles)
            const travelers = data.joinedCount || (data.joinedProfiles?.length || 1);

            userTrips.push({
              id: tripId,
              postId: tripId,
              title: data.title || data.caption || 'Untitled Trip',
              destination: data.location || data.destination || 'Unknown',
              destinationImage: data.imageUrl || data.images?.[0] || null,
              startDate: data.startDate,
              endDate: data.endDate,
              status,
              travelers,
              bookingId: tripId,
              createdAt: data.createdAt,
            });
          });

          setTrips(userTrips);
          setLoading(false);
        },
        (error) => {
          console.error('Error loading trips:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching trips:', error);
      setLoading(false);
    }
  };

  const filteredTrips = trips.filter(trip => trip.status === activeTab);

  const formatDate = (date: any): string => {
    if (!date) return 'TBD';
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}`;
    } catch {
      return 'TBD';
    }
  };

  const formatDateRange = (startDate: any, endDate: any): string => {
    if (!startDate || !endDate) return 'TBD';
    try {
      const start = startDate?.toDate ? startDate.toDate() : new Date(startDate);
      const end = endDate?.toDate ? endDate.toDate() : new Date(endDate);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[start.getMonth()]} ${start.getDate()} - ${months[end.getMonth()]} ${end.getDate()}`;
    } catch {
      return 'TBD';
    }
  };

  const calculateDuration = (startDate: any, endDate: any): string => {
    if (!startDate || !endDate) return 'TBD';
    try {
      const start = startDate?.toDate ? startDate.toDate() : new Date(startDate);
      const end = endDate?.toDate ? endDate.toDate() : new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const nights = diffDays - 1;
      return `${nights}N/${diffDays}D`;
    } catch {
      return 'TBD';
    }
  };

  const getStatusBadge = (status: TripStatus) => {
    switch (status) {
      case 'upcoming':
        return { label: 'Confirmed', color: COLORS.success, icon: 'checkmark-circle' };
      case 'ongoing':
        return { label: 'On Going', color: COLORS.warning, icon: 'time' };
      case 'completed':
        return { label: 'Completed', color: COLORS.textSecondary, icon: 'checkmark-circle' };
      default:
        return { label: 'Confirmed', color: COLORS.success, icon: 'checkmark-circle' };
    }
  };

  const handleBookingDetails = (trip: UserTrip) => {
    // Navigate to booking details screen
    navigation.navigate('BookingDetails', { tripId: trip.id, postId: trip.postId });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MyTrips</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => {
            setActiveTab('upcoming');
            fadeAnim.setValue(0);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ongoing' && styles.tabActive]}
          onPress={() => {
            setActiveTab('ongoing');
            fadeAnim.setValue(0);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'ongoing' && styles.tabTextActive]}>
            OnGoing
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => {
            setActiveTab('completed');
            fadeAnim.setValue(0);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading trips...</Text>
        </View>
      ) : filteredTrips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="airplane-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>No {activeTab} trips</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'upcoming'
              ? "You don't have any upcoming trips yet."
              : activeTab === 'ongoing'
              ? "You don't have any ongoing trips."
              : "You don't have any completed trips yet."}
          </Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredTrips.map((trip) => {
              const statusBadge = getStatusBadge(trip.status);
              const duration = calculateDuration(trip.startDate, trip.endDate);

              return (
                <View key={trip.id} style={styles.tripCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Text style={styles.tripTitle}>{trip.title}</Text>
                      <Text style={styles.tripId}>Id :{trip.id.slice(0, 7)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusBadge.color + '20' }]}>
                      <Icon name={statusBadge.icon} size={14} color={statusBadge.color} />
                      <Text style={[styles.statusText, { color: statusBadge.color }]}>
                        {statusBadge.label}
                      </Text>
                    </View>
                  </View>

                  {/* Card Content */}
                  <View style={styles.cardContent}>
                    <View style={styles.cardLeft}>
                      {/* Dates and Travelers */}
                      <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                          <Icon name="calendar-outline" size={16} color={COLORS.primary} />
                          <Text style={styles.detailText}>
                            {formatDateRange(trip.startDate, trip.endDate)}
                          </Text>
                        </View>
                        <View style={[styles.paxBadge, { backgroundColor: COLORS.primary20 }]}>
                          <Text style={[styles.paxText, { color: COLORS.primary }]}>
                            {trip.travelers || 1} pax
                          </Text>
                        </View>
                      </View>

                      {/* Booking Details Button */}
                      <TouchableOpacity
                        style={styles.bookingButton}
                        onPress={() => handleBookingDetails(trip)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.bookingButtonText}>Booking Details</Text>
                        <Icon name="document-text-outline" size={18} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                    </View>

                    {/* Destination Image and Info */}
                    <View style={styles.cardRight}>
                      {trip.destinationImage ? (
                        <Image
                          source={{ uri: trip.destinationImage }}
                          style={styles.destinationImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.destinationImage, styles.placeholderImage]}>
                          <Icon name="image-outline" size={32} color={COLORS.textSecondary} />
                        </View>
                      )}
                      <Text style={styles.destinationName}>{trip.destination}</Text>
                      <Text style={styles.durationText}>{duration}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'Poppins-Bold',
  },
  headerRight: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary20,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: 'Poppins-SemiBold',
  },
  tabTextActive: {
    color: COLORS.white,
    fontFamily: 'Poppins-Bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'Poppins-Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tripCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  tripId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Poppins-Regular',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'capitalize',
  },
  cardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  cardLeft: {
    flex: 1,
    gap: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontFamily: 'Poppins-Regular',
  },
  paxBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paxText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  bookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentPeach,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    alignSelf: 'flex-start',
  },
  bookingButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: 'Poppins-SemiBold',
  },
  cardRight: {
    width: 100,
    alignItems: 'center',
  },
  destinationImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: 8,
  },
  placeholderImage: {
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 4,
    textAlign: 'center',
  },
  durationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Poppins-Regular',
  },
});
