import React, { memo, useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface PostActionsProps {
    isLiked: boolean;
    likeCount: number;
    onLike: () => void;
    commentCount: number;
    onComment: () => void;
    shareCount: number;
    onShare: () => void;
    isSaved: boolean;
    onSave: () => void;
    onMorePress: () => void;
}

const AnimatedIcon = ({ name, size, color, scale }: { name: string, size: number, color: string, scale: any }) => (
    <Animated.View style={{ transform: [{ scale }] }}>
        <Icon name={name} size={size} color={color} />
    </Animated.View>
);

const PostActions = ({
    isLiked,
    likeCount,
    onLike,
    commentCount,
    onComment,
    shareCount,
    onShare,
    isSaved,
    onSave,
    onMorePress,
}: PostActionsProps) => {
    // Animation Values
    const likeScale = useRef(new Animated.Value(1)).current;
    const saveScale = useRef(new Animated.Value(1)).current;

    // Debounce state to prevent glitches
    const [isLikeProcessing, setIsLikeProcessing] = useState(false);

    useEffect(() => {
        // Simple distinct scale bounce on like change
        Animated.sequence([
            Animated.spring(likeScale, {
                toValue: 1.2,
                friction: 3,
                useNativeDriver: true,
            }),
            Animated.spring(likeScale, {
                toValue: 1,
                friction: 3,
                useNativeDriver: true,
            }),
        ]).start();
    }, [isLiked, likeScale]);

    useEffect(() => {
        // Bounce on save change
        Animated.sequence([
            Animated.spring(saveScale, {
                toValue: 1.2,
                friction: 3,
                useNativeDriver: true,
            }),
            Animated.spring(saveScale, {
                toValue: 1,
                friction: 3,
                useNativeDriver: true,
            }),
        ]).start();
    }, [isSaved, saveScale]);

    const handleLikePress = useCallback(() => {
        if (isLikeProcessing) return;

        setIsLikeProcessing(true);
        onLike();

        // Lock interaction for 500ms to allow optimistic update to settle/prevent spam
        setTimeout(() => setIsLikeProcessing(false), 500);
    }, [isLikeProcessing, onLike]);

    return (
        <View style={styles.container}>
            {/* Left: Main Actions (Like, Comment, Save) */}
            <View style={styles.mainActions}>
                <TouchableOpacity
                    style={styles.actionPill}
                    activeOpacity={0.7}
                    onPress={handleLikePress}
                    disabled={isLikeProcessing}
                >
                    <AnimatedIcon
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isLiked ? Colors.brand.primary : Colors.brand.primary}
                        scale={likeScale}
                    />
                    <Text style={styles.actionCount}>{likeCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionPill}
                    activeOpacity={0.7}
                    onPress={onComment}
                >
                    <Icon name="chatbubble-outline" size={18} color={Colors.brand.primary} />
                    <Text style={styles.actionCount}>{commentCount}</Text>
                </TouchableOpacity>

                {/* V1 FEATURE FREEZE: Post sharing intentionally disabled for V1 stability.
                    Re-enable in V2 with finalized chat share UX.
                    Implementation code preserved below for future use.
                */}
                {/* <TouchableOpacity
                    style={styles.actionPill}
                    activeOpacity={0.7}
                    onPress={onShare}
                >
                    <Icon name="paper-plane-outline" size={18} color={Colors.brand.primary} />
                    <Text style={styles.actionCount}>{shareCount}</Text>
                </TouchableOpacity> */}

                <TouchableOpacity
                    style={styles.actionPill}
                    activeOpacity={0.7}
                    onPress={onSave}
                >
                    <AnimatedIcon
                        name={isSaved ? 'bookmark' : 'bookmark-outline'}
                        size={18}
                        color={isSaved ? Colors.brand.primary : Colors.brand.primary}
                        scale={saveScale}
                    />
                </TouchableOpacity>
            </View>

            {/* Right: More Button (Isolated) */}
            <View style={styles.moreButtonContainer}>
                <TouchableOpacity
                    style={styles.actionPill}
                    activeOpacity={0.7}
                    onPress={onMorePress}
                >
                    <Icon name="ellipsis-vertical" size={18} color={Colors.brand.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    // Container: Holds main actions on left, more button on right
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
    },
    // Main actions grouped on the left
    mainActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        flex: 1,
    },
    // More button isolated on the right with proper spacing
    moreButtonContainer: {
        marginLeft: 8,
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
        gap: 11,
    },
    actionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 102, 0, 0.12)',
        borderRadius: 50,
        paddingHorizontal: 12,
        paddingVertical: 7,
        gap: 6,
    },
    actionCount: {
        fontFamily: Fonts.semibold,
        fontSize: 13.5,
        color: Colors.brand.primary,
    },
});

export default memo(PostActions);
