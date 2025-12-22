import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
import { isDefaultProfilePhoto } from '../../services/users/userProfilePhotoService';
import { SmartImage } from '../common/SmartImage';

export interface ChatListItemData {
    id: string;
    userId: string;
    username: string;
    profilePhoto?: string;
    lastMessage?: string;
    lastMessageTime?: number;
    unreadCount: number;
    isTyping?: boolean;
    isUnread?: boolean;
}

interface ChatListItemProps {
    item: ChatListItemData;
    onPress: (item: ChatListItemData) => void;
}

const ChatListItemAvatar = memo(({ userId, username, initialUrl }: { userId: string; username: string; initialUrl?: string }) => {
    const profilePhoto = useProfilePhoto(userId, initialUrl);
    if (isDefaultProfilePhoto(profilePhoto)) {
        return (
            <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
            </View>
        );
    }
    return (
        <SmartImage
            uri={profilePhoto}
            style={styles.avatar}
            borderRadius={24}
        />
    );
});

const ChatListItem = memo(({ item, onPress }: ChatListItemProps) => {
    const isPlaceholder = item.lastMessage === 'Start a conversation';
    const isCopilot = item.userId === 'sanchari-copilot';

    return (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => onPress(item)}
            activeOpacity={0.7}
        >
            {isCopilot ? (
                <View style={[styles.avatarPlaceholder, { backgroundColor: '#FF5C02' }]}>
                    <Icon name="compass-outline" size={24} color="#FFFFFF" />
                </View>
            ) : (
                <ChatListItemAvatar
                    userId={item.userId}
                    username={item.username}
                    initialUrl={item.profilePhoto}
                />
            )}

            <View style={styles.chatContent}>
                <Text style={[styles.chatName, item.isUnread && styles.chatNameUnread]}>
                    {item.username}
                </Text>
                <Text
                    style={[
                        styles.chatMessage,
                        item.isUnread && styles.chatMessageUnread,
                        isPlaceholder && { fontStyle: 'italic', color: Colors.brand.primary }
                    ]}
                    numberOfLines={1}
                >
                    {item.isTyping ? (
                        <Text style={styles.typingText}>Typing...</Text>
                    ) : (
                        item.lastMessage || 'No messages yet'
                    )}
                </Text>
            </View>

            {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                        {item.unreadCount > 99 ? '99+' : item.unreadCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}, (prev, next) => {
    return prev.item.id === next.item.id &&
        prev.item.lastMessage === next.item.lastMessage &&
        prev.item.unreadCount === next.item.unreadCount &&
        prev.item.isTyping === next.item.isTyping &&
        prev.item.lastMessageTime === next.item.lastMessageTime &&
        prev.item.profilePhoto === next.item.profilePhoto &&
        prev.item.username === next.item.username;
});

const styles = StyleSheet.create({
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
        height: 76,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#EAEAEA',
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E87A5D',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EAEAEA',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'System',
    },
    chatContent: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    chatName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#3C3C3B',
        marginBottom: 2,
        fontFamily: 'System',
    },
    chatNameUnread: {
        fontWeight: '800',
        color: '#000000',
    },
    chatMessage: {
        fontSize: 13,
        color: '#8E8E8E',
        fontFamily: 'System',
    },
    chatMessageUnread: {
        color: '#3C3C3B',
        fontWeight: '600',
    },
    typingText: {
        fontStyle: 'italic',
        color: '#757574',
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        paddingHorizontal: 6,
        borderRadius: 10,
        backgroundColor: '#FF5C02',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    unreadText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'System',
    },
});

export default ChatListItem;
