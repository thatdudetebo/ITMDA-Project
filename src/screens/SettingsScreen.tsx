import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Enhanced Mode and model management</Text>
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
  subtitle: { fontSize: 14, opacity: 0.6, marginTop: 8, textAlign: 'center', color: colors.text },
});
