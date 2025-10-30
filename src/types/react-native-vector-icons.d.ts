declare module 'react-native-vector-icons/Ionicons' {
  import { ComponentType } from 'react';
  import { TextProps } from 'react-native';
  const Ionicons: ComponentType<{ name: string; size?: number; color?: string } & TextProps>;
  export default Ionicons;
}


