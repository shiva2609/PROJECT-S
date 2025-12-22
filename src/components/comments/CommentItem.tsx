import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import UserAvatar from '../../components/user/UserAvatar';
import { formatTimestamp } from '../../utils/postHelpers';
import { Timestamp } from '../../core/firebase/compat';

export interface CommentData {
    id: string;
    userId: string;
    username: string;
    photoURL: string | null;
    text: string;
    createdAt: Timestamp | null;
}

interface CommentItemProps {
    item: CommentData;
    onReply?: (comment: CommentData) => void;
    onLike?: (comment: CommentData) => void;
}

const CommentItem = memo(({ item, onReply, onLike }: CommentItemProps) => {
    const timestampValue = item.createdAt
        ? (item.createdAt.toMillis?.() || (item.createdAt as any).seconds * 1000 || Date.now())
        : Date.now();
    const timestamp = formatTimestamp(timestampValue);

    return (
        <View style={styles.commentItem}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
                <UserAvatar
                    uri={item.photoURL || undefined}
                    size="sm"
                />
            </View>

            {/* Content Stack */}
            <View style={styles.commentContent}>
                {/* Username */}
                <Text style={styles.commentUsername} numberOfLines={1}>
                    {item.username}
                </Text>

                {/* Comment Text */}
                <Text style={styles.commentText}>
                    {item.text}
                </Text>

                {/* Footer Row: Time + Reply + Like */}
                <View style={styles.commentFooter}>
                    <Text style={styles.commentTimestamp}>{timestamp}</Text>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.footerAction}
                        onPress={() => onReply?.(item)}
                        disabled={!onReply}
                    >
                        <Text style={styles.replyText}>Reply</Text>
                    </TouchableOpacity>

                    {/* Spacer */}
                    <View style={{ flex: 1 }} />
                </View>
            </View>
        </View>
    );
}, (prev, next) => {
    return prev.item.id === next.item.id &&
        prev.item.text === next.item.text &&
        prev.item.photoURL === next.item.photoURL &&
        prev.item.username === next.item.username &&
        // Basic timestamp check (if seconds match)
        ((prev.item.createdAt as any)?.seconds === (next.item.createdAt as any)?.seconds);
});

const styles = StyleSheet.create({
    commentItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    avatarContainer: {
        marginRight: 12,
        paddingTop: 4,
    },
    commentContent: {
        flex: 1,
    },
    commentUsername: {
        fontSize: 13,
        fontFamily: Fonts.semibold,
        color: Colors.black.primary,
        marginBottom: 2,
    },
    commentText: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: Colors.black.secondary,
        lineHeight: 20,
        marginBottom: 4,
    },
    commentFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    commentTimestamp: {
        fontSize: 12,
        fontFamily: Fonts.regular,
        color: Colors.black.qua,
        marginRight: 16,
    },
    footerAction: {
        paddingVertical: 2,
        marginRight: 12,
    },
    replyText: {
        fontSize: 12,
        fontFamily: Fonts.semibold,
        color: Colors.black.qua,
    },
});

export default CommentItem;
