import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../utils/colors';

interface Props {
  label: string;
  progress?: number;
  status?: 'idle' | 'uploading' | 'uploaded' | 'error';
  onPress: () => void;
}

export default function VerificationUpload({ label, progress = 0, status = 'idle', onPress }: Props) {
  const icon = status === 'uploaded' ? 'checkmark-circle' : status === 'uploading' ? 'time' : status === 'error' ? 'alert-circle' : 'cloud-upload-outline';
  const iconColor = status === 'uploaded' ? colors.success : status === 'uploading' ? colors.warning : status === 'error' ? colors.danger : colors.primary;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.right}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFg, { width: `${progress}%` }]} />
        </View>
        <TouchableOpacity style={styles.btn} onPress={onPress}>
          <Icon name={icon} size={18} color={iconColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { flex: 1, color: colors.text, fontWeight: '600' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBg: { width: 140, height: 8, backgroundColor: '#EAEAEA', borderRadius: 6 }, // White Tertiary
  progressFg: { height: 8, backgroundColor: '#FF5C02', borderRadius: 6 }, // Brand Primary
  btn: { padding: 8 },
});




