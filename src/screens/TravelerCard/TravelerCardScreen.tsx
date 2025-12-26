
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, SafeAreaView, TouchableOpacity, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import { Colors } from '../../theme/colors';
import { TravelerCard } from '../../types/firestore';
import { getTravelerCard } from '../../global/services/travelerCard/travelerCard.service';
import { useAuth } from '../../providers/AuthProvider';

type TravelerCardRouteProp = RouteProp<{ params: { userId: string } }, 'params'>;

export default function TravelerCardScreen() {
    const route = useRoute<TravelerCardRouteProp>();
    const navigation = useNavigation();
    const { user } = useAuth();
    // Default to current user if no ID passed (e.g. from Drawer)
    const userId = route.params?.userId || user?.uid;

    const [card, setCard] = useState<TravelerCard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showQrInfo, setShowQrInfo] = useState(false);

    useEffect(() => {
        let isMounted = true;
        async function fetchCard() {
            if (!userId) {
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                }
                return;
            }

            // Fetch Traveller Card from Firestore
            // Card creation is guaranteed by AuthProvider on auth ready
            const data = await getTravelerCard(userId);

            if (isMounted) {
                if (data) {
                    setCard(data);
                } else {
                    // Card should exist - log for debugging
                    console.warn('[TravelerCardScreen] ⚠️ Traveller Card not found for user:', userId);
                    setError(true);
                }
                setLoading(false);
            }
        }
        fetchCard();
        return () => { isMounted = false; };
    }, [userId, user]);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="small" color="#E87A5D" />
            </View>
        );
    }

    // Fallback UI
    if (error || !card) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Traveler Card</Text>
                </View>
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>Traveler Card unavailable</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Since Date (Should come from card.since, string formatted "MMM YYYY")
    // Fallback if missing
    const sinceText = card.since || 'Unknown';

    // Format Traveler ID: 16-char Alphanumeric dash-separated (AAAA-BBBB-CCCC-DDDD)
    // Stored as raw string in Firestore (e.g. FTK8EA3WJADSEOWG)
    const rawId = card.travelerId || (userId ? userId.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : '');
    const cleanId = rawId.replace(/-/g, ''); // Ensure no hyphens for processing
    const travelerIdPadded = cleanId.length >= 16 ? cleanId.substring(0, 16) : cleanId.padEnd(16, 'X');
    const formattedId = travelerIdPadded.match(/.{1,4}/g)?.join(' - ') || '---- - ---- - ---- - ----';

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Traveler Card</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.screenContent}>

                {/* 
                   ===========================================
                   TRAVELER CARD - STITCH AI DESIGN
                   ===========================================
                */}
                <View style={styles.cardWrapper}>
                    {/* 
                        GRADIENT MESH BACKGROUND - ULTRA LIGHT
                        Simulates the "spread" shade using a diagonal gradient 
                        Top-Right: Teal (Very Light) -> Bottom-Left: Coral (Very Light)
                    */}
                    <LinearGradient
                        start={{ x: 1, y: 0 }} // Top Right
                        end={{ x: 0, y: 1 }}   // Bottom Left
                        locations={[0.0, 0.4, 0.6, 1.0]}
                        colors={[
                            'rgba(93, 154, 148, 0.05)',  // Brand Teal @ 5% opacity
                            '#FFFFFF',                    // White
                            '#FFFFFF',                    // White
                            'rgba(232, 122, 93, 0.05)'    // Brand Coral @ 5% opacity
                        ]}
                        style={styles.cardBackground}
                    />

                    <View style={styles.cardInnerContent}>

                        {/* 1. TOP HEADER */}
                        <View style={styles.rowBetweenStart}>
                            <View>
                                <Text style={styles.brandTitle}>Sanchari</Text>
                                <Text style={styles.officialTag}>TRAVELER CARD</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.qrContainer}
                                onPress={() => setShowQrInfo(true)}
                            >
                                <Icon name="qr-code-outline" size={20} color="#5D9A94" />
                            </TouchableOpacity>
                        </View>

                        {/* 2. BODY CONTENT */}
                        <View style={styles.bodyContent}>

                            {/* Identity Row */}
                            <View style={styles.mb6}>
                                <View style={styles.rowBetweenEnd}>
                                    <Text style={[styles.labelSmall, { marginBottom: 0 }]}>IDENTITY NAME</Text>
                                    <Text style={styles.sinceText}>Since {sinceText}</Text>
                                </View>
                                <View style={styles.nameRow}>
                                    <Text style={styles.identityName} numberOfLines={1}>{card.displayName}</Text>
                                    <TouchableOpacity onPress={() => Alert.alert('Identity', 'Identity verification is pending.')}>
                                        <Icon name="information-circle-outline" size={18} color="#9CA3AF" style={{ marginLeft: 6 }} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.verificationStatus}>
                                    Verification — <Text style={styles.comingSoon}>Coming Soon</Text>
                                </Text>
                            </View>

                            {/* Traveler ID */}
                            <View style={styles.mb6}>
                                <Text style={styles.labelSmall}>TRAVELER ID</Text>
                                <Text style={styles.travelerIdMono}>{formattedId}</Text>
                            </View>

                            {/* Grid: Nationality & Emergency */}
                            <View style={styles.grid2Col}>
                                <View>
                                    <Text style={styles.labelSmall}>NATIONALITY</Text>
                                    <Text style={styles.valueLarge}>{card.nationality || 'Unknown'}</Text>
                                </View>
                                <View>
                                    <Text style={styles.labelSmall}>EMERGENCY INFO</Text>
                                    <TouchableOpacity>
                                        <Text style={styles.linkText}>Add Info</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                        </View>

                        {/* 3. FOOTER (Trust & History) */}
                        <View style={styles.footerRow}>
                            <View style={styles.rowCenter}>
                                <View style={[styles.shieldIconContainer, { backgroundColor: 'rgba(232, 122, 93, 0.1)' }]}>
                                    <Icon name="shield-checkmark-outline" size={20} color={Colors.brand.primary} />
                                </View>
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.labelMicro}>TRUST TIER</Text>
                                    <Text style={styles.valueMedium}>{card.trustTier || 'UNPROVEN'}</Text>
                                </View>
                            </View>

                            {/* Divider */}
                            <View style={styles.verticalDivider} />

                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.labelMicro}>TRAVEL HISTORY</Text>
                                <Text style={styles.recordsText}>
                                    <Text style={{ fontSize: 18 }}>{card.travelHistoryCount || 0}</Text> Records
                                </Text>
                            </View>
                        </View>

                    </View>

                    {/* Bottom Gradient Border Stroke */}
                    <LinearGradient
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        colors={['#E87A5D', '#5D9A94', '#E87A5D']}
                        style={styles.bottomBorderStroke}
                    />
                </View>

                {/* QR POPOVER MODAL */}
                <Modal
                    transparent={true}
                    visible={showQrInfo}
                    animationType="fade"
                    onRequestClose={() => setShowQrInfo(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setShowQrInfo(false)}>
                        <View style={styles.popoverOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={styles.popoverContainer}>
                                    <Text style={styles.popoverText}>
                                        Traveler QR verification is coming soon.{'\n'}
                                        This code will allow hosts and partners to verify your identity instantly.
                                    </Text>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F3F4F6', // background-light
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    backButton: { padding: 4 },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: { color: '#6B7280' },

    screenContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 40,
    },

    // --- CARD STYLES ---
    cardWrapper: {
        width: '100%',
        maxWidth: 360,
        aspectRatio: 1 / 1.6,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
        elevation: 10,
        overflow: 'hidden',
        position: 'relative',
    },
    cardBackground: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },

    cardInnerContent: {
        flex: 1,
        padding: 32, // p-8
        justifyContent: 'space-between',
        zIndex: 10,
    },

    // Header
    rowBetweenStart: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center', // Center alignment
    },
    brandTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: Colors.brand.primary,
        letterSpacing: -0.5,
    },
    officialTag: {
        fontSize: 10,
        fontWeight: '700',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginTop: 4,
    },
    qrContainer: {
        backgroundColor: '#EAF5F4', // teal-light
        padding: 6, // Reduced Padding
        borderRadius: 8, // Reduced Radius
        borderWidth: 0.5, // Thinner border
        borderColor: 'rgba(93, 154, 148, 0.3)',
    },

    // Body
    bodyContent: {
        flex: 1,
        justifyContent: 'center',
        paddingVertical: 16,
    },
    rowBetweenEnd: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 6,
    },
    mb6: { marginBottom: 28 },
    labelSmall: {
        fontSize: 10,
        fontWeight: '700',
        color: '#9CA3AF', // gray-400
        textTransform: 'uppercase',
        letterSpacing: 2, // tracking-widest
        marginBottom: 6,
    },
    sinceText: {
        fontSize: 10, // Match Label Size
        fontWeight: '600',
        color: '#5D9A94', // teal
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    identityName: {
        fontSize: 16, // Uniform Body Size
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
    },
    verificationStatus: {
        fontSize: 10, // Match Label Size
        color: '#9CA3AF',
        fontStyle: 'italic',
        marginTop: 6,
        fontWeight: '500',
    },
    comingSoon: {
        color: Colors.brand.primary,
        fontStyle: 'normal',
        fontWeight: '600',
    },

    // ID
    travelerIdMono: {
        fontSize: 16, // Uniform Body Size
        fontFamily: 'Courier',
        fontWeight: '700',
        color: '#1F2937',
        letterSpacing: 0.5,
    },

    // Grid
    grid2Col: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 24,
    },
    valueLarge: {
        fontSize: 16, // Uniform Body Size
        fontWeight: '700',
        color: '#111827',
    },
    linkText: {
        fontSize: 16, // Uniform Body Size
        fontWeight: '600',
        color: '#1F2937',
        textDecorationLine: 'underline',
        textDecorationColor: Colors.brand.primary,
        textDecorationStyle: 'solid',
    },

    // Footer
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(229, 231, 235, 0.6)',
        marginTop: 16,
    },
    rowCenter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    shieldIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        // backgroundColor set inline
    },
    labelMicro: {
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
        color: '#9CA3AF',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    valueMedium: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    verticalDivider: {
        height: 32,
        width: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 12,
    },
    recordsText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },

    // Bottom Gradient Border Stroke
    bottomBorderStroke: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        opacity: 0.3, // Lighter
    },

    // POPOVER STYLES
    popoverOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 130,
        paddingRight: 0,
    },
    popoverContainer: {
        position: 'absolute',
        top: 154,
        right: 48,
        width: 220,
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
        zIndex: 999,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    popoverText: {
        fontSize: 12,
        color: '#4B5563',
        lineHeight: 18,
        fontWeight: '500',
    }
});
