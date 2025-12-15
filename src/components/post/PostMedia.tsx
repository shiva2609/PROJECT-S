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

    // Adjust width for inside-card look (marginHorizontal: 12 outer + 12 inner = 24 padding/side)
    // total deduction: 24 (card margins) + 24 (internal spacing) = 48
    const mediaWidth = screenWidth - 48;
    let mediaHeight: number;

    if (aspectRatio && aspectRatio > 0) {
        mediaHeight = Math.round(mediaWidth * (1 / aspectRatio));
    } else if (ratio) {
        mediaHeight = getAspectRatioHeight(mediaWidth, undefined, ratio);
    } else if (calculatedAspectRatio && calculatedAspectRatio > 0) {
        mediaHeight = Math.round(mediaWidth * (1 / calculatedAspectRatio));
    } else {
        mediaHeight = mediaWidth;
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
            alignSelf: 'center', // Center the smaller image
            backgroundColor: 'black',
            overflow: 'hidden',
            borderRadius: 18,
            position: 'relative',
        }}>

            {/* 
              Apply borderRadius to match PostCard container. 
              overflow: 'hidden' ensures images/videos clip correctly at the corners.
            */}
            <PostCarousel
                media={media}
                ratio={ratio as any}
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
