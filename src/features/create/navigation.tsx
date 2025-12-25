import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CreateStackParamList } from './types';
import MediaPickScreen from './screens/MediaPickScreen';
import AdjustScreen from './screens/AdjustScreen';
import DetailsScreen from './screens/DetailsScreen';

const Stack = createNativeStackNavigator<CreateStackParamList>();

export default function CreateNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="MediaPick"
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: false, // Strict flow control
            }}
        >
            <Stack.Screen name="MediaPick" component={MediaPickScreen} />
            <Stack.Screen name="Adjust" component={AdjustScreen} />
            <Stack.Screen name="Details" component={DetailsScreen} />
        </Stack.Navigator>
    );
}
