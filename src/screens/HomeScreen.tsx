import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { colors } from '../utils/colors';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, setPosts } from '../store';

const DUMMY_FEED = [
  { id: 'in-1', userId: 'u1', caption: 'Taj Mahal at sunrise • Agra, India', mediaUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=1200', createdAt: Date.now() },
  { id: 'in-2', userId: 'u2', caption: 'Houseboats in Alleppey • Kerala Backwaters', mediaUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200', createdAt: Date.now() - 10000 },
  { id: 'in-3', userId: 'u3', caption: 'Jaipur Pink City • Hawa Mahal', mediaUrl: 'https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?w=1200', createdAt: Date.now() - 20000 },
  { id: 'in-4', userId: 'u4', caption: 'Goa beaches • Arabian Sea vibes', mediaUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200', createdAt: Date.now() - 30000 },
];

export default function HomeScreen() {
  const dispatch = useDispatch();
  const posts = useSelector((s: RootState) => s.posts.items);

  useEffect(() => {
    dispatch(setPosts(DUMMY_FEED as any));
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.mediaUrl ? <Image source={{ uri: item.mediaUrl }} style={styles.image} /> : null}
            <Text style={styles.caption}>{item.caption}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  card: { backgroundColor: 'white', borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  image: { width: '100%', height: 220 },
  caption: { padding: 12, color: colors.text },
});
