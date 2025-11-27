/**
 * Multi-Select Dropdown Component
 * 
 * Inline expandable dropdown with search, multi-select, and chip display
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../../theme/fonts';
import { Colors } from '../../theme/colors';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}

export default function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onSelectionChange,
  placeholder = 'Select options',
  searchPlaceholder = 'Search...',
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    return options.filter((option) =>
      option.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      // Expand animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Collapse animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSearchQuery('');
      });
    }
  }, [isOpen, scaleAnim, opacityAnim]);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const toggleSelection = useCallback((value: string) => {
    if (selectedValues.includes(value)) {
      onSelectionChange(selectedValues.filter((v) => v !== value));
    } else {
      onSelectionChange([...selectedValues, value]);
    }
  }, [selectedValues, onSelectionChange]);

  const removeChip = useCallback((value: string) => {
    onSelectionChange(selectedValues.filter((v) => v !== value));
  }, [selectedValues, onSelectionChange]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <Pressable
        style={({ pressed }) => [
          styles.dropdownButton,
          isOpen && styles.dropdownButtonOpen,
          pressed && styles.dropdownButtonPressed,
        ]}
        onPress={toggleDropdown}
        android_ripple={{ color: Colors.white.secondary }}
      >
        {selectedValues.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContainer}
            nestedScrollEnabled
          >
            {selectedValues.map((value) => (
              <View key={value} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {value}
                </Text>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    removeChip(value);
                  }}
                  style={styles.chipRemove}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="close-circle" size={16} color={Colors.brand.primary} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
        <Animated.View
          style={{
            transform: [
              {
                rotate: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              },
            ],
          }}
        >
          <Icon name="chevron-down" size={20} color={Colors.black.qua} />
        </Animated.View>
      </Pressable>

      {isOpen && (
        <Animated.View
          style={[
            styles.dropdownContent,
            {
              opacity: opacityAnim,
              transform: [
                {
                  scaleY: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.dropdownInner}>
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color={Colors.black.qua} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={searchPlaceholder}
                placeholderTextColor={Colors.black.qua}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>

            {filteredOptions.length > 0 ? (
              <ScrollView
                style={styles.optionsList}
                contentContainerStyle={styles.optionsListContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator={true}
              >
                {filteredOptions.map((item) => {
                  const isSelected = selectedValues.includes(item);
                  return (
                    <Pressable
                      key={item}
                      style={({ pressed }) => [
                        styles.optionItem,
                        isSelected && styles.optionItemSelected,
                        pressed && styles.optionItemPressed,
                      ]}
                      onPress={() => toggleSelection(item)}
                      android_ripple={{ color: Colors.brand.accent }}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {item}
                      </Text>
                      {isSelected && (
                        <Icon name="checkmark-circle" size={20} color={Colors.brand.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No options found</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.black.primary,
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white.primary,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  dropdownButtonOpen: {
    borderColor: Colors.brand.primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownButtonPressed: {
    opacity: 0.7,
  },
  chipsScroll: {
    flex: 1,
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.accent,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    maxWidth: 150,
  },
  chipText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.brand.primary,
    flex: 1,
  },
  chipRemove: {
    marginLeft: -2,
  },
  placeholder: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    flex: 1,
  },
  dropdownContent: {
    overflow: 'hidden',
    backgroundColor: Colors.white.primary,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 300,
  },
  dropdownInner: {
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white.secondary,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    paddingVertical: 12,
  },
  optionsList: {
    maxHeight: 250,
  },
  optionsListContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: Colors.white.secondary,
    minHeight: 48,
  },
  optionItemSelected: {
    backgroundColor: Colors.brand.accent,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
  },
  optionItemPressed: {
    opacity: 0.7,
  },
  optionText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    flex: 1,
  },
  optionTextSelected: {
    fontFamily: Fonts.medium,
    color: Colors.brand.primary,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
});

