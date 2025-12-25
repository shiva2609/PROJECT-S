import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Modal } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { CreateStackParamList } from '../navigation/types';
import { PostPayload } from '../contracts';
import { publishPost } from '../services/PublishService';
import { SessionManager } from '../session';
import { assertValidAdjustResult } from '../utils/invariants';
import { Color, FontFamily, FontSize, Padding, Radius } from '../../../GlobalStyles';

type Props = {
    navigation: NativeStackNavigationProp<CreateStackParamList, 'Details'>;
    route: RouteProp<CreateStackParamList, 'Details'>;
};

export default function DetailsScreen({ navigation, route }: Props) {
    const { result } = route.params;

    // Fail Fast: Invariant Check
    try {
        if (!result.sessionId) throw new Error("Missing Session ID in Result");
        assertValidAdjustResult(result);
    } catch (e: any) {
        console.error(e);
        Alert.alert("System Error", "Invalid previous state. Please restart.");
        navigation.getParent()?.goBack();
        return null;
    }

    const [caption, setCaption] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Meta State
    const [hashtagsText, setHashtagsText] = useState('');
    const [location, setLocation] = useState<{ id: string, name: string } | null>(null);
    const [showLocModal, setShowLocModal] = useState(false);
    const [locSearch, setLocSearch] = useState('');

    // Derive dimension helpers from immutable result
    const { cropWidth, cropHeight, aspectRatio } = result.cropMetadata;
    const getNumericRatio = () => {
        if (aspectRatio === '1:1') return 1;
        if (aspectRatio === '4:5') return 0.8;
        if (aspectRatio === '16:9') return 1.77;
        return 1;
    };

    const parseHashtags = (text: string): string[] => {
        const raw = text.split(/[\s\n,]+/);
        const valid = raw.map(t => t.replace(/^#/, '').toLowerCase().trim())
            .filter(t => t.length > 0)
            .filter(t => /^[a-z0-9_]+$/.test(t)) // Alphanumeric + underscore only
            .filter(t => t.length <= 30);

        // Dedup and slice
        return Array.from(new Set(valid)).slice(0, 20);
    };

    const handleShare = async () => {
        // 1. Validation Logic
        if (caption.length > 2200) {
            Alert.alert('Caption too long', 'Max 2200 characters');
            return;
        }

        setSubmitting(true);

        try {
            // 2. Construct Payload (Immutable)
            const payload: PostPayload = {
                sessionId: result.sessionId,
                mediaUri: result.finalBitmapUri,
                width: cropWidth,
                height: cropHeight,
                aspectRatio: getNumericRatio(),
                caption: caption.trim(),

                // Enriched Metadata
                location: location ? {
                    id: location.id,
                    name: location.name,
                    // valid undefined coords allowed by contract
                } : null,
                hashtags: parseHashtags(hashtagsText),
                tags: []
            };

            // 3. Execute Atomic Publish
            const status = await publishPost(payload);

            // 🛑 STRICT SUCCESS GATING
            if (status !== 'success') {
                throw new Error('PublishService returned failure');
            }

            // 4. Success Handling -> Cleanup & Exit
            await SessionManager.cleanupSession(result.sessionId);

            Alert.alert('Journey Posted', 'Your memory has been shared with the community.', [
                {
                    text: 'Great',
                    onPress: () => {
                        navigation.getParent()?.goBack();
                    }
                }
            ]);

        } catch (e: any) {
            console.error('[Publish] Failed:', e);
            Alert.alert(
                'Upload Failed',
                'Connectivity error. Please try again.',
                [{ text: 'Retry', style: 'default' }]
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Color.colorWhite} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} disabled={submitting} style={styles.btn}>
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Tell the Story</Text>
                <TouchableOpacity onPress={handleShare} disabled={submitting} style={styles.btn}>
                    {submitting ? <ActivityIndicator color={Color.colorOrangered} /> : <Text style={styles.shareText}>Publish</Text>}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.mediaRow}>
                        <Image source={{ uri: result.finalBitmapUri }} style={styles.thumb} />
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="What's the story behind this moment?"
                                placeholderTextColor="#999"
                                multiline
                                value={caption}
                                onChangeText={setCaption}
                                maxLength={2200}
                                editable={!submitting}
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        {/* Location Row */}
                        <TouchableOpacity style={styles.row} onPress={() => setShowLocModal(true)}>
                            <Text style={styles.label}>Add Location</Text>
                            <Text style={!!location ? styles.value : styles.placeholder}>
                                {location ? location.name : 'Search...'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* Tag Travelers (ReadOnly) */}
                        <View style={styles.row}>
                            <Text style={styles.label}>Tag Travelers</Text>
                            <Text style={styles.disabled}>Coming Soon</Text>
                        </View>

                        <View style={styles.divider} />

                        {/* Hashtags Input */}
                        <View style={styles.col}>
                            <Text style={styles.label}>Hashtags</Text>
                            <TextInput
                                style={styles.hashInput}
                                placeholder="#travel #nature #explore"
                                placeholderTextColor="#ccc"
                                value={hashtagsText}
                                onChangeText={setHashtagsText}
                                autoCapitalize="none"
                            />
                            <Text style={styles.hint}>Separate with spaces. Max 20.</Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Location Search Modal (Simple Mock) */}
            <Modal visible={showLocModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Where was this taken?</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Search location..."
                            value={locSearch}
                            onChangeText={setLocSearch}
                            autoFocus
                        />
                        {/* Mock Result List */}
                        {locSearch.length > 0 && (
                            <TouchableOpacity
                                style={styles.resultItem}
                                onPress={() => {
                                    setLocation({ id: `custom_${Date.now()}`, name: locSearch });
                                    setShowLocModal(false);
                                    setLocSearch('');
                                }}
                            >
                                <Text style={styles.resultText}>📍 {locSearch}</Text>
                                <Text style={styles.resultSub}>Custom Location</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.closeModalBtn}
                            onPress={() => setShowLocModal(false)}
                        >
                            <Text style={styles.closeModalText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {submitting && (
                <View style={styles.blockingOverlay}>
                    <ActivityIndicator size="large" color={Color.colorWhite} />
                    <Text style={styles.uploadingText}>Sharing memory...</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Color.colorWhite },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: Padding.padding_16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center'
    },
    title: {
        fontFamily: FontFamily.poppinsBold,
        fontSize: FontSize.base,
        color: Color.colorGray300
    },
    btn: { padding: 4 },
    backText: {
        fontFamily: FontFamily.poppinsMedium,
        fontSize: FontSize.base,
        color: Color.colorGray200
    },
    shareText: {
        fontFamily: FontFamily.poppinsBold,
        fontSize: FontSize.base,
        color: Color.colorOrangered
    },

    content: { padding: Padding.padding_16 },

    mediaRow: {
        flexDirection: 'row',
        marginBottom: 24,
        alignItems: 'flex-start'
    },
    thumb: {
        width: 100,
        height: 100,
        marginRight: 16,
        backgroundColor: '#f0f0f0',
        borderRadius: Radius.radius_sm
    },
    inputWrapper: {
        flex: 1,
        minHeight: 100,
    },
    input: {
        flex: 1,
        fontFamily: FontFamily.poppinsRegular,
        fontSize: FontSize.base,
        color: Color.colorGray300,
        textAlignVertical: 'top',
        paddingTop: 0
    },

    section: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 8
    },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12, marginLeft: 0 },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16,
        alignItems: 'center'
    },
    col: {
        flexDirection: 'column',
        paddingVertical: 12,
        gap: 8
    },
    label: {
        fontFamily: FontFamily.poppinsMedium,
        fontSize: FontSize.base,
        color: Color.colorGray300
    },
    value: {
        fontFamily: FontFamily.poppinsSemiBold,
        color: Color.colorOrangered,
        fontSize: 14
    },
    placeholder: {
        fontFamily: FontFamily.poppinsRegular,
        color: '#bbb',
        fontSize: 14
    },
    disabled: {
        fontFamily: FontFamily.poppinsRegular,
        color: '#bbb',
        fontSize: 14
    },
    hashInput: {
        fontFamily: FontFamily.poppinsRegular,
        fontSize: 14,
        color: Color.colorGray300,
    },
    hint: {
        fontSize: 12,
        color: '#999',
        fontFamily: FontFamily.poppinsRegular
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        minHeight: 400
    },
    modalTitle: {
        fontFamily: FontFamily.poppinsBold,
        fontSize: 18,
        marginBottom: 16,
        color: Color.colorGray300
    },
    modalInput: {
        backgroundColor: '#f5f5f5',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        fontFamily: FontFamily.poppinsRegular
    },
    resultItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    resultText: {
        fontFamily: FontFamily.poppinsMedium,
        fontSize: 16
    },
    resultSub: {
        fontSize: 12,
        color: '#999',
        marginTop: 4
    },
    closeModalBtn: {
        marginTop: 24,
        alignItems: 'center',
        padding: 16
    },
    closeModalText: {
        color: Color.colorOrangered,
        fontFamily: FontFamily.poppinsSemiBold
    },

    // Blocking Loader
    blockingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999
    },
    uploadingText: {
        color: Color.colorWhite,
        marginTop: 16,
        fontFamily: FontFamily.poppinsSemiBold,
        fontSize: FontSize.base
    }
});
