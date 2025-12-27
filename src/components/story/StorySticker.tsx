import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, SharedValue } from 'react-native-reanimated';

const { height } = Dimensions.get('window');
const DELETE_ZONE_HEIGHT = 150; // Top area to trigger delete

interface Props {
    id: string;
    content: string;
    type: 'text' | 'emoji';
    initialScale?: number;
    onDelete: (id: string) => void;
    isTrashActive?: SharedValue<boolean>;
    isDeleteActive?: SharedValue<boolean>; // New prop for visual feedback
}

export const StorySticker = ({ id, content, type, initialScale = 1, onDelete, isTrashActive, isDeleteActive }: Props) => {
    const scale = useSharedValue(initialScale);
    const savedScale = useSharedValue(initialScale);
    const rotation = useSharedValue(0);
    const savedRotation = useSharedValue(0);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedX = useSharedValue(0);
    const savedY = useSharedValue(0);

    const pan = Gesture.Pan()
        .onStart(() => {
            if (isTrashActive) isTrashActive.value = true;
        })
        .onChange((e) => {
            translateX.value = savedX.value + e.translationX;
            translateY.value = savedY.value + e.translationY;

            // Check if hovering delete zone
            if (isDeleteActive) {
                isDeleteActive.value = e.absoluteY < DELETE_ZONE_HEIGHT;
            }
        })
        .onEnd((e) => {
            savedX.value = translateX.value;
            savedY.value = translateY.value;

            if (isTrashActive) isTrashActive.value = false;
            if (isDeleteActive) isDeleteActive.value = false;

            // Check if dropped in delete zone (Top of screen)
            if (e.absoluteY < DELETE_ZONE_HEIGHT) {
                runOnJS(onDelete)(id);
            }
        });

    const pinch = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            savedScale.value = scale.value;
        });

    const rotate = Gesture.Rotation()
        .onUpdate((e) => {
            rotation.value = savedRotation.value + e.rotation;
        })
        .onEnd(() => {
            savedRotation.value = rotation.value;
        });

    const composed = Gesture.Simultaneous(pan, pinch, rotate);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
            { rotate: `${rotation.value}rad` },
        ],
    }));

    return (
        <GestureDetector gesture={composed}>
            <Animated.View style={[styles.sticker, animatedStyle]}>
                <Text style={type === 'emoji' ? styles.emoji : styles.text}>
                    {content}
                </Text>
            </Animated.View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    sticker: {
        position: 'absolute',
        alignSelf: 'center',
        top: '40%', // Start roughly center
        zIndex: 10,
    },
    emoji: {
        fontSize: 60,
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        textAlign: 'center',
    },
});
