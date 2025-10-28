import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors } from '../utils/colors';

const DUMMY_TRIPS = [
  { id: 'in-t1', title: 'Golden Triangle • Delhi–Agra–Jaipur', startDate: '2025-11-10' },
  { id: 'in-t2', title: 'Kerala Backwaters • Kochi–Alleppey–Munnar', startDate: '2026-01-20' },
  { id: 'in-t3', title: 'Himalayan Escape • Shimla–Manali', startDate: '2026-03-05' },
];

export default function TripsScreen() {
  const [trips, setTrips] = useState(DUMMY_TRIPS);

  useEffect(() => {
    setTrips(DUMMY_TRIPS);
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.sub}>Start: {item.startDate}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  title: { fontWeight: '700', color: colors.text },
  sub: { marginTop: 6, color: colors.mutedText },
});
