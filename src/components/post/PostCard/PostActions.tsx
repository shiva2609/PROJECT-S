import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';

interface PostActionsProps {
  isLiked?: boolean;
  isSaved?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
}

export default function PostActions({
  isLiked = false,
  isSaved = false,
  onLike,
  onComment,
  onShare,
  onSave,
}: PostActionsProps) {
  const [showHeart, setShowHeart] = useState(false);
  const heartScale = useRef(new Animated.Value(0)).current;

  const showHeartAnimation = () => {
    setShowHeart(true);
    heartScale.setValue(0);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.5,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }),
      Animated.timing(heartScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowHeart(false);
    });
  };

  const handleLike = () => {
    showHeartAnimation();
    onLike?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftActions}>
        <TouchableOpacity
          onPress={handleLike}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon
            name={isLiked ? 'heart' : 'heart-outline'}
            size={28}
            color={isLiked ? Colors.accent.red : Colors.black.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onComment}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chatbubble-outline" size={26} color={Colors.black.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onShare}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="paper-plane-outline" size={26} color={Colors.black.primary} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={onSave}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon
          name={isSaved ? 'bookmark' : 'bookmark-outline'}
          size={26}
          color={isSaved ? Colors.brand.primary : Colors.black.primary}
        />
      </TouchableOpacity>
      {showHeart && (
        <Animated.View
          style={[
            styles.heartOverlay,
            {
              transform: [{ scale: heartScale }],
            },
          ]}
          pointerEvents="none"
        >
          <Icon name="heart" size={80} color={Colors.accent.red} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heartOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -40,
    marginTop: -40,
    zIndex: 1000,
  },
});

