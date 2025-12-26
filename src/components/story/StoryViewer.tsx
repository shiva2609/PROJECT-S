import React, { useState, useEffect, useRef } from 'react';
import {
    View, Image, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, SafeAreaView, ActivityIndicator, TouchableWithoutFeedback, Alert
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { StoryUser, Story } from '../../types/story';
import { StoryService } from '../../services/story/story.service';
// import Icon from 'react-native-vector-icons/Ionicons'; // Assuming installed

import { auth } from '../../core/firebase';

const { width, height } = Dimensions.get('window');

interface Props {
    userStories: StoryUser;
    visible: boolean;
    onClose: () => void;
    onFinish?: () => void;
}

export const StoryViewer = ({ userStories, visible, onClose, onFinish }: Props) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const currentStory = userStories.stories[currentIndex];
    const [progress, setProgress] = useState(0);
    const duration = 5000; // default 5s for image
    const [videoDuration, setVideoDuration] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (visible && userStories.stories.length > 0) {
            setCurrentIndex(0);
            setProgress(0);
            setVideoDuration(0);
            setLoading(true);
            if (userStories.stories[0]) {
                markViewed(userStories.stories[0]);
            }
        }
    }, [visible, userStories]);

    const markViewed = (story: Story) => {
        // Optimistic or fire-and-forget
        StoryService.viewStory(story.id);
    };

    useEffect(() => {
        if (!visible || paused || loading || !currentStory) return;

        // For Image: Simple interval
        if (currentStory.mediaType === 'image' || currentStory.mediaType === 'text') {
            const step = 100; // ms
            const interval = setInterval(() => {
                setProgress(p => {
                    const newP = p + (step / duration);
                    if (newP >= 1) {
                        clearInterval(interval);
                        goNext();
                        return 1;
                    }
                    return newP;
                });
            }, step);
            return () => clearInterval(interval);
        }
    }, [visible, paused, loading, currentIndex, currentStory, duration]);

    const safeClose = () => {
        // Schedule update to avoid "Cannot update while rendering" error
        setTimeout(() => {
            onClose();
        }, 0);
    };

    const safeFinish = () => {
        setTimeout(() => {
            if (onFinish) onFinish();
            else onClose();
        }, 0);
    };

    const goNext = () => {
        if (currentIndex < userStories.stories.length - 1) {
            setCurrentIndex(i => {
                const next = i + 1;
                const nextStory = userStories.stories[next];
                if (nextStory) markViewed(nextStory);
                return next;
            });
            setProgress(0);
            setVideoDuration(0);
            setLoading(true);
        } else {
            safeFinish();
        }
    };

    const goPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(i => i - 1);
            setProgress(0);
            setVideoDuration(0);
            setLoading(true);
        } else {
            // Restart current? or nothing
            setProgress(0);
        }
    };

    const handleVideoLoad = (data: any) => {
        setVideoDuration(data.duration);
        setLoading(false);
    };

    const handleVideoProgress = (data: any) => {
        if (videoDuration > 0) {
            setProgress(data.currentTime / videoDuration);
        }
    };

    const handleVideoEnd = () => {
        goNext();
    };

    const handleImageLoad = () => {
        setLoading(false);
    };

    const handleDelete = () => {
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
                        <Image source={{ uri: userStories.avatar }} style={styles.avatar} />
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
