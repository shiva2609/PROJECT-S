module.exports = {
  root: true,
  extends: [
    '@react-native',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'react-native/no-inline-styles': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'firebase/auth',
            message: '❌ REGRESSION GUARD: Use src/core/firebase/compat instead of Web SDK.',
          },
          {
            name: 'firebase/firestore',
            message: '❌ REGRESSION GUARD: Use src/core/firebase/compat instead of Web SDK.',
          },
          {
            name: 'firebase/storage',
            message: '❌ REGRESSION GUARD: Use src/core/firebase/compat instead of Web SDK.',
          },
          {
            name: 'firebase/app',
            message: '❌ REGRESSION GUARD: Use src/core/firebase/compat instead of Web SDK.',
          },
          {
            name: '@react-native-firebase/auth',
            message: '❌ REGRESSION GUARD: Import "auth" from src/core/firebase instead of direct SDK usage.',
          },
        ],
        patterns: [
          {
            group: ['firebase/*'],
            message: '❌ REGRESSION GUARD: Do not use Firebase Web SDK. Use src/core/firebase/compat.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['src/core/firebase/*.ts', 'src/core/firebase/compat/*.ts', 'src/core/firebase/compat.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
  ignorePatterns: ['node_modules/', 'android/', 'ios/', '*.config.js'],
};
