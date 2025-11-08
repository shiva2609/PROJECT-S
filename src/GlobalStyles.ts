/* -----------------------------
 🌍 Global Styles for Sanchari App
--------------------------------- */

/* 🎨 Brand Colors - Sanchari Brand v2 Orange Core System */
export const Color = {
  // Brand palette - Orange Core System
  colorOrangered: "#FF5C02", // Brand Primary - Base Brand Orange
  colorTeal: "#FF5C02CC", // Brand Secondary - 80% Opacity

  // Neutrals - Black Series
  colorWhite: "#FFFFFF", // White Primary
  colorWhitesmoke: "#F5F5F5", // White Secondary
  colorGainsboro: "#EAEAEA", // White Tertiary
  colorDarkgray: "#4D4D4D", // Black Qua
  colorGray100: "#3C3C3C", // Black Tertiary
  colorGray200: "#2D2D2D", // Black Secondary
  colorGray300: "#1A1A1A", // Black Primary

  // Semantic feedback colors - Accent Series
  colorSuccess: "#43A047", // Accent Green (Success)
  colorWarning: "#FFB300", // Accent Amber Yellow (Warning)
  colorError: "#E53935", // Accent Red (Error)
};

/* 🧱 Font Families */
export const FontFamily = {
  poppinsBold: "Poppins-Bold",
  poppinsSemiBold: "Poppins-SemiBold",
  poppinsMedium: "Poppins-Medium",
  poppinsRegular: "Poppins-Regular",
  poppinsExtraBold: "Poppins-ExtraBold",
};

/* 📏 Font Sizes */
export const FontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
};

/* 📐 Spacing (Padding & Margins) */
export const Padding = {
  padding_8: 8,
  padding_12: 12,
  padding_16: 16,
  padding_24: 24,
  padding_36: 36,
};

export const Margin = {
  margin_8: 8,
  margin_12: 12,
  margin_16: 16,
  margin_24: 24,
  margin_36: 36,
};

/* 📏 Heights, Widths, and Radii */
export const Height = {
  height_5: 5,
  height_10: 10,
  height_20: 20,
};

export const Radius = {
  radius_sm: 8,
  radius_md: 16,
  radius_lg: 24,
  radius_xl: 40,
};

/* 💡 Shadows */
export const Shadow = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
};
