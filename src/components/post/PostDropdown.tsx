/**
 * Post Dropdown Component
 * Handles dynamic 3-dots dropdown with actions based on post context
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Fonts } from '../../theme/fonts';
import { Colors } from '../../theme/colors';
import { Post } from '../../services/api/firebaseService';
import { getPostDropdownOptions, DropdownOption } from '../../utils/postDropdownHelpers';
import ConfirmationModal from '../common/ConfirmationModal';
// V1: hidePost removed - Hide Post option no longer available
import { deletePost, blockUser, muteUser } from '../../services/api/firebaseService';
import * as PostInteractions from '../../global/services/posts/post.interactions.service';
import { useFollow } from '../../hooks/useFollow';
import { showSuccessToast } from '../../utils/toast';

interface PostDropdownProps {
  post: Post;
  postUserId: string;
  currentUserId: string;
  isFollowing: boolean;
  inForYou: boolean;
  visible: boolean;
  onClose: () => void;
  onPostRemoved?: (postId: string) => void; // Callback when post is removed from feed
}

export default function PostDropdown({
  post,
  postUserId,
  currentUserId,
  isFollowing,
  inForYou,
  visible,
  onClose,
  onPostRemoved,
}: PostDropdownProps) {
  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const dropdownOpacity = useRef(new Animated.Value(0)).current;
  const { unfollow } = useFollow(postUserId);

  const options = getPostDropdownOptions({
    postUserId,
    currentUserId,
    isFollowing,
    inForYou,
  });

  // Animate dropdown
  useEffect(() => {
    Animated.timing(dropdownOpacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const handleOptionPress = (option: DropdownOption) => {
    onClose();

    switch (option) {
      case 'Delete':
        setConfirmationModal({
          visible: true,
          title: 'Delete Post',
          message: 'Are you sure you want to delete this post? This action cannot be undone.',
          confirmLabel: 'Delete',
          onConfirm: handleDelete,
        });
        break;

      case 'Unfollow':
        setConfirmationModal({
          visible: true,
          title: 'Unfollow',
          message: `Are you sure you want to unfollow this user? You won't see their posts in your Following feed.`,
          confirmLabel: 'Unfollow',
          onConfirm: handleUnfollow,
        });
        break;

      case 'Mute':
        setConfirmationModal({
          visible: true,
          title: 'Mute',
          message: `Are you sure you want to mute this user? You won't see their posts, but you'll still be following them.`,
          confirmLabel: 'Mute',
          onConfirm: handleMute,
        });
        break;

      case 'Block':
        setConfirmationModal({
          visible: true,
          title: 'Block',
          message: `Are you sure you want to block this user? You won't see their posts and they won't be able to see yours.`,
          confirmLabel: 'Block',
          onConfirm: handleBlock,
        });
        break;

      case 'Report':
        setConfirmationModal({
          visible: true,
          title: 'Report',
          message: 'Are you sure you want to report this post? Our team will review it.',
          confirmLabel: 'Report',
          onConfirm: handleReport,
        });
        break;
    }
  };

  // Optimistic update: Remove post from UI immediately
  const handleDelete = async () => {
    setConfirmationModal(null);

    // Optimistic: Remove from UI immediately
    if (onPostRemoved) {
      onPostRemoved(post.id);
    }

    try {
      await deletePost(post.id, postUserId);
      console.log('✅ Post deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting post:', error);
      // Note: Post already removed from UI optimistically
      // In a real app, you might want to show an error and re-add it
    }

    if (onClose) onClose();
  };

  const handleUnfollow = async () => {
    setConfirmationModal(null);

    // Optimistic: Remove post from Following feed immediately
    // If in For You, the button state will update via useFollow hook
    if (onPostRemoved && !inForYou) {
      // Only remove from Following tab, not For You
      onPostRemoved(post.id);
    }

    try {
      await unfollow();
      console.log('✅ User unfollowed successfully');
      // If in For You, button will change to "Follow" via useFollow hook
    } catch (error: any) {
      console.error('❌ Error unfollowing user:', error);
    }

    onClose();
  };

  const handleMute = async () => {
    setConfirmationModal(null);

    // Note: Keep post visible (as per requirements)
    // Only hide future posts from this user

    try {
      await muteUser(currentUserId, postUserId);
      console.log('✅ User muted successfully');
      showSuccessToast('Muted');
    } catch (error: any) {
      console.error('❌ Error muting user:', error);
      // Still show success to user (optimistic)
      showSuccessToast('Muted');
    }

    onClose();
  };

  const handleBlock = async () => {
    setConfirmationModal(null);

    // Optimistic: Remove all posts from this user immediately
    if (onPostRemoved) {
      onPostRemoved(post.id);
    }

    try {
      await blockUser(currentUserId, postUserId);
      console.log('✅ User blocked successfully');
    } catch (error: any) {
      console.error('❌ Error blocking user:', error);
    }

    if (onClose) onClose();
  };

  const handleReport = async () => {
    setConfirmationModal(null);

    try {
      // V1 MODERATION: Pass post owner ID as reportedUserId for admin tracking
      await PostInteractions.reportPost(post.id, currentUserId, 'Inappropriate content', postUserId);
      console.log('✅ Post reported successfully');
      showSuccessToast('Reported to admin');
    } catch (error: any) {
      console.error('❌ Error reporting post:', error);
      // Still show success to user (optimistic)
      showSuccessToast('Reported to admin');
    }

    onClose();
  };

  // V1: handleHidePost removed - Hide Post option no longer available

  if (options.length === 0) {
    return null;
  }

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback
          onPress={onClose}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.dropdown,
                {
                  opacity: dropdownOpacity,
                  transform: [
                    {
                      translateY: dropdownOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {options.map((option, index) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.dropdownItem,
                    index === 0 && styles.dropdownItemFirst,
                    index === options.length - 1 && styles.dropdownItemLast,
                  ]}
                  onPress={() => handleOptionPress(option)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      (option === 'Delete' || option === 'Report' || option === 'Block') &&
                      styles.destructiveText,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {confirmationModal && (
        <ConfirmationModal
          visible={confirmationModal.visible}
          title={confirmationModal.title}
          message={confirmationModal.message}
          confirmLabel={confirmationModal.confirmLabel}
          onConfirm={confirmationModal.onConfirm}
          onCancel={() => setConfirmationModal(null)}
        />
      )}
    </>
  );
}


const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: Colors.white.primary,
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.white.tertiary,
  },
  dropdownItemFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  dropdownItemText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.black.primary,
    textAlign: 'center',
  },
  destructiveText: {
    color: '#FF3B30', // Red for destructive actions
    fontFamily: Fonts.semibold,
  },
});

