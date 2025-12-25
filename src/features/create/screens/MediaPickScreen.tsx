import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ActivityIndicator, Image, StatusBar } from 'react-native';
import { launchImageLibrary, launchCamera, Asset } from 'react-native-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MediaPickResult } from '../contracts';
import { CreateStackParamList } from '../navigation/types';
import { generateSessionId, SessionManager } from '../session';
import RNFS from 'react-native-fs';
import { Color, FontFamily, FontSize, Padding, Radius, Shadow } from '../../../GlobalStyles';

type Props = {
    navigation: NativeStackNavigationProp<CreateStackParamList, 'MediaPick'>;
};

export default function MediaPickScreen({ navigation }: Props) {
    const [loading, setLoading] = useState(false);

    const cleanupAndExit = async () => {
        navigation.getParent()?.goBack();
    };

    const processSelection = async (assets: Asset[] | undefined, source: 'library' | 'camera') => {
        if (!assets || assets.length === 0) return;

        if (assets.length > 1) {
            Alert.alert('Selection Error', 'Please select exactly 1 memory to share.');
            return;
        }

        const raw = assets[0];
        if (!raw || !raw.uri) return;

        setLoading(true);

        try {
            const sessionId = generateSessionId();
            await SessionManager.initializeSession(sessionId);

            let uri = raw.uri;
            const exists = await RNFS.exists(uri);
            if (!exists) throw new Error('Selected file is not accessible on disk');

            const width = raw.width || 0;
            const height = raw.height || 0;
            if (width < 500 || height < 500) throw new Error('Image is too small (Minimum 500x500)');
            if (raw.fileSize && raw.fileSize > 20 * 1024 * 1024) throw new Error('File too large (Max 20MB)');

            await new Promise((resolve, reject) => {
                Image.getSize(uri, () => resolve(true), (err) => reject(new Error('Image data is corrupt')));
            });

            const result: MediaPickResult = {
                originalUri: uri,
                source: source,
                mimeType: raw.type as 'image/jpeg' | 'image/png' || 'image/jpeg',
                width: width,
                height: height,
                fileSize: raw.fileSize || 0,
                timestamp: Date.now()
            };

            navigation.push('Adjust', { selection: result, sessionId: sessionId });

        } catch (e: any) {
            console.error(e);
            Alert.alert('Invalid Media', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenLibrary = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: 1,
                quality: 1,
                includeExtra: true,
            });

            if (result.didCancel) return;
            if (result.errorCode) {
                if (result.errorCode === 'permission') {
                    Alert.alert('Permission Denied', 'Please allow photo access in Settings.');
                    return;
                }
                Alert.alert('Error', result.errorMessage);
                return;
            }
            await processSelection(result.assets, 'library');
        } catch (e) {
            Alert.alert('Error', 'Failed to open library');
        }
    };

    const handleOpenCamera = async () => {
        Alert.alert(
            "Coming Soon",
            "Camera capture feature is under development. Please pick a moment from your gallery!",
            [{ text: "OK" }]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Color.colorWhite} />
            <View style={styles.header}>
                <Text style={styles.title}>Start a Journey</Text>
                <TouchableOpacity onPress={cleanupAndExit} style={styles.closeBtn}>
                    <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.heroTextContainer}>
                    <Text style={styles.heroTitle}>Select a Memory</Text>
                    <Text style={styles.heroSubtitle}>Share your travel moments with the world.</Text>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Color.colorOrangered} />
                        <Text style={styles.loadingText}>Verifying quality...</Text>
                    </View>
                ) : (
                    <View style={styles.btnGroup}>
                        <TouchableOpacity style={styles.btnPrimary} onPress={handleOpenLibrary}>
                            <Text style={styles.btnPrimaryText}>Open Gallery</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.btnSecondary} onPress={handleOpenCamera}>
                            <Text style={styles.btnSecondaryText}>Take a Photo</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Color.colorWhite },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: Padding.padding_16,
        alignItems: 'center',
    },
    title: {
        fontFamily: FontFamily.poppinsBold,
        fontSize: FontSize.lg,
        color: Color.colorGray300
    },
    closeBtn: { padding: Padding.padding_8 },
    closeText: {
        fontFamily: FontFamily.poppinsMedium,
        fontSize: FontSize.base,
        color: Color.colorGray200
    },

    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Padding.padding_24
    },

    heroTextContainer: {
        marginBottom: 48,
        alignItems: 'center'
    },
    heroTitle: {
        fontFamily: FontFamily.poppinsBold,
        fontSize: 24,
        color: Color.colorGray300,
        marginBottom: 8
    },
    heroSubtitle: {
        fontFamily: FontFamily.poppinsRegular,
        fontSize: FontSize.base,
        color: '#666',
        textAlign: 'center'
    },

    btnGroup: { gap: 16, width: '100%' },

    btnPrimary: {
        backgroundColor: Color.colorOrangered,
        paddingVertical: 18,
        borderRadius: Radius.radius_md,
        alignItems: 'center',
        ...Shadow.medium
    },
    btnPrimaryText: {
        fontFamily: FontFamily.poppinsSemiBold,
        color: Color.colorWhite,
        fontSize: FontSize.base
    },

    btnSecondary: {
        backgroundColor: Color.colorWhite,
        paddingVertical: 18,
        borderRadius: Radius.radius_md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0'
    },
    btnSecondaryText: {
        fontFamily: FontFamily.poppinsMedium,
        color: Color.colorGray300,
        fontSize: FontSize.base
    }, // Brand text color on secondary

    loadingContainer: { alignItems: 'center', gap: 12 },
    loadingText: {
        fontFamily: FontFamily.poppinsRegular,
        color: '#666'
    }
});
