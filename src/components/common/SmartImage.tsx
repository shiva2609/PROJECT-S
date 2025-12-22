import React, { useState, useMemo, useEffect } from 'react';
import {
    Image,
    StyleSheet,
    View,
    Animated,
    StyleProp,
    ImageStyle,
    ImageResizeMode,
    ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';

interface SmartImageProps {
    uri?: string;
    style?: StyleProp<ImageStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    resizeMode?: ImageResizeMode;
    preview?: string; // Low-res preview or blurhash (not implemented yet)
    borderRadius?: number;
    showPlaceholder?: boolean;
    placeholderIcon?: string;
    fadeIn?: boolean;
}

/**
 * SmartImage Component
 * 
 * Enforces:
 * 1. Stable Source Object (memoized)
 * 2. Loading State (Placeholder)
 * 3. Error Fallback
 * 4. Fade-in Animation
 * 5. Memory Safety (simple RN Image for now)
 */
// Session-level cache of loaded URIs to prevent flickering on remount
const loadedUris = new Set<string>();

export const SmartImage = React.memo(({
    uri,
    style,
    containerStyle,
    resizeMode = 'cover',
    borderRadius = 0,
    showPlaceholder = true,
    placeholderIcon = 'image-outline',
    fadeIn = true,
}: SmartImageProps) => {
    // Check if this URI has already been loaded in this session
    const isAlreadyLoaded = useMemo(() => uri ? loadedUris.has(uri) : false, [uri]);

    const [loading, setLoading] = useState(!isAlreadyLoaded);
    const [error, setError] = useState(false);

    // Stable animation value - NEVER re-create this during component lifetime
    const opacity = useMemo(() => new Animated.Value(isAlreadyLoaded ? 1 : 0), []);

    // Stable source
    const source = useMemo(() => {
        if (!uri) return { uri: '' };
        return { uri };
    }, [uri]);

    useEffect(() => {
        if (uri) {
            if (loadedUris.has(uri)) {
                setLoading(false);
                setError(false);
                opacity.setValue(1);
            } else {
                setLoading(true);
                setError(false);
                // Only reset opacity if it's a new URI we haven't loaded yet
                if (fadeIn) opacity.setValue(0);
            }
        }
    }, [uri, fadeIn, opacity]);

    const handleLoadEnd = () => {
        if (uri) loadedUris.add(uri);
        setLoading(false);

        if (fadeIn && !isAlreadyLoaded) {
            Animated.timing(opacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        } else {
            opacity.setValue(1);
        }
    };

    const handleError = () => {
        setLoading(false);
        setError(true);
    };

    if (!uri || error) {
        if (!showPlaceholder) return null;
        return (
            <View style={[styles.placeholder, style, containerStyle, { borderRadius }]}>
                <Icon name={placeholderIcon} size={24} color={Colors.black.qua} />
            </View>
        );
    }

    return (
        <View style={[styles.container, containerStyle, { borderRadius, overflow: 'hidden' }]}>
            {/* Placeholder Background - Only visible on first load of the session */}
            {showPlaceholder && (
                <View
                    style={[
                        styles.placeholder,
                        StyleSheet.absoluteFill,
                        isAlreadyLoaded && { backgroundColor: 'transparent' }
                    ]}
                >
                    {loading && !isAlreadyLoaded && (
                        <Icon name={placeholderIcon} size={20} color={Colors.black.qua} style={{ opacity: 0.3 }} />
                    )}
                </View>
            )}

            {/* Actual Animated Image */}
            <Animated.Image
                source={source}
                style={[style, { opacity }]}
                resizeMode={resizeMode}
                onLoad={handleLoadEnd}
                onLoadEnd={handleLoadEnd}
                onError={handleError}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'transparent', // Remove the base gray to prevent flashes
        overflow: 'hidden',
    },
    placeholder: {
        backgroundColor: '#EAEAEA',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
});
