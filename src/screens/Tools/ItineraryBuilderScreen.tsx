/**
 * Ask Sanchari - Itinerary Builder Screen
 * 
 * Future Home of AI-powered itinerary planning.
 * Currently disabled for security enhancements.
 */

import React from 'react';
import {
    View,
    StyleSheet,
    Text,
    SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Header from '../../components/itinerary/Header';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

export default function ItineraryBuilderScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Header />

                <View style={styles.centerContainer}>
                    <View style={styles.iconContainer}>
                        <Icon name="construct" size={32} color={Colors.brand.primary} />
                    </View>
                    <Text style={styles.title}>AI Itineraries — Coming Soon</Text>
                    <Text style={styles.text}>
                        We’re building this carefully to keep your data secure.
                    </Text>
                </View>

                <View style={styles.bottomContainer}>
                    <View style={styles.disabledButton}>
                        <Text style={styles.disabledButtonText}>AI Itineraries — Coming Soon</Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white.primary,
    },
    content: {
        flex: 1,
        flexDirection: 'column',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFF0E6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontFamily: Fonts.bold,
        fontSize: 22,
        color: Colors.black.primary,
        marginBottom: 12,
        textAlign: 'center',
    },
    text: {
        fontFamily: Fonts.regular,
        fontSize: 16,
        color: Colors.black.tertiary,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 300,
    },
    bottomContainer: {
        padding: 16,
        backgroundColor: Colors.white.primary,
        borderTopWidth: 1,
        borderTopColor: Colors.white.tertiary,
    },
    disabledButton: {
        height: 50,
        backgroundColor: Colors.white.secondary,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButtonText: {
        fontFamily: Fonts.medium,
        fontSize: 16,
        color: Colors.black.qua,
    },
});

