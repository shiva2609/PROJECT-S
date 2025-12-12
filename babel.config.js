module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@/components': './src/components',
          '@/services': './src/services',
          '@/screens': './src/screens',
          '@/hooks': './src/hooks',
          '@/utils': './src/utils',
          '@/theme': './src/theme',
          '@/store': './src/store',
          '@/app': './src/app',
          '@/types': './src/types',
          '@/assets': './src/assets',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
