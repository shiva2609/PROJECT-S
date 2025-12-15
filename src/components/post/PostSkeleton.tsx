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

export default function PostSkeleton() {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <SkeletonItem width={40} height={40} borderRadius={20} />
                    <View style={styles.headerText}>
                        <SkeletonItem width={120} height={14} style={{ marginBottom: 6 }} />
                        <SkeletonItem width={80} height={10} />
                    </View>
                </View>
                <SkeletonItem width={24} height={24} borderRadius={12} />
            </View>

            {/* Media */}
            <SkeletonItem width={width - 24} height={width - 24} borderRadius={0} style={styles.media} />

            {/* Actions */}
            <View style={styles.actions}>
                <SkeletonItem width={32} height={32} borderRadius={16} style={{ marginRight: 16 }} />
                <SkeletonItem width={32} height={32} borderRadius={16} style={{ marginRight: 16 }} />
                <SkeletonItem width={32} height={32} borderRadius={16} />
                <View style={{ flex: 1 }} />
                <SkeletonItem width={32} height={32} borderRadius={16} />
            </View>

            {/* Text Lines */}
            <View style={styles.content}>
                <SkeletonItem width="90%" height={12} style={{ marginBottom: 8 }} />
                <SkeletonItem width="60%" height={12} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.white.primary,
        marginBottom: 16,
        borderRadius: 22,
        marginHorizontal: 12,
        paddingBottom: 16,
        borderWidth: 1,
        borderColor: Colors.white.tertiary,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerText: {
        marginLeft: 12,
    },
    media: {
        width: '100%',
        backgroundColor: Colors.white.tertiary,
    },
    actions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
});
