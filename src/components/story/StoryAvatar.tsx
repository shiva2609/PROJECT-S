import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { StoryUser } from '../../types/story';
import { colors } from '../../utils/colors';

interface Props {
    user: StoryUser;
    onPress: () => void;
    isMe?: boolean;
}

export const StoryAvatar = ({ user, onPress, isMe }: Props) => {
    const hasUnseen = user.hasUnseen;

    // Instagram-like gradient for unseen, grey for seen
    const gradientColors = hasUnseen
        ? ['#FBAA47', '#D91A46', '#A60F93']
        : ['#E0E0E0', '#BDBDBD'];

    const [imageError, setImageError] = React.useState(false);

    return (
        <TouchableOpacity onPress={onPress} style={styles.container}>
            <View style={styles.ringContainer}>
                {/* If isMe and no stories, maybe show + badge? Handled in wrapper. */}
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                >
                    <View style={styles.innerBorder}>
                        {user.avatar && !imageError ? (
                            <Image
                                source={{ uri: user.avatar }}
                                style={styles.avatar}
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <View style={[styles.avatar, styles.fallbackAvatar]}>
                                {/* ISSUE 1: Proper fallback icon (👤) for Story Section - Never show text initials */}
                                <Icon name="person" size={32} color="#888" />
                            </View>
                        )}
                    </View>
                </LinearGradient>
            </View>
            <Text style={styles.username} numberOfLines={1}>
                {isMe ? 'Your Story' : user.username}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginRight: 16,
        width: 72,
    },
    ringContainer: {
        marginBottom: 4,
    },
    gradient: {
        width: 68,
        height: 68,
        borderRadius: 34,
        padding: 2, // Border width
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerBorder: {
        backgroundColor: colors.surface,
        width: 64,  // 68 - 2*2
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    fallbackAvatar: {
        backgroundColor: '#E1E1E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    username: {
        fontSize: 11,
        color: colors.text,
        textAlign: 'center',
    },
});
