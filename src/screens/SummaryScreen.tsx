import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export default function SummaryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Summaries</Text>
      <View style={styles.summaryBox}>
        <ScrollView>
          <Text style={styles.summaryText}>Generated summaries appear here</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 24, backgroundColor: colors.bg },
  title: { fontSize: 28, fontWeight: '500', color: colors.text, marginTop: 10 },
  summaryBox: {
    flex: 1,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    marginBottom: 60,
    backgroundColor: colors.surface,
  },
  summaryText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
});
