import React from "react";
import { StyleSheet, Text, View, Pressable, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Color, Padding, Height, FontFamily } from "../../GlobalStyles";

type RootStackParamList = {
  Onboarding1: undefined;
  Onboarding2: undefined;
  Onboarding3: undefined;
  Onboarding4: undefined;
  AuthLogin: undefined;
  AuthSignup: undefined;
};

const OnboardingScreen3 = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ImageBackground 
        source={require('../assets/images/onboard3.jpeg')}
        style={styles.imageBackground}
        resizeMode="cover"
      >
        {/* Back button */}
        <View style={styles.backButtonContainer}>
          <Pressable 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>

        {/* Bottom Content */}
        <View style={styles.bottomContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{`Connect &\nBe Inspired`}</Text>
            <Text style={styles.subtitle}>
              Find your vibe, get real-time experiences, and plan trips together.
            </Text>
          </View>

          {/* Progress dots */}
          <View style={styles.dotsContainer}>
            <View style={[styles.dot, styles.inactiveDot]} />
            <View style={[styles.dot, styles.inactiveDot]} />
            <View style={[styles.dot, styles.activeDot]} />
            <View style={[styles.dot, styles.inactiveDot]} />
          </View>

          {/* Navigation buttons */}
          <View style={styles.buttonRow}>
            <Pressable 
              onPress={() => navigation.navigate('Onboarding4')}
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>

            <Pressable
              style={styles.nextButton}
              onPress={() => navigation.navigate('Onboarding4')}
            >
              <Text style={styles.nextText}>Next</Text>
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
  backButtonContainer: {
    padding: Padding.padding_36,
    marginTop: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  backButtonText: {
    color: Color.colorWhite,
    fontSize: 16,
    fontFamily: FontFamily.poppinsSemiBold,
  },
  bottomContainer: {
    backgroundColor: Color.colorWhite,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: Padding.padding_36,
    paddingVertical: 40,
    minHeight: 320,
  },
  textContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: FontFamily.poppinsBold,
    color: Color.colorOrangered,
    marginBottom: 12,
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
  },
  skipText: {
    fontSize: 16,
    fontFamily: FontFamily.poppinsSemiBold,
    color: Color.colorDarkgray,
  },
  nextButton: {
    backgroundColor: Color.colorOrangered,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  nextText: {
    color: Color.colorWhite,
    fontSize: 15,
    fontFamily: FontFamily.poppinsMedium,
  },
});

export default OnboardingScreen3;
