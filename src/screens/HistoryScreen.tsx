import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.row}>
          <Text style={styles.text}>Name: </Text>
          <Text style={styles.text}>Animal Studies</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.text}>Date: </Text>
          <Text style={styles.text}>2026-10-01</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 24, backgroundColor: colors.bg },
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    borderColor: colors.accent,
    width: 320,
    height: 50,
    marginBottom: 5,
  },
  text: { color: colors.text, fontSize: 18, lineHeight: 24 },
});
