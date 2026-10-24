// The standard button used by the feature screens.

import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export default function AppButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
}: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      style={[styles.button, styles[variant], inactive && styles.inactive]}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={loading ? 'Working' : label}
      accessibilityState={loading ? { disabled: true, busy: true } : { disabled: inactive }}
    >
      {/* A text label instead of a spinner: an animation redraws every frame while the model runs. */}
      <Text style={[styles.label, variant === 'danger' && styles.dangerLabel]}>
        {loading ? 'Working...' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: { backgroundColor: colors.accentDark, borderColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderColor: colors.accent },
  danger: { backgroundColor: colors.surface, borderColor: colors.danger },
  inactive: { opacity: 0.4 },
  label: { color: colors.text, fontSize: 16 },
  dangerLabel: { color: colors.danger },
});
