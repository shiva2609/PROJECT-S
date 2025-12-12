import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { MotiView, MotiText } from 'moti';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface Props {
  selectedTab: string;
  onChange: (tab: string) => void;
  tabs?: string[];
}

export default function SegmentedControl({ selectedTab, onChange, tabs = ['For You', 'Following'] }: Props) {
  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const isActive = selectedTab === tab;

        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={styles.tabWrapper}
          >
            <MotiView
              animate={{
                scale: isActive ? 1.02 : 1,
              }}
              transition={{ type: 'timing', duration: 300 }}
              style={[
                styles.tab,
                isActive && styles.activeTab,
                index === 0
                  ? { borderTopLeftRadius: 20, borderBottomLeftRadius: 20 }
                  : { borderTopRightRadius: 20, borderBottomRightRadius: 20 },
              ]}
            >
              {isActive && (
                <LinearGradient
                  colors={[Colors.brand.primary, Colors.brand.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  borderRadius={20}
                />
              )}
              <MotiText
                animate={{
                  color: isActive ? Colors.white.primary : Colors.black.primary,
                }}
                transition={{ type: 'timing', duration: 300 }}
                style={styles.tabText}
              >
                {tab}
              </MotiText>
            </MotiView>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white.primary,
    borderRadius: 16,
    padding: 2,
    alignSelf: 'center',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
    minWidth: 200,
  },
  tabWrapper: {
    flex: 1,
  },
  tab: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  activeTab: {
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    zIndex: 1,
  },
});

