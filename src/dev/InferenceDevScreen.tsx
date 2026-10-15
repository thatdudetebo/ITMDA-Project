import { Directory, Paths } from 'expo-file-system';
import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';

// HELPERS
function stripPath(path: string) {
  return path.replace(/^file:\/\//, '');
}

function formatBytes(size: number): string {
  const bytesPerMiB = 1_048_576;
  if (size >= bytesPerMiB) {
    return `${(size / bytesPerMiB).toFixed(2)}MiB`;
  }
  return `${size} Bytes`;
}
// END HELPERS

export default function InferenceDevScreen() {
  const [log, setLog] = useState<string[]>([]);

  function appendLog(message: string) {
    setLog((previous) => [...previous, message]);
  }

  function logStoragePaths() {
    // get the raw and cleaned dir uri for ADB
    const dir = Paths.document.uri;
    appendLog(`Full Dev ADB path: ${dir}`);
    appendLog(`ADB + llama.rn path: ${stripPath(dir)}`);
  }

  function logDirectoryContents() {
    // create a dir object and loop through its contents
    const pathFiles = new Directory(Paths.document);
    if (!pathFiles.exists) {
      appendLog(`Path not found. StudyBee filesystem missing or not found.`);
      return;
    }
    const contents = pathFiles.list();

    contents.forEach((item) => {
      if (item instanceof Directory) {
        appendLog(`DIR: ${item.name}`);
      } else {
        appendLog(`FILE: ${item.name} - ${formatBytes(item.size)}`);
      }
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inference Lab</Text>
      <Text style={styles.subtitle}>This is the dev screen for Inference</Text>
      <ScrollView style={styles.scrollView}>
        {log.map((message, index) => (
          <Text key={index}>{message}</Text>
        ))}
      </ScrollView>
      <View style={{ gap: 32 }}>
        <Button title="Click me" onPress={() => appendLog('hello')} />
        <Button title="Show path" onPress={logStoragePaths} />
        <Button title="Clear log" onPress={() => setLog([])} />
        <Button title="List files" onPress={logDirectoryContents} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    gap: 24,
  },
  title: { fontSize: 18, fontWeight: '500' },
  subtitle: { fontSize: 14, opacity: 0.6, marginTop: 8, textAlign: 'center' },
  scrollView: {
    flex: 1,
    alignSelf: 'stretch',
  },
});
