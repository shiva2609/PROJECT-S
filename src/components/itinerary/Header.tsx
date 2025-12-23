/**
 * Header Component for Itinerary Builder
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

export default function Header() {
    const navigation = useNavigation();

    return (
        <View style={styles.header}>
            <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
            >
                <Icon name="arrow-back" size={24} color={Colors.black.primary} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
                <Text style={styles.title}>Ask Sanchari</Text>
                <Text style={styles.subtitle}>AI Itinerary Builder</Text>
            </View>
            <View style={styles.placeholder} />
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: Colors.white.primary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.white.tertiary,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    title: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: Colors.black.primary,
    },
    subtitle: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.black.tertiary,
        marginTop: 2,
    },
    placeholder: {
        width: 40,
    },
});
