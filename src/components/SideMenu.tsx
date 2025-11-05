import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { BlurView } from '@react-native-community/blur';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  name: string;
  role: string;
  isAdmin: boolean;
}

export default function SideMenu({ visible, onClose, onNavigate, name, role, isAdmin }: SideMenuProps) {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Blurred background */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <BlurView blurType="light" blurAmount={12} style={StyleSheet.absoluteFill} reducedTransparencyFallbackColor={Colors.white.secondary} />
      </Pressable>

      {/* Sliding Menu */}
      <MotiView
        from={{ translateX: -width }}
        animate={{ translateX: 0 }}
        exit={{ translateX: -width }}
        transition={{ type: 'timing', duration: 320 }}
        style={styles.menuContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Icon name="person-circle-outline" size={58} color={Colors.brand.primary} />
          </View>
          <View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.role}>{role}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Navigation Links */}
        <View style={styles.menuItems}>
          <MenuItem icon="home-outline" label="Home" onPress={() => onNavigate('Home')} />
          <MenuItem icon="compass-outline" label="Explore" onPress={() => onNavigate('Explore')} />
          <MenuItem icon="book-outline" label="Bookings" onPress={() => onNavigate('Bookings')} />
          <MenuItem icon="person-outline" label="Profile" onPress={() => onNavigate('Profile')} />
          {isAdmin && <MenuItem icon="settings-outline" label="Dashboard" onPress={() => onNavigate('Dashboard')} />}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={styles.logoutBtn}>
            <Icon name="log-out-outline" size={20} color={Colors.white.primary} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>v1.0.0</Text>
        </View>
      </MotiView>
    </View>
  );
}

const MenuItem = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
  <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.menuItem}>
    <Icon name={icon} size={22} color={Colors.black.primary} style={{ width: 28 }} />
    <Text style={styles.menuLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  menuContainer: {
    width: width * 0.72,
    height: '100%',
    backgroundColor: Colors.white.primary,
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 2, height: 0 },
    shadowRadius: 12,
    elevation: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9CBAF',
  },
  name: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.black.primary },
  role: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.black.qua, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.white.tertiary, marginVertical: 18 },
  menuItems: { gap: 16, marginTop: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center' },
  menuLabel: { fontFamily: Fonts.medium, fontSize: 15, color: Colors.black.primary },
  footer: { position: 'absolute', bottom: 36, left: 20, right: 20 },
  logoutBtn: {
    backgroundColor: Colors.brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  logoutText: { color: Colors.white.primary, fontFamily: Fonts.semibold, fontSize: 14 },
  versionText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
    color: Colors.black.qua,
    fontFamily: Fonts.regular,
  },
});
