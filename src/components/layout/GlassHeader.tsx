import React, { useState, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserAvatar from '../user/UserAvatar';

interface GlassHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: Array<{
    icon: string;
    onPress: () => void;
  }>;
  searchMode?: boolean;
  onSearchChange?: (text: string) => void;
  searchValue?: string;
  avatarUri?: string;
}

const GlassHeader = memo(({
  title,
  showBack = false,
  onBack,
  actions = [],
  searchMode = false,
  onSearchChange,
  searchValue = '',
  avatarUri,
}: GlassHeaderProps) => {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState(searchValue);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    onSearchChange?.(text);
  };

  const BlurComponent = Platform.OS === 'ios' ? BlurView : View;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BlurComponent
        style={StyleSheet.absoluteFill}
        blurType="light"
        blurAmount={10}
        reducedTransparencyFallbackColor={Colors.white.primary}
      />
      <View style={styles.content}>
        {showBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back" size={24} color={Colors.black.primary} />
          </TouchableOpacity>
        )}

        {searchMode ? (
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={Colors.black.qua} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor={Colors.black.qua}
              value={searchText}
              onChangeText={handleSearchChange}
              autoFocus
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearchChange('')}
                style={styles.clearButton}
              >
                <Icon name="close-circle" size={20} color={Colors.black.qua} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.titleContainer}>
            {avatarUri && (
              <View style={styles.avatarWrapper}>
                <UserAvatar uri={avatarUri} size="sm" />
              </View>
            )}
            <Text style={styles.title} numberOfLines={1}>
              {title || ''}
            </Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={action.onPress}
              style={styles.actionButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name={action.icon} size={24} color={Colors.black.primary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
});

export default GlassHeader;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white.secondary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 12,
    padding: 4,
  },
});

