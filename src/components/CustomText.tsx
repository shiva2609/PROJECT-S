import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { FontFamily } from '../GlobalStyles';

interface CustomTextProps extends TextProps {
  weight?: 'regular' | 'medium' | 'semiBold' | 'bold';
}

const CustomText: React.FC<CustomTextProps> = ({ 
  style, 
  weight = 'regular',
  ...props 
}) => {
  const getFontFamily = () => {
    switch (weight) {
      case 'bold':
        return FontFamily.poppinsBold;
      case 'semiBold':
        return FontFamily.poppinsSemiBold;
      case 'medium':
        return FontFamily.poppinsMedium;
      case 'regular':
      default:
        return FontFamily.poppinsRegular;
    }
  };

  return (
    <Text 
      style={[styles.text, { fontFamily: getFontFamily() }, style]} 
      {...props} 
    />
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: FontFamily.poppinsRegular,
  },
});

export default CustomText;






