import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export default function QuestionsScreen() {
  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={[styles.card, styles.questionCard]}>
          <Text style={styles.cardText}>Question 1</Text>
        </View>
        <View style={[styles.card, styles.answerCard]}>
          <Text style={styles.cardText}>Answer 1</Text>
        </View>
        <View style={[styles.card, styles.questionCard]}>
          <Text style={styles.cardText}>Question 2</Text>
        </View>
        <View style={[styles.card, styles.answerCard]}>
          <Text style={styles.cardText}>Answer 2</Text>
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
  card: {
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: colors.surface,
    width: 320,
    height: 100,
    padding: 20,
  },
  questionCard: { marginBottom: 10 },
  answerCard: { marginBottom: 40 },
  cardText: { color: colors.text, fontSize: 18, lineHeight: 24 },
});
