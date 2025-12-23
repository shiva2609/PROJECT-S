/**
 * ChatInput Component
 * 
 * Input field for sending messages
 */

import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
    const [text, setText] = useState('');

    const handleSend = () => {
        if (text.trim() && !disabled) {
            onSend(text.trim());
            setText('');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Describe your dream trip..."
                    placeholderTextColor={Colors.black.qua}
                    value={text}
                    onChangeText={setText}
                    multiline
                    maxLength={500}
                    editable={!disabled}
                />
                <TouchableOpacity
                    style={[styles.sendButton, (!text.trim() || disabled) && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={!text.trim() || disabled}
                >
                    <Icon
                        name="send"
                        size={20}
                        color={text.trim() && !disabled ? Colors.white.primary : Colors.black.qua}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: Colors.white.primary,
        borderTopWidth: 1,
        borderTopColor: Colors.white.tertiary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: Colors.white.secondary,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: Colors.white.tertiary,
    },
    input: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: 15,
        color: Colors.black.primary,
        maxHeight: 100,
        paddingVertical: 8,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.brand.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: Colors.white.tertiary,
    },
});
