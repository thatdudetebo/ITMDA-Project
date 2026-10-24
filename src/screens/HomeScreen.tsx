import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { RootDrawerParamList } from '../navigation/RootNavigator';
import { colors } from '../theme';

export default function HomeScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const handleDocumentSelection = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!result.canceled) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert(
        'Could not open the file picker',
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Library</Text>

      <Pressable style={styles.uploadBox} onPress={handleDocumentSelection}>
        <Text style={styles.buttonText}>Upload Document</Text>
        {selectedFile && <Text style={styles.subtitle}>Selected File: {selectedFile.name}</Text>}
      </Pressable>

      <Pressable
        style={[styles.actionButton, styles.summary]}
        onPress={() => navigation.navigate('Summary')}
      >
        <Text style={styles.buttonText}>Generate Summary</Text>
      </Pressable>

      <Pressable
        style={[styles.actionButton, styles.secondaryButton]}
        onPress={() => navigation.navigate('Flashcards')}
      >
        <Text style={styles.buttonText}>Generate Flashcards</Text>
      </Pressable>

      <Pressable
        style={[styles.actionButton, styles.secondaryButton]}
        onPress={() => navigation.navigate('Questions')}
      >
        <Text style={styles.buttonText}>Generate Q&A's</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
    color: colors.text,
  },
  buttonText: { color: colors.text },
  uploadBox: {
    width: '80%',
    height: 220,
    alignSelf: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginTop: 40,
    padding: 15,
    backgroundColor: colors.surface,
  },
  actionButton: {
    width: '80%',
    height: 80,
    alignSelf: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginTop: 20,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
  },
  summary: {
    backgroundColor: colors.accentDark,
    marginTop: 40,
  },
});
