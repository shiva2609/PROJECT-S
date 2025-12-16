/**
 * Feedback Screen
 * V1: User feedback submission system for bugs, features, and improvements
 * Purpose: Collect structured user feedback for admin review (not live chat support)
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useAuth } from '../../providers/AuthProvider';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/auth/authService';

type FeedbackType = 'Bug' | 'Feature Request' | 'Improvement' | 'Other';

const FEEDBACK_TYPES: FeedbackType[] = ['Bug', 'Feature Request', 'Improvement', 'Other'];

export default function FeedbackScreen({ navigation }: any) {
    const { user } = useAuth();
    const [selectedType, setSelectedType] = useState<FeedbackType>('Bug');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        // Validate
        if (!message.trim()) {
            Alert.alert('Required', 'Please enter your feedback message.');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'You must be signed in to submit feedback.');
            return;
        }

        setSubmitting(true);

        try {
            // Create feedback document
            const feedbackRef = doc(collection(db, 'feedbacks'));

            await setDoc(feedbackRef, {
                userId: user.uid,
                username: user.displayName || 'Unknown',
                type: selectedType,
                message: message.trim(),
                createdAt: serverTimestamp(),
                status: 'pending',
                // Optional metadata
                appVersion: '1.0.0', // V1
                platform: Platform.OS,
                deviceInfo: `${Platform.OS} ${Platform.Version}`,
            });

            console.log('✅ Feedback submitted successfully');

            // Show success
            Alert.alert(
                'Thank You!',
                'Your feedback has been submitted. We appreciate your input and will review it soon.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Clear form and go back
                            setMessage('');
                            setSelectedType('Bug');
                            navigation.goBack();
                        },
                    },
                ]
            );
        } catch (error: any) {
            console.error('❌ Error submitting feedback:', error);
            Alert.alert(
                'Submission Failed',
                'Failed to submit feedback. Please try again later.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={Colors.black.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Send Feedback</Text>
                <View style={styles.backButton} />
            </View>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                {/* Info */}
                <View style={styles.infoBox}>
                    <Icon name="information-circle" size={20} color={Colors.brand.primary} />
                    <Text style={styles.infoText}>
                        Help us improve! Share bugs, request features, or suggest improvements.
                    </Text>
                </View>

                {/* Feedback Type Selector */}
                <View style={styles.section}>
                    <Text style={styles.label}>Feedback Type *</Text>
                    <View style={styles.typeSelector}>
                        {FEEDBACK_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.typeButton,
                                    selectedType === type && styles.typeButtonActive,
                                ]}
                                onPress={() => setSelectedType(type)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.typeButtonText,
                                        selectedType === type && styles.typeButtonTextActive,
                                    ]}
                                >
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Message Input */}
                <View style={styles.section}>
                    <Text style={styles.label}>Your Message *</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Describe your feedback in detail..."
                        placeholderTextColor={Colors.black.qua}
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        numberOfLines={8}
                        textAlignVertical="top"
                        maxLength={1000}
                    />
                    <Text style={styles.charCount}>{message.length}/1000</Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color={Colors.white.primary} />
                    ) : (
                        <>
                            <Icon name="send" size={18} color={Colors.white.primary} />
                            <Text style={styles.submitButtonText}>Submit Feedback</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Note */}
                <Text style={styles.note}>
                    Your feedback will be reviewed by our team. We may not respond to every submission, but we read them all.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.white.tertiary,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: Colors.black.primary,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.brand.accent + '15',
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
        gap: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        fontFamily: Fonts.regular,
        color: Colors.black.secondary,
        lineHeight: 18,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontFamily: Fonts.semibold,
        color: Colors.black.primary,
        marginBottom: 12,
    },
    typeSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    typeButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: Colors.white.tertiary,
        backgroundColor: Colors.white.primary,
    },
    typeButtonActive: {
        borderColor: Colors.brand.primary,
        backgroundColor: Colors.brand.primary + '10',
    },
    typeButtonText: {
        fontSize: 13,
        fontFamily: Fonts.medium,
        color: Colors.black.secondary,
    },
    typeButtonTextActive: {
        color: Colors.brand.primary,
        fontFamily: Fonts.semibold,
    },
    textInput: {
        backgroundColor: Colors.white.secondary,
        borderRadius: 12,
        padding: 14,
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: Colors.black.primary,
        minHeight: 150,
        borderWidth: 1,
        borderColor: Colors.white.tertiary,
    },
    charCount: {
        fontSize: 12,
        fontFamily: Fonts.regular,
        color: Colors.black.qua,
        textAlign: 'right',
        marginTop: 6,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.brand.primary,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        marginBottom: 16,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 15,
        fontFamily: Fonts.semibold,
        color: Colors.white.primary,
    },
    note: {
        fontSize: 12,
        fontFamily: Fonts.regular,
        color: Colors.black.qua,
        textAlign: 'center',
        lineHeight: 16,
        paddingHorizontal: 16,
        marginBottom: 24,
    },
});
