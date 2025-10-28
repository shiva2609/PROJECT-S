import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { colors } from '../utils/colors';
import { DUMMY } from '../utils/constants';

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const data = DUMMY.destinations.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={styles.container}>
      <TextInput placeholder="Search destinations" style={styles.search} value={query} onChangeText={setQuery} />
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.sub}>Tap to explore</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  search: { margin: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  title: { fontWeight: '700', color: colors.text },
  sub: { marginTop: 6, color: colors.mutedText },
});
