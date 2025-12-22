import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { formatTimestamp } from '../../utils/formatTimestamp';
import { AggregatedNotification } from '../../services/notifications/notificationService';
import ProfileAvatar from '../../components/user/ProfileAvatar';
import FollowNotificationButton from './FollowNotificationButton';

interface NotificationItemProps {
    item: AggregatedNotification;
    onPress: (item: AggregatedNotification) => void;
    onUserPress: (userId: string) => void;
}

const NotificationItem = memo(({ item, onPress, onUserPress }: NotificationItemProps) => {
    const isUnread = !item.read;

    const handlePress = () => onPress(item);

    const handleUsernamePress = (e?: any) => {
        e?.stopPropagation?.();
        const actorId = item.actors && item.actors.length > 0 ? item.actors[0] : null;
        if (actorId) onUserPress(actorId);
    };

    const getIconName = (type: string) => {
        switch (type) {
            case 'like': return 'heart';
            case 'comment': return 'chatbubble';
            case 'follow': return 'person-add';
            default: return 'notifications';
        }
    };

    const getIconColor = (type: string) => {
        switch (type) {
            case 'like': return '#FF4B6C'; // Red/Pink
            case 'comment': return '#3D9BE9'; // Blue
            case 'follow': return '#7B61FF'; // Purple
            default: return Colors.brand.primary;
        }
    };

    const renderAvatars = () => {
        const mainAvatarUri = item.metadata?.sourceAvatarUri || item.metadata?.userAvatar || item.metadata?.actorAvatar;

        if (item.count > 1) {
            return (
                <View style={styles.avatarStack}>
                    {/* Back Avatar */}
                    <View style={[styles.stackedAvatar, styles.avatarBack]}>
                        <ProfileAvatar size={36} uri={null} />
                    </View>
                    {/* Front Avatar */}
                    <View style={[styles.stackedAvatar, styles.avatarFront]}>
                        <ProfileAvatar size={36} uri={mainAvatarUri} />
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.singleAvatar}>
                <ProfileAvatar size={44} uri={mainAvatarUri} />
                <View style={[styles.iconBadge, { backgroundColor: getIconColor(item.type) }]}>
                    <Icon name={getIconName(item.type)} size={12} color={Colors.white.primary} />
                </View>
            </View>
        );
    };

    const renderText = () => {
        const username = item.sourceUsername || 'Someone';
        // Base styles
        const baseStyle = [styles.notificationBody, isUnread && styles.notificationBodyUnread];
        const usernameStyle = [styles.username, { color: Colors.black.primary }];

        if (item.type === 'follow') {
            return (
                <Text style={baseStyle}>
                    <Text style={usernameStyle} onPress={handleUsernamePress}>{username}</Text> started following you.
                </Text>
            );
        }

        if (item.type === 'like') {
            if (item.count > 1) {
                return (
                    <Text style={baseStyle}>
                        <Text style={usernameStyle} onPress={handleUsernamePress}>{username}</Text> and <Text style={styles.bold}>{item.count - 1} others</Text> liked your post.
                    </Text>
                );
            }
            return (
                <Text style={baseStyle}>
                    <Text style={usernameStyle} onPress={handleUsernamePress}>{username}</Text> liked your post.
                </Text>
            );
        }

        if (item.type === 'comment') {
            if (item.count > 1) {
                return (
                    <Text style={baseStyle}>
                        <Text style={usernameStyle} onPress={handleUsernamePress}>{username}</Text> and <Text style={styles.bold}>{item.count - 1} others</Text> commented on your post.
                    </Text>
                );
            }
            return (
                <Text style={baseStyle}>
                    <Text style={usernameStyle} onPress={handleUsernamePress}>{username}</Text> commented: "{item.metadata?.text || 'Nice!'}"
                </Text>
            );
        }

        return <Text style={baseStyle}>New notification</Text>;
    };

    return (
        <TouchableOpacity
            style={[
                styles.notificationItem,
                isUnread && styles.notificationItemUnread,
            ]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            {/* Left: Avatars */}
            <View style={styles.leftContainer}>
                {renderAvatars()}
            </View>

            {/* Center: Text */}
            <View style={styles.contentContainer}>
                {renderText()}
                <Text style={styles.timeText}>{formatTimestamp(item.timestamp)}</Text>
            </View>

            {/* Right: Post Preview or Follow Button */}
            {item.previewImage ? (
                <Image source={{ uri: item.previewImage }} style={styles.postPreview} />
            ) : item.type === 'follow' && item.actors[0] ? (
                <FollowNotificationButton targetUserId={item.actors[0]} />
            ) : null}

        </TouchableOpacity>
    );
}, (prev, next) => {
    return prev.item.id === next.item.id &&
        prev.item.read === next.item.read &&
        prev.item.count === next.item.count &&
        prev.item.timestamp?.seconds === next.item.timestamp?.seconds;
});

const styles = StyleSheet.create({
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingHorizontal: 16,
        backgroundColor: Colors.white.secondary,
        marginBottom: 4,
        height: 80, // Fixed height for potential getItemLayout usage
    },
    notificationItemUnread: {
        backgroundColor: Colors.brand.accent + '08',
    },
    leftContainer: {
        marginRight: 12,
        justifyContent: 'center',
        width: 50,
    },
    contentContainer: {
        flex: 1,
        paddingRight: 8,
    },
    notificationBody: {
        fontSize: 14,
        color: Colors.black.primary,
        lineHeight: 20,
    },
    notificationBodyUnread: {
        fontWeight: '500',
    },
    username: {
        fontWeight: 'bold',
    },
    bold: {
        fontWeight: 'bold',
    },
    timeText: {
        fontSize: 12,
        color: Colors.black.qua,
        marginTop: 2,
    },
    postPreview: {
        width: 44,
        height: 44,
        borderRadius: 4,
        backgroundColor: Colors.white.tertiary,
    },
    singleAvatar: {
        position: 'relative',
        width: 44,
        height: 44,
    },
    iconBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.white.secondary,
    },
    avatarStack: {
        width: 44,
        height: 44,
        position: 'relative',
    },
    stackedAvatar: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: Colors.white.secondary,
        borderRadius: 18,
    },
    avatarBack: {
        top: 0,
        left: 8,
        opacity: 0.6,
    },
    avatarFront: {
        bottom: 0,
        right: 8,
    },
});

export default NotificationItem;
