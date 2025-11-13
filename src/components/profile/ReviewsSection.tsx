/**
 * Reviews Section Component
 * 
 * Displays overall rating and list of review cards
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import Card from './Card';
import { Review } from '../../hooks/useProfileData';

interface ReviewsSectionProps {
  reviews: Review[];
}

export default function ReviewsSection({ reviews }: ReviewsSectionProps) {
  const overallRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => {
      const filled = index < Math.floor(rating);
      const halfFilled = index === Math.floor(rating) && rating % 1 >= 0.5;
      return (
        <Icon
          key={index}
          name={filled ? 'star' : halfFilled ? 'star-half' : 'star-outline'}
          size={16}
          color={Colors.brand.primary}
        />
      );
    });
  };

  if (reviews.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>Reviews from other users will appear here</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Overall Rating */}
      <Card style={styles.ratingCard}>
        <Text style={styles.ratingLabel}>Overall Rating</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.ratingNumber}>{overallRating.toFixed(1)}</Text>
          <View style={styles.starsContainer}>
            {renderStars(overallRating)}
          </View>
          <Text style={styles.ratingCount}>({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</Text>
        </View>
      </Card>

      {/* Review Cards */}
      {reviews.map((review) => (
        <Card key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            {review.reviewerPhoto ? (
              <Image source={{ uri: review.reviewerPhoto }} style={styles.reviewerPhoto} />
            ) : (
              <View style={styles.reviewerPhotoPlaceholder}>
                <Text style={styles.reviewerPhotoText}>
                  {review.reviewerName?.charAt(0).toUpperCase() || 'A'}
                </Text>
              </View>
            )}
            <View style={styles.reviewerInfo}>
              <Text style={styles.reviewerName}>{review.reviewerName || 'Anonymous'}</Text>
              <View style={styles.reviewStars}>
                {renderStars(review.rating)}
              </View>
            </View>
          </View>
          {review.feedback && (
            <Text style={styles.reviewFeedback}>{review.feedback}</Text>
          )}
        </Card>
      ))}
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
  ratingCard: {
    marginBottom: 16,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingNumber: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: Colors.brand.primary,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingCount: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  reviewCard: {
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  reviewerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white.tertiary,
  },
  reviewerPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerPhotoText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.white.primary,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewFeedback: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    lineHeight: 20,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
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

