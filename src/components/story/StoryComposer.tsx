import React, { useState, useRef } from 'react';
import {
    View,
    Image,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Dimensions,
    FlatList,
    Alert
} from 'react-native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../utils/colors';
import { StorySticker } from './StorySticker';

const { width, height } = Dimensions.get('window');

// --- CONSTANTS ---
const EMOJIS = ['🔥', '❤️', '😍', '😂', '😮', '🎉', '🌟', '👀', '💯', '🙌', '✈️', '🏝️', '📸', '🍕', '☕'];
const COLORS = ['#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'];

import { captureRef } from 'react-native-view-shot';

// ... constants ...

interface Props {
    visible: boolean;
    media: { uri: string; type: 'image' | 'video' } | null;
    onClose: () => void;
    onPost: (caption: string, renderedUri?: string) => Promise<void>;
}

interface StickerData {
    id: string;
    type: 'text' | 'emoji';
    content: string;
}

export const StoryComposer = ({ visible, media, onClose, onPost }: Props) => {
    // --- STATE ---
    const [caption, setCaption] = useState('');
    const [posting, setPosting] = useState(false);
    const shotRef = useRef<View>(null);

    // Stickers
    const [stickers, setStickers] = useState<StickerData[]>([]);

    // Modes
    const [inputMode, setInputMode] = useState<'none' | 'text' | 'emoji'>('none');
    const [textInput, setTextInput] = useState('');
    const [textColor, setTextColor] = useState('#FFFFFF');

    // --- ANIMATED VALUES (Background Image) ---
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedX = useSharedValue(0);
    const savedY = useSharedValue(0);

    // --- GESTURES (Background) ---
    const panGesture = Gesture.Pan()
        .onChange((e) => {
            translateX.value = savedX.value + e.translationX;
            translateY.value = savedY.value + e.translationY;
        })
        .onEnd(() => {
            savedX.value = translateX.value;
            savedY.value = translateY.value;
        });

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            savedScale.value = scale.value;
        });

    // Combined gesture for background
    const bgGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    const bgStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value }
        ]
    }));

    // --- ANIMATED VALUES (Trash Bin) ---
    const isTrashActive = useSharedValue(false);
    const isDeleteActive = useSharedValue(false);

    const trashStyle = useAnimatedStyle(() => {
        const scaleValue = isTrashActive.value ? (isDeleteActive.value ? 1.4 : 1) : 0;
        return {
            opacity: withSpring(isTrashActive.value ? 1 : 0),
            transform: [
                { scale: withSpring(scaleValue, { damping: 15, stiffness: 200 }) }
            ],
            backgroundColor: withSpring(isDeleteActive.value ? 'rgba(255, 59, 48, 1)' : 'rgba(0,0,0,0.6)')
        };
    });

    // --- ACTIONS ---
    const handleDeleteSticker = (id: string) => {
        setStickers(prev => prev.filter(s => s.id !== id));
    };

    const handlePost = async () => {
        if (posting) return;
        setPosting(true);
        try {
            let renderedUri = media?.uri;

            // 📸 RENDER STEP: Burn edits into single image
            if (shotRef.current) {
                try {
                    renderedUri = await captureRef(shotRef, {
                        format: 'jpg',
                        quality: 0.8,
                        result: 'tmpfile',
                    });
                    console.log('Story rendered to:', renderedUri);
                } catch (err) {
                    console.warn('ViewShot not ready (requires rebuild), falling back to original:', err);
                }
            }

            // Fallback to original if capture failed (or wasn't attempted?)
            // if captureRef fails, renderedUri is still media.uri 
            // but if captureRef succeeds, it's the new uri.
            await onPost(caption, renderedUri);
            setCaption('');
        } catch (e) {
            console.error(e);
        } finally {
            setPosting(false);
        }
    };

    // ... addSticker remains similar ...

    const addSticker = (type: 'text' | 'emoji', content: string) => {
        setStickers(prev => [
            ...prev,
            { id: Date.now().toString(), type, content }
        ]);
        setInputMode('none');
        setTextInput('');
    };

    if (!media) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="overFullScreen"
            statusBarTranslucent
        >
            <GestureHandlerRootView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="black" />

                {/* WRAPPER FOR CAPTURE: Canvas + Stickers */}
                <View
                    collapsable={false}
                    ref={shotRef}
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'black' }]}
                >
                    {/* 1. LAYER: Canvas (Movable Background) */}
                    <View style={styles.canvasContainer}>
                        <GestureDetector gesture={bgGesture}>
                            <Animated.View style={[styles.canvasContent, bgStyle]}>
                                <Image
                                    source={{ uri: media.uri }}
                                    style={styles.mediaPreview}
                                    resizeMode="contain"
                                />
                            </Animated.View>
                        </GestureDetector>
                    </View>

                    {/* 2. LAYER: Stickers */}
                    <View style={styles.stickersLayer} pointerEvents="box-none">
                        {stickers.map(sticker => (
                            <StorySticker
                                key={sticker.id}
                                id={sticker.id}
                                type={sticker.type}
                                content={sticker.content}
                                onDelete={handleDeleteSticker}
                                isTrashActive={isTrashActive}
                                isDeleteActive={isDeleteActive}
                            />
                        ))}
                    </View>
                </View>

                {/* 3. LAYER: Trash Bin (Top Center) - Only visible when dragging */}

                {/* 3. LAYER: Trash Bin (Top Center) - Only visible when dragging */}
                <View style={styles.trashContainer} pointerEvents="none">
                    <Animated.View style={[styles.trashBin, trashStyle]}>
                        <Icon name="trash-outline" size={20} color="white" />
                    </Animated.View>
                </View>

                {/* 4. LAYER: Text Input Overlay (Visible when typing sticker text) */}
                {inputMode === 'text' && (
                    <View style={styles.textInputOverlay}>
                        <View style={styles.textTools}>
                            <TouchableOpacity onPress={() => setInputMode('none')} style={styles.textToolBtn}>
                                <Text style={styles.textToolLabel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => textInput.trim() && addSticker('text', textInput)}
                                style={[styles.textToolBtn, { backgroundColor: 'white', paddingHorizontal: 12, borderRadius: 16 }]}
                            >
                                <Text style={[styles.textToolLabel, { color: 'black', fontWeight: 'bold' }]}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={[styles.bigInput, { color: textColor }]}
                            placeholder="Type something..."
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            autoFocus
                            multiline
                            value={textInput}
                            onChangeText={setTextInput}
                        />

                        {/* Color Picker helper could go here */}
                    </View>
                )}

                {/* 4. LAYER: UI Controls (Header/Footer) - Only visible when not adding text sticker */}
                {inputMode === 'none' && (
                    <SafeAreaView style={styles.uiOverlay} pointerEvents="box-none">

                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                                <Icon name="close" size={28} color="white" />
                            </TouchableOpacity>

                            <View style={styles.headerActions}>
                                <TouchableOpacity onPress={() => setInputMode('text')} style={styles.iconButton}>
                                    <Icon name="text" size={26} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setInputMode('emoji')} style={[styles.iconButton, { marginLeft: 16 }]}>
                                    <Icon name="happy-outline" size={26} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Emoji Picker Modal/Panel */}



                        {/* Footer / Caption Input */}
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={styles.bottomBar}
                        >
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.captionInput}
                                    placeholder="Add a caption..."
                                    placeholderTextColor="#rgba(255,255,255,0.7)"
                                    value={caption}
                                    onChangeText={setCaption}
                                    multiline
                                    maxLength={200}
                                />
                                <TouchableOpacity
                                    onPress={handlePost}
                                    disabled={posting}
                                    style={[styles.sendBtn, posting && { backgroundColor: '#555' }]}
                                >
                                    {posting ? <ActivityIndicator size="small" color="white" /> : <Icon name="paper-plane" size={20} color="white" />}
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </SafeAreaView>
                )}

                {/* 5. LAYER: Emoji Picker (Separate Overlay) */}
                {inputMode === 'emoji' && (
                    <View style={styles.emojiPanel}>
                        <View style={styles.emojiHeader}>
                            <Text style={styles.emojiTitle}>Stickers</Text>
                            <TouchableOpacity onPress={() => setInputMode('none')}>
                                <Icon name="close" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={[
                                '🔥', '❤️', '😍', '😂', '😮', '🎉', '🌟', '👀', '💯', '🙌',
                                '✈️', '🏝️', '📸', '🍕', '☕', '🍔', '🍟', '🍻', '🥂', '🍾',
                                '🏠', '🚗', '🚲', '🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼',
                                '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤',
                                '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜'
                            ]}
                            numColumns={5}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => addSticker('emoji', item)} style={styles.emojiItem}>
                                    <Text style={{ fontSize: 36 }}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item, index) => index.toString()}
                        />
                    </View>
                )}

            </GestureHandlerRootView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    trashContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 60, // Top area
        zIndex: 50,
    },
    trashBin: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trashText: {
        display: 'none', // Hidden
    },
    canvasContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden', // Clip zoomed image
        justifyContent: 'center',
        alignItems: 'center',
    },
    canvasContent: {
        width: width,
        height: height,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaPreview: {
        width: width,
        height: height * 0.8, // Slight inset
    },
    stickersLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    textInputOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bigInput: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        width: '80%',
        color: 'white',
    },
    textTools: {
        position: 'absolute',
        top: 50,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    textToolBtn: {
        padding: 8,
    },
    textToolLabel: {
        color: 'white',
        fontSize: 16,
    },
    uiOverlay: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
    },
    headerActions: {
        flexDirection: 'row',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomBar: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        width: '100%',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)', // Glass effect
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 6,
        paddingVertical: 6,
    },
    captionInput: {
        flex: 1,
        color: 'white',
        paddingHorizontal: 12,
        fontSize: 16,
        maxHeight: 100,
        paddingVertical: 8,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    emojiPanel: {
        position: 'absolute',
        bottom: 0, // Align to bottom
        left: 0,
        right: 0,
        height: '40%', // Half screen
        backgroundColor: 'rgba(20,20,20,0.95)', // Blur/Dark background
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingVertical: 10,
        paddingBottom: 40, // Safe area
    },
    emojiHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 10,
        alignItems: 'center',
    },
    emojiTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    emojiItem: {
        flex: 1,
        margin: 4,
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
    },
});
