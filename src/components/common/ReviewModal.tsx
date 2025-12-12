/**
 * ReviewModal
 * 
 * Modal for submitting reviews after trip completion.
 * Rating (stars) is mandatory, feedback is optional.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../utils/colors';
import { addReview } from '../../services/review/reviewService';
import CustomText from './CustomText';

interface ReviewModalProps {
  visible: boolean;
  postId: string;
  postTitle?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReviewModal({
  visible,
  postId,
  postTitle,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');

  const handleRatingPress = (value: number) => {
    setRating(value);
    setRatingError(''); // Clear error when user selects rating
  };

  const handleSubmit = async () => {
    // Validate rating (mandatory)
    if (!rating || rating < 1 || rating > 5) {
      setRatingError('Please select a rating before submitting.');
      return;
    }

    setSubmitting(true);
    setRatingError('');

    try {
      await addReview(postId, rating, feedback);
      
      // Reset form
      setRating(0);
      setFeedback('');
      
      Alert.alert('Success', 'Your review has been submitted successfully!', [
        { text: 'OK', onPress: () => {
          onClose();
          onSuccess?.();
        }},
      ]);
    } catch (error: any) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', error.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setFeedback('');
    setRatingError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <CustomText weight="bold" style={styles.title}>
              Rate Your Experience
            </CustomText>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {postTitle && (
            <Text style={styles.postTitle}>{postTitle}</Text>
          )}

          <View style={styles.ratingSection}>
            <CustomText weight="semiBold" style={styles.label}>
              Rating <Text style={styles.required}>*</Text>
            </CustomText>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRatingPress(star)}
                  style={styles.starButton}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={rating >= star ? 'star' : 'star-outline'}
                    size={40}
                    color={rating >= star ? '#FFD700' : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {ratingError ? (
              <Text style={styles.errorText}>{ratingError}</Text>
            ) : null}
          </View>

          <View style={styles.feedbackSection}>
            <CustomText weight="semiBold" style={styles.label}>
              Feedback (Optional)
            </CustomText>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Share your experience..."
              placeholderTextColor={colors.mutedText}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  postTitle: {
    fontSize: 16,
    color: colors.mutedText,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  ratingSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  required: {
    color: colors.danger,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  feedbackSection: {
    marginBottom: 24,
  },
  feedbackInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

