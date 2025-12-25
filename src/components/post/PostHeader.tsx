import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../../theme/fonts';
import ProfileAvatar from '../user/ProfileAvatar';
import VerifiedBadge from '../../components/user/VerifiedBadge';

interface PostHeaderProps {
    username: string;
    profilePhoto: string;
    userId: string;
    isVerified?: boolean;
    location?: string;
    onProfilePress: () => void;
    showFollowButton?: boolean;
    isFollowing?: boolean;
    isOwnPost?: boolean;
    onFollow?: () => void;
    isFollowLoading?: boolean;
}

const PostHeader = ({
    username,
    profilePhoto,
    userId,
    isVerified,
    location,
    onProfilePress,
    showFollowButton,
    isFollowing,
    isOwnPost,
    onFollow,
    isFollowLoading,
}: PostHeaderProps) => {
    return (
        <View style={styles.creatorSection}>
            <TouchableOpacity
                style={styles.creatorLeft}
                activeOpacity={0.8}
                onPress={onProfilePress}
            >
                <ProfileAvatar
                    uri={profilePhoto}
                    size={38}
                    // REFACTORED: Removed story ring (borderColor) for PostCards
                    // PostCard should just be clean profile image
                    showBorder={false}
                    borderWidth={0}
                    backgroundColor="#F5F5F5"
                    iconColor="#8E8E8E"
                    userId={userId}
                />
                <View style={[styles.creatorInfo, { justifyContent: location ? 'flex-start' : 'center' }]}>
                    <View style={styles.usernameRow}>
                        <Text style={styles.username} numberOfLines={1}>{username}</Text>
                        {isVerified && (
                            <View style={styles.verifiedBadge}>
                                <VerifiedBadge size={14} />
                            </View>
                        )}
                    </View>
                    {location ? (
                        <View style={styles.locationRow}>
                            <Icon name="location-outline" size={12} color="#8E8E8E" />
                            <Text style={styles.location}>{location}</Text>
                        </View>
                    ) : null}
                </View>
            </TouchableOpacity>

            <View style={styles.creatorRight}>
                {!isOwnPost && showFollowButton ? (
                    <TouchableOpacity
                        style={[styles.followButton, isFollowLoading && styles.followButtonLoading]}
                        activeOpacity={0.8}
                        onPress={onFollow}
                        disabled={isFollowLoading}
                    >
                        <Text style={styles.followButtonText}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    creatorSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
    },
    creatorLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    creatorInfo: {
        flex: 1,
        marginLeft: 10,
        justifyContent: 'center', // Default center if no location
    },
    usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    username: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: '#000000',
        flexShrink: 1,
    },
    verifiedBadge: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginTop: 1, // Clean spacing below username
    },
    location: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: '#8E8E8E',
    },
    creatorRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    followButton: {
        backgroundColor: '#FF6600', // Brand primary color - official brand palette
        paddingHorizontal: 18,
        paddingVertical: 6,
        borderRadius: 20,
    },
    followButtonLoading: {
        opacity: 0.6,
    },
    followButtonText: {
        fontFamily: Fonts.semibold,
        fontSize: 13,
        color: '#FFFFFF',
    },
});

export default memo(PostHeader);
