// A full-screen "working" indicator with a short message, shown during long tasks.

import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

interface Props {
  visible: boolean;
  label: string;
}

export default function ProgressOverlay({ visible, label }: Props) {
  return (
    // No onRequestClose: the task cannot be cancelled once started.
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => undefined}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.label} accessibilityLiveRegion="polite">
            {label}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 220,
  },
  label: { color: colors.text, fontSize: 15, marginTop: 14, textAlign: 'center' },
});
