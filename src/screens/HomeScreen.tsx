import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Library</Text>
      <Text style={styles.subtitle}>Upload a document to get started</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 18, fontWeight: '500' },
  subtitle: { fontSize: 14, opacity: 0.6, marginTop: 8, textAlign: 'center' },
});
