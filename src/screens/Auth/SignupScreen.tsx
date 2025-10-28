import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../../utils/colors';
import { mockSignup } from '../../api/mockAuth';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store';

export default function SignupScreen({ navigation }: any) {
  const [email, setEmail] = useState('new@sanchari.app');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const onSignup = async () => {
    try {
      setLoading(true);
      const user = await mockSignup(email.trim(), password);
      dispatch(
        setUser({ id: user.uid, email: user.email, displayName: user.name, photoURL: user.photoURL })
      );
      navigation.replace('MainTabs');
    } catch (e: any) {
      Alert.alert('Signup failed', e?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <TouchableOpacity style={styles.btn} onPress={onSignup} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Creating…' : 'Sign up'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Back to login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.surface },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 32, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginVertical: 8 },
  btn: { backgroundColor: colors.primary, padding: 14, borderRadius: 12, marginTop: 16, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700' },
  link: { color: colors.mutedText, marginTop: 16, textAlign: 'center' },
});
