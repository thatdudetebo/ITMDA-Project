import { StyleSheet, Text, View } from 'react-native';

export default function QuestionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Questions & answers</Text>
      <Text style={styles.subtitle}>Ask a question about your material</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: '500' },
  subtitle: { fontSize: 14, opacity: 0.6, marginTop: 8, textAlign: 'center' },
});
