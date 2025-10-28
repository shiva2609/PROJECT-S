import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { colors } from '../utils/colors';

export default function CreatePostScreen() {
  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();

  const pickImage = async () => {
    const res = await launchImageLibrary({ mediaType: 'photo' });
    const uri = res.assets?.[0]?.uri;
    if (uri) setImageUri(uri);
  };

  const onPost = async () => {
    Alert.alert('Post created', 'This is a demo. Wire to Firestore later.');
    setCaption('');
    setImageUri(undefined);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity style={styles.upload} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : (
          <Text style={styles.uploadText}>Pick an image</Text>
        )}
      </TouchableOpacity>
      <TextInput
        placeholder="Write a caption"
        style={styles.input}
        multiline
        value={caption}
        onChangeText={setCaption}
      />
      <TouchableOpacity style={styles.btn} onPress={onPost}>
        <Text style={styles.btnText}>Share</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  upload: {
    height: 220,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  uploadText: { color: colors.mutedText },
  preview: { width: '100%', height: '100%', borderRadius: 12 },
  input: { marginTop: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, minHeight: 100, backgroundColor: 'white' },
  btn: { backgroundColor: colors.primary, padding: 14, borderRadius: 12, marginTop: 16, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700' },
});
