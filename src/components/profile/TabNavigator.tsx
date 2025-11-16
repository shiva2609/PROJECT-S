/**
 * Tab Navigator Component
 * 
 * Horizontal tab navigation with active/inactive states
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

export type TabType = 'posts' | 'bio' | 'memories' | 'references';

interface TabNavigatorProps {
  tabs: TabType[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function TabNavigator({ tabs, activeTab, onTabChange }: TabNavigatorProps) {
  const getTabLabel = (tab: TabType): string => {
    switch (tab) {
      case 'posts':
        return 'posts';
      case 'bio':
        return 'bio';
      case 'memories':
        return 'memories';
      case 'references':
        return 'references';
      default:
        return tab;
    }
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => onTabChange(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {getTabLabel(tab)}
            </Text>
            {isActive && <View style={styles.underline} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textTransform: 'lowercase',
  },
  tabTextActive: {
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.brand.primary,
  },
});

