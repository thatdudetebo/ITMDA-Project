import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export default function FlashcardsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Flashcards</Text>
      <ScrollView style={styles.cardList}>
        <View style={styles.flashcard}>
          <Text style={styles.cardText}>Flashcard 1</Text>
        </View>
        <View style={styles.flashcard}>
          <Text style={styles.cardText}>Flashcard 2</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.bg,
  },
  title: { fontSize: 28, fontWeight: '500', color: colors.text },
  cardList: { flex: 1, width: '100%' },
  flashcard: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    marginTop: 20,
    height: 150,
    backgroundColor: colors.surface,
  },
  cardText: { color: colors.text, lineHeight: 24, fontWeight: '500', fontSize: 18 },
});
