import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import UserAvatar from '../../components/user/UserAvatar';

export interface ExploreUserItemData {
    id: string;
    username: string;
    displayName?: string;
    avatarUri?: string;
    isVerified?: boolean;
}

interface ExploreUserItemProps {
    item: ExploreUserItemData;
    onPress: (userId: string) => void;
}

const ExploreUserItem = memo(({ item, onPress }: ExploreUserItemProps) => {
    return (
        <TouchableOpacity
            style={styles.userItem}
            onPress={() => onPress(item.id)}
            activeOpacity={0.7}
        >
            <UserAvatar uri={item.avatarUri} size="md" />

            <View style={styles.userInfo}>
                <View style={styles.usernameRow}>
                    <Text style={styles.username}>@{item.username}</Text>
                    {item.isVerified && (
                        <Icon name="checkmark-circle" size={16} color={Colors.brand.primary} />
                    )}
                </View>
                {item.displayName && (
                    <Text style={styles.displayName}>{item.displayName}</Text>
                )}
            </View>

            <Icon name="chevron-forward" size={20} color={Colors.black.qua} />
        </TouchableOpacity>
    );
}, (prev, next) => {
    return prev.item.id === next.item.id &&
        prev.item.avatarUri === next.item.avatarUri &&
        prev.item.username === next.item.username &&
        prev.item.displayName === next.item.displayName;
});

const styles = StyleSheet.create({
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: Colors.white.primary,
        height: 72, // Fixed height for getItemLayout
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    username: {
        fontSize: 15,
        fontFamily: Fonts.semibold,
        color: Colors.black.primary,
    },
    displayName: {
        fontSize: 13,
        fontFamily: Fonts.regular,
        color: Colors.black.secondary,
    },
});

export default ExploreUserItem;
