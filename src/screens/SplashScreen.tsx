import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../utils/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_USER_KEY } from '../utils/constants';
import { auth, firestore } from '../services/api/firebaseConfig';
import { useDispatch } from 'react-redux';
import { setUser } from '../store';

type Props = {
  navigation: StackNavigationProp<any>;
};

export default function SplashScreen({ navigation }: Props) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const dispatch = useDispatch();

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        // Wait a bit for animation
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check Firebase Auth state using React Native Firebase
        const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
          unsubscribe(); // Remove listener after first check
          
          if (firebaseUser) {
            const uid = firebaseUser.uid;
            
            // Check and create/update user document if needed
            let userData: any = {};
            try {
              const userDocRef = firestore().collection('users').doc(uid);
              const userDoc = await userDocRef.get();
              userData = userDoc.data();

              if (!userData) {
                // Create missing user document with exact structure
                console.log('📝 Creating missing user document on splash...');
                const now = new Date().toISOString();
                const newUserData = {
                  username: firebaseUser.displayName || '',
                  email: firebaseUser.email || '',
                  role: 'traveler',
                  travelPlan: [],
                  createdAt: now,
                  updatedAt: now,
                };
                try {
                  await userDocRef.set(newUserData, { merge: true });
                  userData = newUserData;
                  console.log('✅ User document created');
                } catch (firestoreError: any) {
                  console.error('❌ Firestore Error - Failed to create user document:', {
                    code: firestoreError?.code,
                    message: firestoreError?.message,
                    uid: uid,
                  });
                }
              } else {
                // Update missing fields if needed
                const updates: any = {};
                if (!userData.username) updates.username = firebaseUser.displayName || '';
                if (!userData.email) updates.email = firebaseUser.email || '';
                if (!userData.role) updates.role = 'traveler';
                if (!userData.travelPlan) updates.travelPlan = [];
                if (!userData.createdAt) updates.createdAt = new Date().toISOString();
                if (!userData.updatedAt) updates.updatedAt = new Date().toISOString();
                
                if (Object.keys(updates).length > 0) {
                  try {
                    await userDocRef.set(updates, { merge: true });
                    userData = { ...userData, ...updates };
                    console.log('✅ User document updated');
                  } catch (firestoreError: any) {
                    console.error('❌ Firestore Error - Failed to update user document:', {
                      code: firestoreError?.code,
                      message: firestoreError?.message,
                      uid: uid,
                    });
                  }
                }
              }
            } catch (firestoreError: any) {
              console.error('❌ Firestore Error - Failed to check user document:', {
                code: firestoreError?.code,
                message: firestoreError?.message,
                uid: uid,
              });
              // Continue with default data
              userData = {};
            }

            // Try to get from AsyncStorage for username
            let asyncStorageData: any = {};
            try {
              const userDataStr = await AsyncStorage.getItem(AUTH_USER_KEY);
              if (userDataStr) {
                asyncStorageData = JSON.parse(userDataStr);
              }
            } catch (error: any) {
              console.error('❌ Storage Error - Failed to read AsyncStorage:', {
                message: error?.message,
                error: error,
              });
            }
            
            // Restore user in Redux
            dispatch(setUser({
              id: uid,
              email: userData.email || firebaseUser.email || '',
              displayName: asyncStorageData.username || userData.username || firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
            }));

            // Skip onboarding and travel plan screens - go directly to MainTabs if user is logged in
            // Check if travelPlan exists, but still go to MainTabs (user can update travel plan later)
            const hasTravelPlan = userData.travelPlan && Array.isArray(userData.travelPlan) && userData.travelPlan.length > 0;
            
            if (hasTravelPlan) {
              console.log('✅ User authenticated with travel plan, navigating to MainTabs');
              navigation.replace('MainTabs');
            } else {
              console.log('✅ User authenticated, navigating to MainTabs (travel plan can be updated later)');
              navigation.replace('MainTabs');
            }
          } else {
            // User is not logged in - go to onboarding
            console.log('ℹ️ No user logged in, navigating to onboarding');
            navigation.replace('Onboarding1');
          }
        });
      } catch (error) {
        console.error('❌ Error checking auth state:', error);
        // On error, default to onboarding
        navigation.replace('Onboarding1');
      }
    };

    // Start animation
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.98,
        duration: 150,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Check auth state
    checkAuthState();
  }, [navigation, scale, dispatch]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Text style={styles.logo}>S</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.primary,
  },
  tag: {
    marginTop: 8,
    color: colors.mutedText,
  },
});
