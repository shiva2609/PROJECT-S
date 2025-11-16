/**
 * Bio Section Component
 * 
 * Displays Location, About Me, Interests, and Countries/States visited
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import Card from './Card';
import { ProfileData } from '../../hooks/useProfileData';

interface BioSectionProps {
  profileData: ProfileData | null;
}

export default function BioSection({ profileData }: BioSectionProps) {
  if (!profileData) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No bio information available</Text>
      </View>
    );
  }

  const { location, aboutMe, interests, countriesVisited, statesVisited } = profileData;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Location */}
      {location && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="location-outline" size={20} color={Colors.brand.primary} />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>
          <Text style={styles.sectionValue}>{location}</Text>
        </Card>
      )}

      {/* About Me */}
      {aboutMe && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="person-outline" size={20} color={Colors.brand.primary} />
            <Text style={styles.sectionTitle}>About Me</Text>
          </View>
          <Text style={styles.sectionValue}>{aboutMe}</Text>
        </Card>
      )}

      {/* Interests */}
      {interests && interests.length > 0 && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="heart-outline" size={20} color={Colors.brand.primary} />
            <Text style={styles.sectionTitle}>Interests</Text>
          </View>
          <View style={styles.chipsContainer}>
            {interests.map((interest, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>{interest}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Countries Visited */}
      {countriesVisited && countriesVisited.length > 0 && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="globe-outline" size={20} color={Colors.brand.primary} />
            <Text style={styles.sectionTitle}>Countries Visited</Text>
          </View>
          <View style={styles.chipsContainer}>
            {countriesVisited.map((country, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>{country}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* States Visited */}
      {statesVisited && statesVisited.length > 0 && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="map-outline" size={20} color={Colors.brand.primary} />
            <Text style={styles.sectionTitle}>States Visited</Text>
          </View>
          <View style={styles.chipsContainer}>
            {statesVisited.map((state, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>{state}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {!location && !aboutMe && (!interests || interests.length === 0) && 
       (!countriesVisited || countriesVisited.length === 0) && 
       (!statesVisited || statesVisited.length === 0) && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No bio information available</Text>
          <Text style={styles.emptySubtext}>Add information to your profile to share more about yourself</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F1',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
  },
  sectionValue: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    lineHeight: 20,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.brand.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.brand.primary,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.black.secondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
  },
});

