import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ActivityIndicator, StatusBar, LayoutAnimation, UIManager, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AdjustResult } from '../contracts';
import { CreateStackParamList } from '../navigation/types';
import { SessionManager } from '../session';
import { assertValidMediaPick } from '../utils/invariants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import PhotoManipulator from 'react-native-photo-manipulator';
import RNFS from 'react-native-fs';
import { Color, FontFamily, FontSize, Padding } from '../../../GlobalStyles';

type Props = {
    navigation: NativeStackNavigationProp<CreateStackParamList, 'Adjust'>;
    route: RouteProp<CreateStackParamList, 'Adjust'>;
};

// Phase B Constants
const TARGET_WIDTH = 1080;
const OUTPUT_QUALITY = 90;
const PREVIEW_SIZE = Dimensions.get('window').width;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AdjustScreen({ navigation, route }: Props) {
    const { selection, sessionId } = route.params;

    // Fail Fast: Invariant Assumption
    try {
        if (!sessionId) throw new Error("Missing Session ID");
        assertValidMediaPick(selection);
    } catch (e: any) {
        Alert.alert("System Error", "Invalid navigation state. Flow must restart.");
        navigation.getParent()?.goBack();
        return null;
    }

    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '16:9'>('1:1');
    const [processing, setProcessing] = useState(false);

    // Derived Visual State
    const viewportHeight = (() => {
        switch (aspectRatio) {
            case '1:1': return PREVIEW_SIZE;
            case '4:5': return PREVIEW_SIZE * (5 / 4);
            case '16:9': return PREVIEW_SIZE * (9 / 16);
            default: return PREVIEW_SIZE;
        }
    })();

    // Animation Shared Values
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    // Calculate Base Scale (Coverage)
    // This replicates resizeMode='cover' but gives us the math we need
    const imgW = selection.width;
    const imgH = selection.height;
    const scaleX = PREVIEW_SIZE / imgW;
    const scaleY = viewportHeight / imgH;
    const baseScale = Math.max(scaleX, scaleY);

    const baseWidth = imgW * baseScale;
    const baseHeight = imgH * baseScale;

    // Reset animations on ratio change to ensure image fits/covers new frame safely
    const handleRatioChange = (newRatio: '1:1' | '4:5' | '16:9') => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setAspectRatio(newRatio);
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        savedTranslateX.value = 0;
        translateY.value = withSpring(0);
        savedTranslateY.value = 0;
    };

    // Gesture Context
    const context = useSharedValue({ x: 0, y: 0, scale: 1 });

    const clampValues = (userTriggered: boolean = false) => {
        'worklet';
        // 1. Min Scale Check
        let targetScale = scale.value;
        if (targetScale < 1) targetScale = 1;

        // 2. Bound Check
        const imageW = baseWidth * targetScale;
        const imageH = baseHeight * targetScale;

        const maxTransX = (imageW - PREVIEW_SIZE) / 2;
        const maxTransY = (imageH - viewportHeight) / 2;

        let targetX = translateX.value;
        let targetY = translateY.value;

        // Clamp
        if (targetX > maxTransX) targetX = maxTransX;
        if (targetX < -maxTransX) targetX = -maxTransX;
        if (targetY > maxTransY) targetY = maxTransY;
        if (targetY < -maxTransY) targetY = -maxTransY;

        // Apply Spring
        if (userTriggered) {
            scale.value = withSpring(targetScale);
            translateX.value = withSpring(targetX);
            translateY.value = withSpring(targetY);
        } else {
            // Immediate set for layout changes
            scale.value = targetScale;
            translateX.value = targetX;
            translateY.value = targetY;
        }

        // Update state for next gesture
        savedScale.value = targetScale;
        savedTranslateX.value = targetX;
        savedTranslateY.value = targetY;
    };

    const pan = Gesture.Pan()
        .onStart(() => {
            context.value = {
                x: savedTranslateX.value,
                y: savedTranslateY.value,
                scale: savedScale.value
            };
        })
        .onUpdate((e) => {
            translateX.value = context.value.x + e.translationX;
            translateY.value = context.value.y + e.translationY;
        })
        .onEnd(() => {
            clampValues(true);
        });

    const pinch = Gesture.Pinch()
        .onStart(() => {
            context.value = {
                x: savedTranslateX.value,
                y: savedTranslateY.value,
                scale: savedScale.value
            };
        })
        .onUpdate((e) => {
            scale.value = context.value.scale * e.scale;
        })
        .onEnd(() => {
            clampValues(true);
        });

    const composed = Gesture.Simultaneous(pan, pinch);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value }
        ]
    }));

    const processAndNavigate = async () => {
        setProcessing(true);
        try {
            const sessionDir = SessionManager.getSessionDir(sessionId);
            await RNFS.mkdir(sessionDir);

            // 🟢 CLAMPING SAFETY CHECK 🟢
            // Ensure we use valid, clamped values for the final crop
            // (Even if animation is mid-way)
            let finalScale = scale.value;
            if (finalScale < 1) finalScale = 1;

            const imageW = baseWidth * finalScale;
            const imageH = baseHeight * finalScale;
            const maxTransX = (imageW - PREVIEW_SIZE) / 2;
            const maxTransY = (imageH - viewportHeight) / 2;

            let finalX = translateX.value;
            let finalY = translateY.value;

            // Strict math clamping
            finalX = Math.min(maxTransX, Math.max(-maxTransX, finalX));
            finalY = Math.min(maxTransY, Math.max(-maxTransY, finalY));

            // 🟢 NON-DESTRUCTIVE CROP MATH 🟢
            // 2. Calculate Visual Dimensions
            const visualWidth = baseWidth * finalScale;
            const visualHeight = baseHeight * finalScale;

            // 3. Calculate "Visual Rect"
            const visualLeft = (PREVIEW_SIZE - visualWidth) / 2 + finalX;
            const visualTop = (viewportHeight - visualHeight) / 2 + finalY;

            const cropX_Visual = -visualLeft;
            const cropY_Visual = -visualTop;

            // 4. Map to Original
            const ratio = imgW / visualWidth;

            let cropX = cropX_Visual * ratio;
            let cropY = cropY_Visual * ratio;
            let cropW = PREVIEW_SIZE * ratio;
            let cropH = viewportHeight * ratio;

            // 5. Constrain Bounds
            cropX = Math.max(0, cropX);
            cropY = Math.max(0, cropY);
            if (cropX + cropW > imgW) cropW = imgW - cropX;
            if (cropY + cropH > imgH) cropH = imgH - cropY;

            const cropRegion = {
                x: cropX,
                y: cropY,
                width: cropW,
                height: cropH
            };

            const targetHeight = Math.round(TARGET_WIDTH * (viewportHeight / PREVIEW_SIZE));
            const targetSize = { width: TARGET_WIDTH, height: targetHeight };

            const tempUri = await PhotoManipulator.crop(
                selection.originalUri,
                cropRegion,
                targetSize
            );

            const finalFileName = `final_${Date.now()}.jpg`;
            const finalPath = `file://${sessionDir}/${finalFileName}`;

            await RNFS.moveFile(tempUri, finalPath);

            const result: AdjustResult = {
                sessionId: sessionId,
                originalReference: selection,
                finalBitmapUri: finalPath,
                cropMetadata: {
                    zoom: finalScale, // Use clamped values
                    offsetX: finalX,
                    offsetY: finalY,
                    aspectRatio: aspectRatio,
                    cropWidth: cropW,
                    cropHeight: cropH
                }
            };

            navigation.push('Details', { result });

        } catch (e: any) {
            console.error('[Adjust] Transformation Failed:', e);
            Alert.alert('Processing Error', 'Could not process image. It may be corrupt or too large. Try another photo.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btn}>
                    <Text style={styles.headerText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Frame Your Shot</Text>
                <TouchableOpacity onPress={processAndNavigate} disabled={processing} style={styles.btn}>
                    {processing ? (
                        <ActivityIndicator color={Color.colorOrangered} />
                    ) : (
                        <Text style={styles.nextText}>Next</Text>
                    )}
                </TouchableOpacity>
            </View>

            <GestureHandlerRootView style={styles.editor}>
                <View style={[styles.viewport, { height: viewportHeight }]}>
                    <GestureDetector gesture={composed}>
                        <Animated.Image
                            source={{ uri: selection.originalUri }}
                            style={[
                                {
                                    width: baseWidth,
                                    height: baseHeight,
                                    position: 'absolute',
                                    left: (PREVIEW_SIZE - baseWidth) / 2,
                                    top: (viewportHeight - baseHeight) / 2,
                                },
                                animatedStyle
                            ]}
                        // resizeMode is REMOVED to verify manual scaling
                        />
                    </GestureDetector>

                    {/* Grid Overlay */}
                    <View style={styles.gridLineV1} pointerEvents="none" />
                    <View style={styles.gridLineV2} pointerEvents="none" />
                    <View style={styles.gridLineH1} pointerEvents="none" />
                    <View style={styles.gridLineH2} pointerEvents="none" />
                </View>

                {/* Ratio Controls */}
                <View style={styles.controlsArea}>
                    <Text style={styles.label}>ASPECT RATIO</Text>
                    <View style={styles.ratioContainer}>
                        <TouchableOpacity
                            onPress={() => handleRatioChange('1:1')}
                            style={[styles.ratioBtn, aspectRatio === '1:1' && styles.ratioBtnActive]}
                        >
                            <Text style={[styles.ratioText, aspectRatio === '1:1' && styles.ratioTextActive]}>1:1</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleRatioChange('4:5')}
                            style={[styles.ratioBtn, aspectRatio === '4:5' && styles.ratioBtnActive]}
                        >
                            <Text style={[styles.ratioText, aspectRatio === '4:5' && styles.ratioTextActive]}>4:5</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleRatioChange('16:9')}
                            style={[styles.ratioBtn, aspectRatio === '16:9' && styles.ratioBtnActive]}
                        >
                            <Text style={[styles.ratioText, aspectRatio === '16:9' && styles.ratioTextActive]}>16:9</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.hint}>Pinch to zoom & pan</Text>
                </View>
            </GestureHandlerRootView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Color.colorGray300, paddingTop: 12 }, // Dark Mode + Top Spacing
    header: {
        height: 56,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Padding.padding_16,
        backgroundColor: Color.colorGray300,
        zIndex: 10
    },
    headerText: {
        fontFamily: FontFamily.poppinsMedium,
        color: Color.colorWhite,
        fontSize: FontSize.base
    },
    title: {
        fontFamily: FontFamily.poppinsBold,
        color: Color.colorWhite,
        fontSize: FontSize.base
    },
    nextText: {
        fontFamily: FontFamily.poppinsBold,
        color: Color.colorOrangered,
        fontSize: FontSize.base
    },
    btn: { padding: 8 },

    editor: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111',
        paddingBottom: 140, // Reserve space for controls
        paddingTop: 10
    },
    viewport: {
        width: PREVIEW_SIZE,
        backgroundColor: '#222',
        overflow: 'hidden',
    },
    image: { width: '100%', height: '100%' },

    controlsArea: {
        position: 'absolute',
        bottom: 40,
        width: '100%',
        alignItems: 'center'
    },
    label: {
        color: '#666',
        fontSize: 10,
        fontFamily: FontFamily.poppinsBold,
        letterSpacing: 1,
        marginBottom: 12
    },
    hint: {
        color: '#555',
        marginTop: 20,
        fontSize: 12,
        fontFamily: FontFamily.poppinsRegular
    },

    // Grid
    gridLineV1: { position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
    gridLineV2: { position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
    gridLineH1: { position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
    gridLineH2: { position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },

    // Ratio Controls
    ratioContainer: { flexDirection: 'row', gap: 12 },
    ratioBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333',
        backgroundColor: 'transparent'
    },
    ratioBtnActive: {
        backgroundColor: Color.colorOrangered,
        borderColor: Color.colorOrangered
    },
    ratioText: {
        color: '#888',
        fontFamily: FontFamily.poppinsMedium,
        fontSize: 13
    },
    ratioTextActive: {
        color: '#FFF',
        fontFamily: FontFamily.poppinsSemiBold
    }
});
