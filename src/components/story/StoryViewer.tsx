import React, { useState, useEffect, useRef } from 'react';
import {
    View, Image, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, SafeAreaView, ActivityIndicator, TouchableWithoutFeedback, Alert, Platform
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { StoryUser, Story } from '../../types/story';
import { StoryService } from '../../services/story/story.service';
import Icon from 'react-native-vector-icons/Ionicons';
import { auth } from '../../core/firebase';

const { width, height } = Dimensions.get('window');

interface Props {
    userStories: StoryUser; // Unified data source
    visible: boolean;
    onClose: () => void;
    onFinish?: (userId?: string) => void;
    onViewStory?: (storyId: string) => void;
    onDelete?: (storyId: string) => void; // New prop for atomic UI update
}

export const StoryViewer = ({ userStories, visible, onClose, onFinish, onViewStory, onDelete }: Props) => {
    // ... state ...
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [paused, setPaused] = useState(false);

    // Safety check for empty stories
    const stories = userStories?.stories || [];
    const currentStory = stories[currentIndex];
    const isMine = auth.currentUser?.uid === userStories?.userId;

    const finishedRef = useRef(false);

    // --- INIT ---
    // Handle opening to the correct start index (first unseen story)
    useEffect(() => {
        if (visible && stories.length > 0) {
            // INSTAGRAM LOGIC: Start from first UNSEEN story
            const uid = auth.currentUser?.uid;
            let startIndex = 0;

            if (uid) {
                const firstUnseen = stories.findIndex(s => {
                    const views = Array.isArray(s.views) ? s.views : [];
                    return !views.includes(uid);
                });
                if (firstUnseen !== -1) startIndex = firstUnseen;
            }

            setCurrentIndex(startIndex);
            setProgress(0);
            setVideoDuration(0);
            setLoading(true);
            finishedRef.current = false;

            // Mark first story as seen
            const startStory = stories[startIndex];
            if (startStory && onViewStory) {
                // Defer to next tick to avoid "update during render" error
                setTimeout(() => onViewStory(startStory.id), 0);
            }
        }
    }, [visible, userStories]);

    // --- STATE RESET ON SLIDE CHANGE ---
    useEffect(() => {
        if (!visible || !currentStory) return;
        setLoading(true);
        setPaused(false);
        setProgress(0);
        setVideoDuration(0);
    }, [currentIndex, userStories.userId]);

    // --- PROGRESS LOOP ---
    useEffect(() => {
        if (!visible || paused || loading || !currentStory || finishedRef.current) return;

        // VIDEO: handled by onProgress props in Video component
        if (currentStory.mediaType === 'video') return;

        // IMAGE / TEXT: Time-based (5s)
        const DURATION = 5000;
        const intervalMs = 50;

        const interval = setInterval(() => {
            setProgress(oldP => {
                const step = intervalMs / DURATION;
                const newP = oldP + step;
                if (newP >= 1) {
                    clearInterval(interval);
                    goNext(); // relies on hoisted function
                    return 1;
                }
                return newP;
            });
        }, intervalMs);

        return () => clearInterval(interval);
    }, [visible, paused, loading, currentIndex, currentStory]);

    // --- NAVIGATION ---
    const safeClose = () => setTimeout(onClose, 0);

    const safeFinish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;

        // Signal parent to go to next user
        setTimeout(() => {
            if (onFinish) onFinish(userStories.userId);
            else onClose();
        }, 0);
    };

    const goNext = () => {
        if (finishedRef.current) return;

        // View Current
        if (currentStory) StoryService.viewStory(currentStory.id);

        if (currentIndex < stories.length - 1) {
            // Next story, same user
            setCurrentIndex(i => i + 1);
        } else {
            // End of this user
            safeFinish();
        }
    };

    const goPrev = () => {
        if (finishedRef.current) return;

        // If we are far into the story, just restart it
        if (progress > 0.3) {
            setProgress(0);
            return;
        }

        if (currentIndex > 0) {
            setCurrentIndex(i => i - 1);
        } else {
            // First story of user. Restart.
            setProgress(0);
        }
    };

    // --- ACTIONS ---
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
                        try {
                            // 1. Backend Delete
                            await StoryService.deleteStory(currentStory.id, currentStory.mediaUrl);

                            // 2. UI Update (Optimistic/Immediate)
                            if (onDelete) onDelete(currentStory.id);

                            // 3. Close or Navigate
                            // If there are other stories, maybe we should stay? 
                            // For V1 "Simplicity", closing is safest to avoid index drift bugs.
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

    // --- RENDER ---
    if (!visible || !currentStory) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={safeClose} statusBarTranslucent>
            <View style={styles.container}>

                {/* 1. MEDIA LAYER */}
                <TouchableWithoutFeedback
                    onPress={(e) => e.nativeEvent.locationX < width * 0.3 ? goPrev() : goNext()}
                    onLongPress={() => setPaused(true)}
                    onPressOut={() => setPaused(false)}
                >
                    <View style={styles.mediaContainer}>
                        {loading && <ActivityIndicator size="large" color="white" style={styles.loader} />}

                        {currentStory.mediaType === 'video' ? (
                            <Video
                                source={{ uri: currentStory.mediaUrl }}
                                style={styles.media}
                                resizeMode="cover" // Full screen feel
                                onLoad={(data) => {
                                    setVideoDuration(data.duration);
                                    setLoading(false);
                                }}
                                onProgress={(data) => {
                                    if (!loading && !paused) setProgress(data.currentTime / (data.seekableDuration || 1));
                                }}
                                onEnd={goNext}
                                paused={paused}
                                ignoreSilentSwitch="ignore"
                            />
                        ) : currentStory.mediaType === 'text' ? (
                            <View style={[styles.media, styles.textMedia]}>
                                <Text style={styles.textContent}>{currentStory.caption || currentStory.mediaUrl}</Text>
                            </View>
                        ) : (
                            <Image
                                source={{ uri: currentStory.mediaUrl }}
                                style={styles.media}
                                resizeMode="contain" // Original fix: contain to see full image
                                onLoad={() => setLoading(false)}
                            />
                        )}

                        {/* Caption Overlay */}
                        {currentStory.caption && currentStory.mediaType !== 'text' && (
                            <View style={styles.captionContainer}>
                                <Text style={styles.captionText}>{currentStory.caption}</Text>
                            </View>
                        )}
                    </View>
                </TouchableWithoutFeedback>

                {/* 2. OVERLAY LAYER (Gradient + Header) */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.8)', 'transparent']}
                    style={styles.topGradient}
                    pointerEvents="none"
                />

                <SafeAreaView style={styles.uiContainer} pointerEvents="box-none">
                    {/* Progress Bars */}
                    <View style={styles.resultBars}>
                        {stories.map((story, index) => (
                            <View key={story.id} style={styles.barBackground}>
                                <View style={[styles.barFill, {
                                    width: index === currentIndex ? `${Math.min(progress * 100, 100)}%` : (index < currentIndex ? '100%' : '0%')
                                }]} />
                            </View>
                        ))}
                    </View>

                    {/* Header: User Info & Close */}
                    <View style={styles.header}>
                        <View style={styles.userInfo}>
                            {userStories.avatar ? (
                                <Image source={{ uri: userStories.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={styles.fallbackAvatar}>
                                    <Icon name="person" size={16} color="#DDD" />
                                </View>
                            )}
                            <Text style={styles.username}>{userStories.username}</Text>
                            <Text style={styles.timeAgo}>
                                {Math.floor((Date.now() - currentStory.createdAt) / 3600000)}h
                            </Text>
                        </View>

                        <View style={styles.headerActions}>
                            {isMine && (
                                <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
                                    <Icon name="trash-outline" size={24} color="white" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={safeClose} style={styles.iconBtn}>
                                <Icon name="close" size={30} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>

            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    mediaContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'black' },
    media: { width, height: '100%' },
    loader: { position: 'absolute', alignSelf: 'center', zIndex: 10 },

    textMedia: { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', padding: 30 },
    textContent: { color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },

    topGradient: {
        position: 'absolute', top: 0, left: 0, right: 0, height: 150, zIndex: 1
    },
    uiContainer: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2,
        paddingTop: Platform.OS === 'android' ? 10 : 0
    },
    resultBars: {
        flexDirection: 'row', gap: 4, height: 2, marginHorizontal: 10, marginBottom: 12, marginTop: 10
    },
    barBackground: { flex: 1, backgroundColor: 'rgba(255,255,255,0.3)', height: 2, borderRadius: 1 },
    barFill: { backgroundColor: 'white', height: 2, borderRadius: 1 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
    fallbackAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10, backgroundColor: '#555', justifyContent: 'center', alignItems: 'center' },
    username: { color: 'white', fontWeight: 'bold', fontSize: 13, marginRight: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
    timeAgo: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },

    headerActions: { flexDirection: 'row', alignItems: 'center' },
    iconBtn: { marginLeft: 20, padding: 4 }, // Increased touch area

    captionContainer: {
        position: 'absolute', bottom: 50, left: 0, right: 0,
        alignItems: 'center', paddingHorizontal: 20
    },
    captionText: {
        color: 'white', fontSize: 16, textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16,
        overflow: 'hidden'
    },
});
