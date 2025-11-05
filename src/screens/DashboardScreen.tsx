import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../utils/colors';
import { AccountType, getAccountTypeMetadata } from '../types/account';
import { auth, db } from '../api/authService';
import { doc, getDoc } from 'firebase/firestore';

export default function DashboardScreen() {
  const [role, setRole] = useState<AccountType>('Traveler');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const u = auth.currentUser;
        if (!u) return setLoading(false);
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) setRole(((snap.data() as any).accountType || 'Traveler') as AccountType);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const meta = getAccountTypeMetadata(role);

  const Section = ({ title, children }: any) => (
    <View style={styles.section}> 
      <Text style={styles.sectionTitle}>{title}</Text>
      <View>{children}</View>
    </View>
  );

  const renderRole = () => {
    switch (role) {
      case 'Traveler':
        return (
          <>
            <Section title="Your Trips"> <Text style={styles.text}>View and manage your trips.</Text> </Section>
            <Section title="Memories Collected"> <Text style={styles.text}>Your posts and reels.</Text> </Section>
          </>
        );
      case 'Host':
        return <Section title="Trip Management"> <Text style={styles.text}>Packages, bookings, analytics.</Text> </Section>;
      case 'Agency':
        return <Section title="Agency Tools"> <Text style={styles.text}>Packages, clients, team.</Text> </Section>;
      case 'RideCreator':
        return <Section title="Mobility Services"> <Text style={styles.text}>Vehicles, rates, availability.</Text> </Section>;
      case 'StayHost':
        return <Section title="Homestays"> <Text style={styles.text}>Listings and calendar.</Text> </Section>;
      case 'EventOrganizer':
        return <Section title="Events"> <Text style={styles.text}>Listings and ticket sales.</Text> </Section>;
      case 'AdventurePro':
        return <Section title="Adventure"> <Text style={styles.text}>Courses and experiences.</Text> </Section>;
      case 'Creator':
        return <Section title="Creator Tools"> <Text style={styles.text}>Affiliate links and itineraries.</Text> </Section>;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.badge, { backgroundColor: meta.color }]}> 
          <Text style={styles.badgeText}>{meta.tag}</Text>
        </View>
        {renderRole()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 16 },
  badgeText: { color: 'white', fontWeight: '700' },
  section: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  sectionTitle: { color: colors.text, fontWeight: '700', marginBottom: 8 },
  text: { color: colors.text },
});




