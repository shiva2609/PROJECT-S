import React, { useState, useEffect, useRef } from 'react';
import {
    View, Image, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, SafeAreaView, ActivityIndicator, TouchableWithoutFeedback, Alert
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { StoryUser, Story } from '../../types/story';
import { StoryService } from '../../services/story/story.service';
import Icon from 'react-native-vector-icons/Ionicons';

import { auth } from '../../core/firebase';

const { width, height } = Dimensions.get('window');

interface Props {
    userStories: StoryUser;
    visible: boolean;
    onClose: () => void;
    onFinish?: (userId?: string) => void;
    onViewStory?: (storyId: string) => void;
}

export const StoryViewer = ({ userStories, visible, onClose, onFinish, onViewStory }: Props) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const currentStory = userStories.stories[currentIndex];
    const [progress, setProgress] = useState(0);
    const duration = 5000; // default 5s for image
    const [videoDuration, setVideoDuration] = useState(0);
    const [paused, setPaused] = useState(false);
    const finishedRef = useRef(false);

    useEffect(() => {
        if (visible && userStories.stories.length > 0) {
            // Start from first NEW story (Instagram behavior)
            // If user has viewed all, start from 0 (though ring logic usually prevents opening if all viewed unless manually clicked)
            const uid = auth.currentUser?.uid;
            let startIndex = 0;
            if (uid) {
                // Find first story I haven't seen
                const firstUnseen = userStories.stories.findIndex(s => {
                    // Safe check: ensure views is an array
                    const views = Array.isArray(s.views) ? s.views : [];
                    return !views.includes(uid);
                });
                if (firstUnseen !== -1) {
                    startIndex = firstUnseen;
                }
                // If all visited (firstUnseen === -1), startIndex remains 0 (restart)
            }

            setCurrentIndex(startIndex);
            setProgress(0);
            setVideoDuration(0);
            setLoading(true);
            finishedRef.current = false; // Reset finish guard

            // 🔐 SEEN LOGIC: Mark the STARTING story as seen immediately
            const startStory = userStories.stories[startIndex];
            if (startStory && onViewStory) {
                onViewStory(startStory.id);
            }
        }
    }, [visible, userStories]);

    const markViewed = (story: Story) => {
        StoryService.viewStory(story.id);
    };

    useEffect(() => {
        if (!visible || paused || loading || !currentStory || finishedRef.current) return;

        // For Image: Simple interval
        if (currentStory.mediaType === 'image' || currentStory.mediaType === 'text') {
            const step = 100; // ms
            const interval = setInterval(() => {
                setProgress(p => {
                    const newP = p + (step / duration);
                    if (newP >= 1) {
                        clearInterval(interval);
                        goNext(); // Auto-advance
                        return 1;
                    }
                    return newP;
                });
            }, step);
            return () => clearInterval(interval);
        }
    }, [visible, paused, loading, currentIndex, currentStory, duration]);

    const safeClose = () => {
        setTimeout(() => {
            onClose();
        }, 0);
    };

    const safeFinish = () => {
        if (finishedRef.current) return; // Prevent double trigger
        finishedRef.current = true;

        setTimeout(() => {
            if (onFinish) onFinish(userStories.userId);
            else onClose();
        }, 0);
    };

    const goNext = () => {
        if (loading || finishedRef.current) return; // Prevent jumping while loading or finished

        // Mark current story as viewed when moving past it
        if (currentStory) {
            markViewed(currentStory);
        }

        if (currentIndex < userStories.stories.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            setProgress(0);
            setVideoDuration(0);
            setLoading(true);

            // 🔐 SEEN LOGIC: Mark the NEXT story as seen immediately
            const nextStory = userStories.stories[nextIndex];
            if (nextStory && onViewStory) {
                onViewStory(nextStory.id);
            }
        } else {
            // End of this user's stories - COMPLETION CONFIRMED
            safeFinish();
        }
    };

    const goPrev = () => {
        if (loading || finishedRef.current) return;

        if (currentIndex > 0) {
            setCurrentIndex(i => i - 1);
            setProgress(0);
            setVideoDuration(0);
            setLoading(true);
        } else {
            // Restart current
            setProgress(0);
        }
    };

    const handleVideoLoad = (data: any) => {
        setVideoDuration(data.duration);
        setLoading(false);
    };

    const handleVideoProgress = (data: any) => {
        if (videoDuration > 0 && !loading && !paused) {
            setProgress(data.currentTime / videoDuration);
        }
    };

    const handleVideoEnd = () => {
        if (!loading && !paused) {
            goNext();
        }
    };

    const handleImageLoad = () => {
        setLoading(false);
    };

    const handleDelete = () => {
        if (!currentStory) return;
        setPaused(true);
        Alert.alert(
            "Delete Story",
            "Are you sure you want to delete this story?",
            [
                { text: "Cancel", onPress: () => setPaused(false), style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        if (!currentStory) return;
                        try {
                            // If we delete the last story, we might need to close?
                            // For now simple delete and close is safest as index shifts.
                            await StoryService.deleteStory(currentStory.id, currentStory.mediaUrl);
                            safeClose();
                        } catch (e) {
                            Alert.alert("Error", "Could not delete story");
                            setPaused(false);
                        }
                    }
                }
            ]
        );
    };

    if (!visible || !currentStory) return null;

    const isMine = auth.currentUser?.uid === currentStory.userId;

    return (
        <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={safeClose}>
            <View style={styles.container}>

                {/* Progress Bars */}
                <SafeAreaView style={styles.progressContainer}>
                    <View style={styles.barsRow}>
                        {userStories.stories.map((story, index) => (
                            <View key={story.id} style={styles.barBackground}>
                                <View
                                    style={[
                                        styles.barFill,
                                        {
                                            width: index === currentIndex
                                                ? `${progress * 100}%`
                                                : index < currentIndex ? '100%' : '0%'
                                        }
                                    ]}
                                />
                            </View>
                        ))}
                    </View>

                    {/* User Header */}
                    <View style={styles.header}>
                        {userStories.avatar ? (
                            <Image
                                source={{ uri: userStories.avatar }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: '#E1E1E1', justifyContent: 'center', alignItems: 'center' }]}>
                                <Icon name="person" size={16} color="#888" />
                            </View>
                        )}
                        <Text style={styles.username}>{userStories.username}</Text>
                        <Text style={styles.timeAgo}>
                            {Math.floor((Date.now() - currentStory.createdAt) / 3600000)}h
                        </Text>

                        <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
                            {isMine && (
                                <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
                                    <Text style={{ color: 'white', fontSize: 16 }}>🗑️</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={safeClose} style={styles.iconBtn}>
                                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>X</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>

                {/* Media Content */}
                <TouchableWithoutFeedback onPress={(e) => {
                    if (e.nativeEvent.locationX < width / 3) goPrev();
                    else goNext();
                }} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)}>
                    <View style={styles.mediaContainer}>
                        {loading && <ActivityIndicator size="large" color="white" style={styles.loader} />}

                        {currentStory.mediaType === 'video' ? (
                            <Video
                                source={{ uri: currentStory.mediaUrl }}
                                style={styles.media}
                                resizeMode="contain"
                                onLoad={handleVideoLoad}
                                onProgress={handleVideoProgress}
                                onEnd={handleVideoEnd}
                                paused={paused}
                                ignoreSilentSwitch="ignore"
                            />
                        ) : currentStory.mediaType === 'text' ? (
                            <View style={[styles.media, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', padding: 20, textAlign: 'center' }}>
                                    {currentStory.caption || currentStory.mediaUrl}
                                </Text>
                            </View>
                        ) : (
                            <Image
                                source={{ uri: currentStory.mediaUrl }}
                                style={styles.media}
                                resizeMode="contain"
                                onLoad={handleImageLoad}
                            />
                        )}

                        {/* Caption */}
                        {currentStory.caption && currentStory.mediaType !== 'text' && (
                            <View style={styles.captionContainer}>
                                <Text style={styles.captionText}>{currentStory.caption}</Text>
                            </View>
                        )}
                    </View>
                </TouchableWithoutFeedback>

            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    progressContainer: { position: 'absolute', top: 0, width: '100%', zIndex: 10, paddingHorizontal: 10, paddingTop: 10 },
    barsRow: { flexDirection: 'row', gap: 4, height: 2, marginBottom: 12 },
    barBackground: { flex: 1, backgroundColor: 'rgba(255,255,255,0.3)', height: 2, borderRadius: 1 },
    barFill: { backgroundColor: 'white', height: 2, borderRadius: 1 },
    header: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
    username: { color: 'white', fontWeight: '600', fontSize: 13, marginRight: 8 },
    timeAgo: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    iconBtn: { padding: 8, marginLeft: 10 },
    mediaContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' },
    media: { width: '100%', height: '100%' },
    loader: { position: 'absolute', zIndex: 5 },
    captionContainer: {
        position: 'absolute', bottom: 40, left: 0, right: 0,
        alignItems: 'center', paddingHorizontal: 20
    },
    captionText: { color: 'white', fontSize: 16, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 8 },
});
