// A small popup that asks for a text value (a material title) and validates it.
// Alert.prompt only works on iOS, so this is a Modal with a TextInput.

import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../theme';
import { toMessage } from '../utils/errors';

interface Props {
  visible: boolean;
  heading: string;
  confirmLabel: string;
  initialValue: string;
  /** Throws an Error with a readable message if the text is not acceptable. */
  validate: (text: string) => string;
  onSubmit: (cleanText: string) => void;
  onCancel: () => void;
}

export default function TitleModal({
  visible,
  heading,
  confirmLabel,
  initialValue,
  validate,
  onSubmit,
  onCancel,
}: Props) {
  const [text, setText] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  // Start from the suggested value each time the popup opens.
  useEffect(() => {
    if (visible) {
      setText(initialValue);
      setError(null);
    }
    // initialValue is read when the popup opens. Reacting to later changes would blank the
    // field while the popup is fading out.
  }, [visible]);

  const submit = () => {
    try {
      onSubmit(validate(text));
    } catch (e) {
      setError(toMessage(e));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.heading}>{heading}</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={(value) => {
              setText(value);
              setError(null);
            }}
            onSubmitEditing={submit}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            placeholder="Title"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Title"
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.row}>
            <Pressable style={styles.button} onPress={onCancel} accessibilityRole="button">
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.primary]}
              onPress={submit}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, styles.primaryText]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: 20,
  },
  heading: { color: colors.text, fontSize: 18, fontWeight: '500', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  error: { color: colors.danger, marginTop: 8, fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  primary: { backgroundColor: colors.accentDark },
  buttonText: { color: colors.text, fontSize: 15 },
  primaryText: { fontWeight: '500' },
});
