import React, { useEffect, useState, useCallback } from 'react';
import {
    View, FlatList, StyleSheet, Text, Modal, Image, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { StoryAvatar } from './StoryAvatar';
import { StoryViewer } from './StoryViewer';
import { StoryService } from '../../services/story/story.service';
import { StoryUser } from '../../types/story';
import { auth } from '../../core/firebase';
import { colors } from '../../utils/colors';
import { getUserProfilePhoto } from '../../services/users/userProfilePhotoService';

import { StoryComposer } from './StoryComposer';

export const StoryFeed = () => {
    const [stories, setStories] = useState<StoryUser[]>([]);
    const [currentUserStory, setCurrentUserStory] = useState<StoryUser | null>(null);
    const [selectedUser, setSelectedUser] = useState<StoryUser | null>(null);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [uploadMedia, setUploadMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);
    const [currentUserAvatar, setCurrentUserAvatar] = useState<string>('');
    const [avatarError, setAvatarError] = useState(false);

    const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());

    // ... (loadStories and useEffect omitted for brevity in replace, assuming they are correct)

    const loadStories = useCallback(async () => {
        const feed = await StoryService.getStoryFeed();

        // 🔐 FILTER: Exclude current user from feed, show separately in "Your Story"
        const myUid = auth.currentUser?.uid;
        if (myUid) {
            const myStory = feed.find(s => s.userId === myUid);
            const others = feed.filter(s => s.userId !== myUid);

            setStories(others);
            setCurrentUserStory(myStory || null);
        } else {
            setStories(feed);
            setCurrentUserStory(null);
        }
    }, []);

    useEffect(() => {
        loadStories();
        // Fetch current user avatar reliably
        if (auth.currentUser) {
            if (auth.currentUser.photoURL) setCurrentUserAvatar(auth.currentUser.photoURL);

            // Also double check with our service which checks Firestore
            getUserProfilePhoto(auth.currentUser.uid).then(url => {
                if (url) setCurrentUserAvatar(url);
            });
        }
    }, [loadStories]);

    const handleAddStory = async () => {
        try {
            const result = await launchImageLibrary({ mediaType: 'mixed', selectionLimit: 1 });
            if (result.assets && result.assets[0] && result.assets[0].uri) {
                const type = result.assets[0].type?.startsWith('video') ? 'video' : 'image';
                setUploadMedia({ uri: result.assets[0].uri, type });
                setUploadModalVisible(true);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const submitStory = async (caption: string, renderedUri?: string) => {
        if (!uploadMedia) return;

        // Use rendered composition if available, otherwise original
        const uriToUpload = renderedUri || uploadMedia.uri;

        try {
            await StoryService.uploadStory(uriToUpload, uploadMedia.type, caption);
            setUploadModalVisible(false);
            setUploadMedia(null);
            Alert.alert('Success', 'Story uploaded!');
            loadStories(); // Refresh
        } catch (e: any) {
            if (e.message && e.message.includes('Permission denied')) {
                Alert.alert('Deployment Needed', 'Please run "firebase deploy --only storage" in your terminal to enable uploads.');
            } else {
                Alert.alert('Error', 'Failed to upload story');
            }
        }
    };


    const handleStoryFinish = (finishedUserId?: string) => {
        // Auto-advance logic (IMMEDIATE)
        if (!finishedUserId) {
            setSelectedUser(null);
            return;
        }

        if (currentUserStory && currentUserStory.userId === finishedUserId) {
            if (stories.length > 0) {
                setSelectedUser(stories[0] || null);
            } else {
                setSelectedUser(null);
            }
        } else {
            const currentIndex = stories.findIndex(s => s.userId === finishedUserId);
            if (currentIndex !== -1 && currentIndex < stories.length - 1) {
                setSelectedUser(stories[currentIndex + 1] || null);
            } else {
                setSelectedUser(null);
            }
        }
    };

    const handleStoryView = useCallback((storyId: string) => {
        // ISSUE 2: Multi-Story Independent Tracking
        // Add specific story to viewed set for precise computation
        setViewedStoryIds(prev => {
            if (prev.has(storyId)) return prev;
            const next = new Set(prev);
            next.add(storyId);
            return next;
        });
    }, []);

    const handleStoryDelete = useCallback((storyId: string) => {
        // Optimistic update for UI responsiveness

        // 1. Update Current User Story (My Story)
        if (currentUserStory) {
            const updatedStories = currentUserStory.stories.filter(s => s.id !== storyId);
            if (updatedStories.length === 0) {
                setCurrentUserStory(null);
            } else {
                setCurrentUserStory({
                    ...currentUserStory,
                    stories: updatedStories
                });
            }
        }

        // 2. Also refetch to ensure backend sync
        loadStories();
    }, [currentUserStory, loadStories]);

    const isUserFullyViewed = (user: StoryUser) => {
        const uid = auth.currentUser?.uid;
        if (!uid) return true;

        // A user is fully viewed IF all their stories are either in the server 'views' or our local 'viewedStoryIds'
        return user.stories.every(s => {
            const serverViewed = Array.isArray(s.views) && s.views.includes(uid);
            const localViewed = viewedStoryIds.has(s.id);
            return serverViewed || localViewed;
        });
    };

    const renderItem = ({ item }: { item: StoryUser }) => {
        const effectiveHasUnseen = !isUserFullyViewed(item);
        const displayItem = { ...item, hasUnseen: effectiveHasUnseen };

        return (
            <StoryAvatar
                user={displayItem}
                onPress={() => setSelectedUser(item)}
            />
        );
    };

    const currentUser = auth.currentUser;
    const myStoryHasUnseen = currentUserStory ? !isUserFullyViewed(currentUserStory) : false;

    return (
        <View style={styles.container}>
            {/* ... listContainer ... */}
            <View style={styles.listContainer}>
                {/* ... (omitted for brevity, assume unchanged inside listContainer) ... */}
                <View style={styles.addBtnContainer}>
                    <View style={styles.addBtnCircle}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => {
                                if (currentUserStory) {
                                    // 🚀 FIX: Inject fresh avatar into story viewer for self
                                    setSelectedUser({
                                        ...currentUserStory,
                                        avatar: currentUserAvatar || currentUserStory.avatar
                                    });
                                } else {
                                    handleAddStory();
                                }
                            }}
                        >
                            {currentUserAvatar && !avatarError ? (
                                <Image
                                    source={{ uri: currentUserAvatar }}
                                    style={styles.myAvatar}
                                    onError={() => setAvatarError(true)}
                                />
                            ) : (
                                <View style={[styles.myAvatar, styles.fallbackMyAvatar]}>
                                    <Icon name="person" size={32} color="#888" />
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Plus Badge */}
                        <TouchableOpacity
                            style={styles.plusBadge}
                            onPress={handleAddStory}
                        >
                            <Text style={styles.plusText}>+</Text>
                        </TouchableOpacity>

                        {/* Ring for active story */}
                        {currentUserStory && (
                            <View style={{
                                position: 'absolute',
                                top: -2, left: -2, right: -2, bottom: -2,
                                borderRadius: 36,
                                borderWidth: 2,
                                borderColor: myStoryHasUnseen ? colors.primary : '#E0E0E0',
                                zIndex: -1
                            }} />
                        )}
                    </View>
                    <Text style={styles.username}>Your Story</Text>
                </View>

                <FlatList
                    horizontal
                    data={stories}
                    renderItem={renderItem}
                    keyExtractor={item => item.userId}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
            </View>

            {/* Viewer */}
            {selectedUser && (
                <StoryViewer
                    visible={!!selectedUser}
                    userStories={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onFinish={handleStoryFinish}
                    onViewStory={handleStoryView}
                    onDelete={handleStoryDelete}
                />
            )}

            {/* Premium Compose Screen */}
            <StoryComposer
                visible={uploadModalVisible}
                media={uploadMedia}
                onClose={() => {
                    setUploadModalVisible(false);
                    setUploadMedia(null);
                }}
                onPost={submitStory}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        // BG Seamless Fix: No background highlight or border, matches parent
        // borderBottomWidth: 1, 
        // borderBottomColor: colors.border,
        // backgroundColor: colors.surface,
    },
    // ... existing listContainer ...
    listContainer: {
        flexDirection: 'row',
    },
    listContent: {
        paddingRight: 16,
    },
    addBtnContainer: {
        alignItems: 'center',
        marginLeft: 16,
        marginRight: 16,
        width: 72,
    },
    addBtnCircle: {
        marginBottom: 4,
        width: 68,
        height: 68,
    },
    myAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        margin: 2,
    },
    fallbackMyAvatar: {
        backgroundColor: '#E1E1E1',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 2,
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    plusBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    plusText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        lineHeight: 16, // Visual centering
    },
    username: {
        fontSize: 11,
        color: colors.text,
        textAlign: 'center',
    },
});
