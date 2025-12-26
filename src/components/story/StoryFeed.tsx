import React, { useEffect, useState, useCallback } from 'react';
import {
    View, FlatList, StyleSheet, Text, Modal, Image, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { StoryAvatar } from './StoryAvatar';
import { StoryViewer } from './StoryViewer';
import { StoryService } from '../../services/story/story.service';
import { StoryUser } from '../../types/story';
import { auth } from '../../core/firebase';
import { colors } from '../../utils/colors';
import { getUserProfilePhoto } from '../../services/users/userProfilePhotoService';

export const StoryFeed = () => {
    const [stories, setStories] = useState<StoryUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<StoryUser | null>(null);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [uploadMedia, setUploadMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);
    const [caption, setCaption] = useState('');
    const [uploading, setUploading] = useState(false);
    const [currentUserAvatar, setCurrentUserAvatar] = useState<string>('');
    const [avatarError, setAvatarError] = useState(false);

    const loadStories = useCallback(async () => {
        const feed = await StoryService.getStoryFeed();
        setStories(feed);
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

    const submitStory = async () => {
        if (!uploadMedia) return;
        setUploading(true);
        try {
            await StoryService.uploadStory(uploadMedia.uri, uploadMedia.type, caption);
            setUploadModalVisible(false);
            setUploadMedia(null);
            setCaption('');
            Alert.alert('Success', 'Story uploaded!');
            loadStories(); // Refresh
        } catch (e: any) {
            if (e.message && e.message.includes('Permission denied')) {
                Alert.alert('Deployment Needed', 'Please run "firebase deploy --only storage" in your terminal to enable uploads.');
            } else {
                Alert.alert('Error', 'Failed to upload story');
            }
        } finally {
            setUploading(false);
        }
    };

    const renderItem = ({ item }: { item: StoryUser }) => (
        <StoryAvatar
            user={item}
            onPress={() => setSelectedUser(item)}
        />
    );

    const currentUser = auth.currentUser;

    // Header component for list: Add Story Button
    // Actually, standard is to put it as first item.
    // We can inject a "My Story" placeholder if not present in list?
    // Or purely button. Let's make it a button left of list.

    return (
        <View style={styles.container}>
            <View style={styles.listContainer}>
                {/* Helper to add Add Button as first item nicely */}
                <TouchableOpacity style={styles.addBtnContainer} onPress={handleAddStory}>
                    <View style={styles.addBtnCircle}>
                        {currentUserAvatar && !avatarError ? (
                            <Image
                                source={{ uri: currentUserAvatar }}
                                style={styles.myAvatar}
                                onError={() => setAvatarError(true)}
                            />
                        ) : (
                            <View style={[styles.myAvatar, styles.fallbackMyAvatar]}>
                                {/* If no image, show generic user icon or initials if we had name */}
                                <Text style={{ fontSize: 20, color: '#888' }}>?</Text>
                            </View>
                        )}
                        <View style={styles.plusBadge}>
                            <Text style={styles.plusText}>+</Text>
                        </View>
                    </View>
                    <Text style={styles.username}>Your Story</Text>
                </TouchableOpacity>

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
                    onFinish={() => {
                        // Logic to move to next user could go here
                        setSelectedUser(null);
                    }}
                />
            )}

            {/* Upload Modal */}
            <Modal visible={uploadModalVisible} animationType="slide">
                <View style={styles.uploadContainer}>
                    <Text style={styles.uploadTitle}>New Story</Text>
                    {uploadMedia && (
                        <Image
                            source={{ uri: uploadMedia.uri }}
                            style={styles.previewImage}
                            resizeMode="contain"
                        />
                    )}
                    <TextInput
                        style={styles.input}
                        placeholder="Add a caption..."
                        value={caption}
                        onChangeText={setCaption}
                        placeholderTextColor="#666"
                    />
                    <View style={styles.uploadActions}>
                        <TouchableOpacity onPress={() => setUploadModalVisible(false)} disabled={uploading}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={submitStory} disabled={uploading}>
                            {uploading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.postText}>Post</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
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

    // Upload Modal
    uploadContainer: { flex: 1, padding: 20, backgroundColor: 'white', paddingTop: 60 },
    uploadTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: colors.text },
    previewImage: { width: '100%', height: 400, backgroundColor: '#f0f0f0', borderRadius: 10, marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 20, color: colors.text },
    uploadActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cancelText: { fontSize: 16, color: colors.danger },
    postText: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
});
