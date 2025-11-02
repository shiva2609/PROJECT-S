import React from "react";
import { StyleSheet, Text, View, Pressable, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from "@react-native-community/blur";
import Icon from "react-native-vector-icons/Feather";
import { Color, Padding, Height, FontFamily } from "../../GlobalStyles";

type RootStackParamList = {
  Onboarding1: undefined;
  Onboarding2: undefined;
  Onboarding3: undefined;
  Onboarding4: undefined;
  AuthLogin: undefined;
  AuthSignup: undefined;
};

const OnboardingScreen4 = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ImageBackground 
        source={require('../assets/images/onboard4.jpeg')}
        style={styles.imageBackground}
        resizeMode="cover"
      >
        {/* Blur overlay */}
        <BlurView
          style={styles.blurOverlay}
          blurType="light"
          blurAmount={5}
          reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.7)"
        />
        
        {/* Back button */}
        <View style={styles.backButtonContainer}>
          <Pressable 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={20} color={Color.colorWhite} />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>

        {/* Bottom Content */}
        <View style={styles.bottomContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{`Your All-in-One\nTravel Partner.`}</Text>
            <Text style={styles.subtitle}>
              Plan, Discover, and book your next adventure, all in one place.
            </Text>
          </View>

          {/* Progress dots */}
          <View style={styles.dotsContainer}>
            <View style={[styles.dot, styles.inactiveDot]} />
            <View style={[styles.dot, styles.inactiveDot]} />
            <View style={[styles.dot, styles.inactiveDot]} />
            <View style={[styles.dot, styles.activeDot]} />
          </View>

          {/* Action buttons - single primary (Login). Mark onboarding done then go to Login screen */}
          <View style={[styles.buttonRow, styles.singleButtonRow]}>
            <Pressable
              style={styles.button}
              onPress={() => {
                navigation.navigate('AuthLogin');
              }}
            >
              <Text style={styles.buttonText}>Login</Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.colorWhite,
  },
  imageBackground: {
    flex: 1,
    justifyContent: "space-between",
  },
  blurOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 800,
    right: 0,
  },
  backButtonContainer: {
    paddingTop: 50,
    paddingHorizontal: Padding.padding_36,
    zIndex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: Color.colorWhite,
    fontSize: 16,
    fontFamily: FontFamily.poppinsSemiBold,
    marginLeft: 4,
  },
  bottomContainer: {
    backgroundColor: Color.colorWhite,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: Padding.padding_36,
    paddingTop: 40,
    paddingBottom: 20,
    minHeight: 300,
  },
  textContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    fontFamily: FontFamily.poppinsExtraBold,
    color: Color.colorOrangered,
    marginBottom: 12,
    lineHeight: 35,
  },
  subtitle: {
    fontSize: 14,
    color: Color.colorGray100,
    fontFamily: FontFamily.poppinsRegular,
    width: "90%",
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 30,
  },
  dot: {
    width: 27,
    height: Height.height_5,
    borderRadius: 5,
    backgroundColor: Color.colorWhitesmoke,
  },
  activeDot: {
    backgroundColor: Color.colorOrangered,
  },
  inactiveDot: {
    backgroundColor: Color.colorWhitesmoke,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 0,
  },
  singleButtonRow: {
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  button: {
    flex: 1,
    backgroundColor: Color.colorOrangered,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedButton: {
    backgroundColor: Color.colorOrangered,
  },
  buttonText: {
    color: Color.colorWhite,
    fontSize: 15,
    fontFamily: FontFamily.poppinsMedium,
  },
});

export default OnboardingScreen4;
