import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';

interface DrawerItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  isActive?: boolean;
}

export const DrawerItem: React.FC<DrawerItemProps> = ({
  icon,
  label,
  onPress,
  isActive = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.activeContainer]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isActive && <View style={styles.activeIndicator} />}
      <Icon
        name={icon}
        size={22}
        color={isActive ? Colors.brand.primary : Colors.black.qua}
        style={styles.icon}
      />
      <Text style={[styles.label, isActive && styles.activeLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 2,
    position: 'relative',
  },
  activeContainer: {
    backgroundColor: Colors.brand.primary + '08',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.brand.primary, // #FF5C02
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  icon: {
    width: 28,
    marginRight: 12,
  },
  label: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 15,
    color: Colors.black.secondary, // Neutral-900
  },
  activeLabel: {
    fontFamily: Fonts.semibold,
    color: Colors.brand.primary,
  },
});

