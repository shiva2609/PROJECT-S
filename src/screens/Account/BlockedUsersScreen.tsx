/**
 * Blocked Users Screen
 * V1 MODERATION: Manage blocked users with unblock functionality
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useAuth } from '../../providers/AuthProvider';
import { useBlockedUsers } from '../../hooks/useBlockedUsers';
import UserAvatar from '../../components/user/UserAvatar';
import { getUserPublicInfo } from '../../global/services/user/user.service';

interface BlockedUserData {
    userId: string;
    username: string;
    photoURL: string | null;
}

export default function BlockedUsersScreen({ navigation }: any) {
    const { user } = useAuth();
    const { blockedUsers, loading, unblockUser } = useBlockedUsers(user?.uid);
    const [blockedUsersData, setBlockedUsersData] = useState<BlockedUserData[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [unblocking, setUnblocking] = useState<string | null>(null);

    // Fetch user data for blocked users
    React.useEffect(() => {
        if (blockedUsers.length === 0) {
            setBlockedUsersData([]);
            setLoadingData(false);
            return;
        }

        const fetchBlockedUsersData = async () => {
            setLoadingData(true);
            try {
                const usersData = await Promise.all(
                    blockedUsers.map(async (userId) => {
                        try {
                            const userInfo = await getUserPublicInfo(userId);
                            return {
                                userId,
                                username: userInfo?.username || 'Unknown User',
                                photoURL: userInfo?.photoURL || null,
                            };
                        } catch (error) {
                            console.error(`Error fetching user ${userId}:`, error);
                            return {
                                userId,
                                username: 'Unknown User',
                                photoURL: null,
                            };
                        }
                    })
                );
                setBlockedUsersData(usersData);
            } catch (error) {
                console.error('Error fetching blocked users data:', error);
            } finally {
                setLoadingData(false);
            }
        };

        fetchBlockedUsersData();
    }, [blockedUsers]);

    const handleUnblock = (userId: string, username: string) => {
        Alert.alert(
            'Unblock User',
            `Are you sure you want to unblock @${username}? They will be able to see your posts and interact with you again.`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Unblock',
                    style: 'destructive',
                    onPress: async () => {
                        setUnblocking(userId);
                        try {
                            await unblockUser(userId);
                            console.log('✅ User unblocked successfully');
                        } catch (error: any) {
                            console.error('❌ Error unblocking user:', error);
                            Alert.alert('Error', 'Failed to unblock user. Please try again.');
                        } finally {
                            setUnblocking(null);
                        }
                    },
                },
            ]
        );
    };

    const renderBlockedUser = ({ item }: { item: BlockedUserData }) => (
        <View style={styles.userItem}>
            <View style={styles.userInfo}>
                <UserAvatar uri={item.photoURL || undefined} size="md" />
                <View style={styles.userText}>
                    <Text style={styles.username}>@{item.username}</Text>
                    <Text style={styles.blockedLabel}>Blocked</Text>
                </View>
            </View>
            <TouchableOpacity
                style={[styles.unblockButton, unblocking === item.userId && styles.unblockButtonDisabled]}
                onPress={() => handleUnblock(item.userId, item.username)}
                disabled={unblocking === item.userId}
                activeOpacity={0.7}
            >
                {unblocking === item.userId ? (
                    <ActivityIndicator size="small" color={Colors.brand.primary} />
                ) : (
                    <Text style={styles.unblockButtonText}>Unblock</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Icon name="ban-outline" size={48} color={Colors.black.qua} />
            </View>
            <Text style={styles.emptyTitle}>No Blocked Users</Text>
            <Text style={styles.emptySubtitle}>
                When you block someone, they'll appear here.
            </Text>
        </View>
    );

    if (loading || loadingData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color={Colors.black.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Blocked Users</Text>
                    <View style={styles.backButton} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.brand.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={Colors.black.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Blocked Users</Text>
                <View style={styles.backButton} />
            </View>

            <FlatList
                data={blockedUsersData}
                renderItem={renderBlockedUser}
                keyExtractor={(item) => item.userId}
                contentContainerStyle={[
                    styles.listContent,
                    blockedUsersData.length === 0 && styles.emptyListContent,
                ]}
                ListEmptyComponent={renderEmpty}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.white.tertiary,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: Colors.black.primary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    emptyListContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userText: {
        marginLeft: 12,
        flex: 1,
    },
    username: {
        fontSize: 15,
        fontFamily: Fonts.semibold,
        color: Colors.black.primary,
        marginBottom: 2,
    },
    blockedLabel: {
        fontSize: 13,
        fontFamily: Fonts.regular,
        color: Colors.black.qua,
    },
    unblockButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: Colors.brand.primary,
        minWidth: 90,
        alignItems: 'center',
    },
    unblockButtonDisabled: {
        opacity: 0.5,
    },
    unblockButtonText: {
        fontSize: 14,
        fontFamily: Fonts.semibold,
        color: Colors.brand.primary,
    },
    separator: {
        height: 1,
        backgroundColor: Colors.white.tertiary,
        marginVertical: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.white.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: Fonts.semibold,
        color: Colors.black.primary,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: Colors.black.qua,
        textAlign: 'center',
        lineHeight: 20,
    },
});
