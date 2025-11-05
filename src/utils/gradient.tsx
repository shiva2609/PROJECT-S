import React from 'react';
import LinearGradientLib from 'react-native-linear-gradient';

interface GradientProps {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: any;
  children?: React.ReactNode;
}

export const LinearGradient: React.FC<GradientProps> = ({ colors, start = { x: 0, y: 0 }, end = { x: 1, y: 0 }, style, children }) => {
  return (
    <LinearGradientLib
      colors={colors}
      start={start}
      end={end}
      style={style}
    >
      {children}
    </LinearGradientLib>
  );
};


