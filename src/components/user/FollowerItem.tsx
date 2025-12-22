import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import UserAvatar from './UserAvatar';

export interface UserListItemProps {
    uid: string;
    username: string;
    displayName: string;
    photoURL: string;
    isFollowing: boolean;
    verified?: boolean;
}

interface FollowerItemProps {
    item: UserListItemProps;
    onPress: (userId: string) => void;
    onFollowPress: (userId: string) => void;
    onMessagePress: (userId: string) => void;
    isOwnUser: boolean;
    showMessageButton: boolean;
    isFollowing: boolean;
}

const FollowerItem = memo(({
    item,
    onPress,
    onFollowPress,
    onMessagePress,
    isOwnUser,
    showMessageButton,
    isFollowing
}: FollowerItemProps) => {

    return (
        <TouchableOpacity
            style={styles.userItem}
            onPress={() => onPress(item.uid)}
            activeOpacity={0.7}
        >
            <UserAvatar
                size="md"
                uri={item.photoURL}
                isVerified={item.verified}
            />
            <View style={styles.userInfo}>
                <Text style={styles.username} numberOfLines={1}>
                    {item.username}
                </Text>
                <Text style={styles.displayName} numberOfLines={1}>
                    {item.displayName}
                </Text>
            </View>
            <View style={styles.actions}>
                {!isOwnUser && (
                    <>
                        {showMessageButton && (
                            <TouchableOpacity
                                style={styles.messageButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onMessagePress(item.uid);
                                }}
                            >
                                <Icon name="chatbubble-outline" size={20} color={Colors.black.primary} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                styles.followButton,
                                isFollowing && styles.followingButton,
                            ]}
                            onPress={(e) => {
                                e.stopPropagation();
                                onFollowPress(item.uid);
                            }}
                        >
                            <Text
                                style={[
                                    styles.followButtonText,
                                    isFollowing && styles.followingButtonText,
                                ]}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </TouchableOpacity>
    );
}, (prev, next) => {
    return prev.item.uid === next.item.uid &&
        prev.isFollowing === next.isFollowing &&
        prev.showMessageButton === next.showMessageButton &&
        prev.item.photoURL === next.item.photoURL &&
        prev.item.displayName === next.item.displayName;
});

const styles = StyleSheet.create({
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: Colors.white.primary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.white.tertiary,
        height: 72, // Fixed height for FlatList optimization
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    username: {
        fontSize: 14,
        fontFamily: Fonts.semibold,
        color: Colors.black.primary,
        marginBottom: 2,
    },
    displayName: {
        fontSize: 13,
        fontFamily: Fonts.regular,
        color: Colors.black.qua,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    messageButton: {
        padding: 8,
    },
    followButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: Colors.brand.primary,
        borderRadius: 6,
    },
    followingButton: {
        backgroundColor: Colors.white.secondary,
        borderWidth: 1,
        borderColor: Colors.white.tertiary,
    },
    followButtonText: {
        fontSize: 14,
        fontFamily: Fonts.semibold,
        color: Colors.white.primary,
    },
    followingButtonText: {
        color: Colors.black.primary,
    },
});

export default FollowerItem;
