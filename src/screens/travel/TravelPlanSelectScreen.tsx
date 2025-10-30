import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRAVEL_SELECT_DONE_KEY } from '../../utils/constants';

type TravelOption = {
  id: string;
  title: string;
  image?: any; // optional local require in future when PNGs are provided
};

// List of travel type images (URL-based demo, swap local require() in the future)
const TRAVEL_IMAGES: Record<string, string> = {
  adventure: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80', // mountain
  luxury: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80', // luxury hotel
  budget: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=400&q=80', // camping
  cultural: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80', // city/heritage
  family: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80', // family on beach
  business: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80', // airport/meeting
  romantic: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80', // couple sunset
  solo: 'https://images.unsplash.com/photo-1465101178521-c1a9136a03a4?auto=format&fit=crop&w=400&q=80', // solo traveler
};

const DEFAULT_OPTIONS: TravelOption[] = [
  { id: 'adventure', title: 'Adventure' },
  { id: 'luxury', title: 'Luxury' },
  { id: 'budget', title: 'Budget' },
  { id: 'cultural', title: 'Cultural' },
  { id: 'family', title: 'Family-friendly' },
  { id: 'business', title: 'Business Travel' },
  { id: 'romantic', title: 'Romantic' },
  { id: 'solo', title: 'Solo' },
];

export default function TravelPlanSelectScreen({ navigation }: any) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const data = useMemo(() => DEFAULT_OPTIONS, []);

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const renderItem = ({ item }: { item: TravelOption }) => {
    const isActive = !!selected[item.id];
    // Comment: replace TRAVEL_IMAGES[item.id] with your local require() later!
    const imgSrc = TRAVEL_IMAGES[item.id] || undefined;
    return (
      <TouchableOpacity
        style={[styles.card, isActive && styles.cardActive]}
        activeOpacity={0.85}
        onPress={() => toggle(item.id)}
      >
        <ImageBackground
          source={imgSrc ? { uri: imgSrc } : undefined}
          style={styles.cardImage}
          imageStyle={{ borderRadius: 18 }}
          resizeMode="cover"
        >
          {/* Overlay for dimming and for selection visual */}
          <View
            style={{
              ...styles.overlay,
              backgroundColor: isActive ? 'rgba(233,74,36,0.25)' : 'rgba(0,0,0,0.05)',
              borderRadius: 18,
            }}
          />
          <View style={styles.labelBar}>
            <Text style={styles.cardLabel}>{item.title}</Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerBadge} />
            <Text style={styles.title}>Choose your travel type</Text>
            <Text style={styles.subtitle}>Select your travel type for personalized recommendations!</Text>
          </View>
        }
        renderItem={renderItem}
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.nextBtn, selectedCount === 0 && styles.nextBtnDisabled]}
          disabled={selectedCount === 0}
          onPress={() => {
            navigation.replace('MainTabs');
          }}
        >
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const CARD_WIDTH = (Dimensions.get('window').width - 24 * 2 - 12) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  listContent: { paddingHorizontal: 24, paddingBottom: 120 },
  header: { paddingTop: 8, paddingBottom: 16 },
  headerBadge: {
    height: 6,
    width: 160,
    backgroundColor: '#FFD9C5',
    borderRadius: 8,
    marginBottom: 10,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 6 },
  subtitle: { color: colors.mutedText, fontSize: 13 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.95,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardActive: { borderColor: colors.primary, borderWidth: 2 },
  cardImage: { flex: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  cardPlaceholder: { backgroundColor: '#eef2f7' },
  cardLabelWrap: { padding: 10 },
  cardLabel: { color: '#fff', fontWeight: '700', fontSize: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.13 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  labelBar: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});


