import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

const SkeletonItem = ({ width, height, borderRadius = 4, style }: any) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: Colors.white.tertiary, // Skeleton gray
                    opacity,
                },
                style,
            ]}
        />
    );
};

export default function ProfileSkeleton() {
    return (
        <View style={styles.container}>
            {/* Header Bar Skeleton */}
            <View style={styles.header}>
                <SkeletonItem width={24} height={24} borderRadius={12} />
                <SkeletonItem width={120} height={20} />
                <SkeletonItem width={24} height={24} borderRadius={12} />
            </View>

            {/* Profile Card Skeleton */}
            <View style={styles.content}>
                <View style={styles.card}>
                    <View style={styles.topSection}>
                        <SkeletonItem width={80} height={80} borderRadius={40} style={styles.avatar} />
                        <View style={styles.info}>
                            <SkeletonItem width={180} height={24} style={styles.textMb} />
                            <SkeletonItem width={120} height={16} style={styles.textMb} />
                            <SkeletonItem width={100} height={14} />
                        </View>
                    </View>

                    <View style={styles.bioSection}>
                        <SkeletonItem width="100%" height={14} style={styles.textMb} />
                        <SkeletonItem width="80%" height={14} />
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <SkeletonItem width={30} height={24} style={styles.textMb} />
                            <SkeletonItem width={40} height={14} />
                        </View>
                        <View style={styles.stat}>
                            <SkeletonItem width={30} height={24} style={styles.textMb} />
                            <SkeletonItem width={60} height={14} />
                        </View>
                        <View style={styles.stat}>
                            <SkeletonItem width={30} height={24} style={styles.textMb} />
                            <SkeletonItem width={60} height={14} />
                        </View>
                    </View>
                </View>

                {/* Tabs Skeleton */}
                <View style={styles.tabs}>
                    <SkeletonItem width={width / 2 - 32} height={40} />
                    <SkeletonItem width={width / 2 - 32} height={40} />
                </View>

                {/* Grid Skeleton */}
                <View style={styles.grid}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <SkeletonItem
                            key={i}
                            width={(width - 4) / 3}
                            height={(width - 4) / 3}
                            borderRadius={0}
                            style={styles.gridItem}
                        />
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white.primary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: Colors.white.tertiary,
    },
    content: {
        padding: 16,
    },
    card: {
        padding: 20,
        borderRadius: 20,
        backgroundColor: Colors.white.secondary,
        borderWidth: 1,
        borderColor: Colors.white.tertiary,
        marginBottom: 20,
    },
    topSection: {
        flexDirection: 'row',
        marginBottom: 20,
        alignItems: 'center',
    },
    avatar: {
        marginRight: 16,
    },
    info: {
        flex: 1,
        justifyContent: 'center',
    },
    textMb: {
        marginBottom: 8,
    },
    bioSection: {
        marginBottom: 24,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    stat: {
        alignItems: 'center',
    },
    tabs: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -16, // counteract padding
    },
    gridItem: {
        margin: 1,
    },
});
