import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from "@react-native-community/blur";
import Icon from "react-native-vector-icons/Feather";
import {
  Color,
  Padding,
  Height,
  FontFamily,
} from "../../GlobalStyles";

type RootStackParamList = {
  Onboarding1: undefined;
  Onboarding2: undefined;
  Onboarding3: undefined;
  Onboarding4: undefined;
  AuthLogin: undefined;
  AuthSignup: undefined;
};

const OnboardingScreen1 = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Background Image */}
      <ImageBackground
        source={require("../assets/images/onboard1.jpeg")}
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
        
        {/* Overlay content at bottom */}
        <View style={styles.bottomContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{'Explore beyond\nthe maps'}</Text>
            <Text style={styles.subtitle}>
              Find places that inspire not just destinations.
            </Text>
          </View>

          {/* Progress dots */}
          <View style={styles.dotsContainer}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable onPress={() => navigation.navigate("Onboarding4")}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>

            <Pressable
              style={styles.nextButton}
              onPress={() => navigation.navigate("Onboarding2")}
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
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 0,
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

export default OnboardingScreen1;
