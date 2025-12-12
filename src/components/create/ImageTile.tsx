import React, { memo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Fonts } from '../../theme/fonts';
import { Colors } from '../../theme/colors';

interface ImageTileProps {
  uri: string;
  id: string;
  isSelected: boolean;
  index: number;
  onPress: (id: string) => void;
  size: number;
}

const ImageTile = memo<ImageTileProps>(({ uri, id, isSelected, index, onPress, size }) => {
  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size }]}
      activeOpacity={0.9}
      onPress={() => onPress(id)}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      {isSelected && (
        <>
          <View style={styles.overlay} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{index}</Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.uri === nextProps.uri &&
    prevProps.id === nextProps.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.index === nextProps.index &&
    prevProps.size === nextProps.size
  );
});

ImageTile.displayName = 'ImageTile';

const styles = StyleSheet.create({
  container: {
    margin: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.white.tertiary,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.black.qua,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white.primary,
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.white.primary,
  },
});

export default ImageTile;

