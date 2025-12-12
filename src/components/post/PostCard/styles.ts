/**
 * PostCard shared styles
 * Can be used for consistent styling across PostCard components
 */

import { StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

export const postCardStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white.primary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.white.tertiary,
  },
});

