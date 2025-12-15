import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PostCarousel, { MediaItem } from './PostCarousel';

interface PostMediaProps {
    media: MediaItem[];
    ratio?: string;
    aspectRatio?: number;
    postId?: string; // For logging
}

/**
 * Calculate image height using Instagram's exact formula
 * height = width * (1 / aspectRatio)
 * 
 * Uses numeric aspectRatio field first (primary), then falls back to ratio string
 */
function getAspectRatioHeight(width: number, aspectRatio?: number, ratio?: string): number {
    if (aspectRatio && aspectRatio > 0) {
        return Math.round(width * (1 / aspectRatio));
    }

    if (ratio) {
        switch (ratio) {
            case '1:1': return width;
            case '4:5': return Math.round(width * 1.25);
            case '16:9': return Math.round(width * 0.5625);
            default: return width;
        }
    }
    return width;
}

const PostMedia = ({ media, ratio, aspectRatio, postId }: PostMediaProps) => {
    const screenWidth = Dimensions.get('window').width;
    const [calculatedAspectRatio, setCalculatedAspectRatio] = useState<number | null>(null);

    // FALLBACK: Calculate aspect ratio from image dimensions if metadata is missing
    useEffect(() => {
        if (!aspectRatio && !ratio && media.length > 0) {
            const firstImageUri = media[0]?.uri;
            if (firstImageUri) {
                Image.getSize(
                    firstImageUri,
                    (width, height) => {
                        if (width > 0 && height > 0) {
                            setCalculatedAspectRatio(width / height);
                        }
                    },
                    () => { } // Silently fail
                );
            }
        } else {
            setCalculatedAspectRatio(null);
        }
    }, [aspectRatio, ratio, media]);

    const mediaWidth = screenWidth;
    let mediaHeight: number;

    if (aspectRatio && aspectRatio > 0) {
        mediaHeight = Math.round(screenWidth * (1 / aspectRatio));
    } else if (ratio) {
        mediaHeight = getAspectRatioHeight(screenWidth, undefined, ratio);
    } else if (calculatedAspectRatio && calculatedAspectRatio > 0) {
        mediaHeight = Math.round(screenWidth * (1 / calculatedAspectRatio));
    } else {
        mediaHeight = screenWidth;
        if (__DEV__) {
            console.warn('⚠️ [PostMedia] No aspectRatio, ratio, or image dimensions - defaulting to square', postId);
        }
    }

    if (!media || media.length === 0) {
        return (
            <View style={[styles.imageContainer, styles.postImagePlaceholder]}>
                <Icon name="image-outline" size={48} color="#8E8E8E" />
            </View>
        );
    }

    return (
        <View style={{
            width: mediaWidth,
            height: mediaHeight,
            backgroundColor: 'black',
            overflow: 'hidden',
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            position: 'relative',
        }}>
            <PostCarousel
                media={media}
                ratio={ratio}
                aspectRatio={aspectRatio}
                width={mediaWidth}
                height={mediaHeight}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    imageContainer: {
        width: '100%',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#F5F5F5',
    },
    postImagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 340, // Fallback height for placeholder
    },
});

export default React.memo(PostMedia);
