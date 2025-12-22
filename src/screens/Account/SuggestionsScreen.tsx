import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useSuggestions, SuggestionUser } from '../../hooks/useSuggestions';
import SuggestionCard from '../../components/suggestions/SuggestionCard';

export default function SuggestionsScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { categories, loading, refresh } = useSuggestions();

    // Flatten all users from all categories for the full list
    const allUsers = React.useMemo(() => {
        const users: SuggestionUser[] = [];
        const seenIds = new Set<string>();

        categories.forEach(category => {
            category.users.forEach((user: SuggestionUser) => {
                if (!seenIds.has(user.id)) {
                    users.push(user);
                    seenIds.add(user.id);
                }
            });
        });

        return users;
    }, [categories]);

    const handleUserPress = useCallback((userId: string) => {
        navigation.navigate('ProfileScreen', { userId });
    }, [navigation]);

    const renderItem = useCallback(({ item }: { item: SuggestionUser }) => {
        // Stability check: use user properties directly or memoize at card level
        const candidate = {
            id: item.id,
            name: item.displayName || item.name || item.username || 'User',
            username: item.username || '',
            avatar: item.avatarUri || item.profilePhoto || item.profilePic,
            verified: item.isVerified || false,
            followersCount: item.followerCount || 0,
            followingCount: 0,
            postsCount: 0,
        };

        return (
            <View style={styles.cardWrapper}>
                <SuggestionCard
                    user={candidate}
                    onPress={handleUserPress}
                />
            </View>
        );
    }, [handleUserPress]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Icon name="arrow-back" size={24} color={Colors.black.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Suggested Users</Text>
                <View style={styles.headerRight} />
            </View>

            {loading && allUsers.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.brand.primary} />
                </View>
            ) : (
                <FlatList
                    data={allUsers}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No suggestions available at the moment.</Text>
                            </View>
                        ) : null
                    }
                    refreshing={loading}
                    onRefresh={refresh}
                />
            )}
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
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: Colors.black.primary,
    },
    headerRight: {
        width: 32,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 12,
        alignItems: 'center',
    },
    cardWrapper: {
        margin: 4,
    },
    emptyContainer: {
        flex: 1,
        paddingTop: 100,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: Colors.black.qua,
        textAlign: 'center',
    },
});
