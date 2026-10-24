// Profile, AI model management and preferences. Profile and Enhanced Mode layout by Lea (leago9).

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CLOUD_ENDPOINT_URL } from '../config';
import { getOrCreateUserProfile, updateUserProfile } from '../db/queries';
import { isPipelineBusy } from '../services/GenerationPipeline';
import {
  isGenerationModelInstalled,
  isModelLoaded,
  unloadModel,
} from '../services/GenerationService';
import {
  cancelDownloadModel,
  deleteModel,
  downloadModel,
  getAvailableModels,
  getDownloadState,
  getStatus,
  importModel,
  pauseDownloadModel,
  type ModelDefinition,
  type ModelDownloadState,
  type ModelId,
} from '../services/ModelManager';
import { getPreferences, setPreference, type Preferences } from '../services/PreferencesService';
import { colors } from '../theme';
import { toMessage } from '../utils/errors';
import { formatBytes } from '../utils/format';

const MAX_NAME_LENGTH = 60;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface ModelRow {
  model: ModelDefinition;
  state: ModelDownloadState;
  sizeBytes: number | null;
}

/** Checks the profile fields. Returns an error message, or null when they are acceptable. */
function validateProfile(name: string, email: string): string | null {
  if (name.trim().length > MAX_NAME_LENGTH) {
    return `Keep the name under ${MAX_NAME_LENGTH} characters.`;
  }
  if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
    return 'Enter a valid email address, or leave it empty.';
  }
  return null;
}

const STATE_LABEL: Record<ModelDownloadState, string> = {
  available: 'Not installed',
  downloading: 'Downloading...',
  paused: 'Paused',
  installed: 'Installed',
};

export default function SettingsScreen() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const [userId, setUserId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileMessage, setProfileMessage] = useState<{ text: string; error: boolean } | null>(
    null,
  );

  const [rows, setRows] = useState<ModelRow[]>([]);
  const [otherFiles, setOtherFiles] = useState<{ name: string; sizeBytes: number | null }[]>([]);
  const [progress, setProgress] = useState<Partial<Record<ModelId, number>>>({});
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({
    enhancedMode: false,
    wifiOnlyDownloads: true,
  });
  const cloudAvailable = CLOUD_ENDPOINT_URL !== '';

  const loadModels = useCallback(async () => {
    const models = getAvailableModels();
    const [states, status] = await Promise.all([
      Promise.all(models.map((model) => getDownloadState(model.id))),
      getStatus(),
    ]);
    if (!mounted.current) return;
    const sizeOf = new Map(status.map((s) => [s.name, s.sizeBytes]));
    setRows(
      models.map((model, i) => ({
        model,
        state: states[i],
        sizeBytes: sizeOf.get(model.fileName) ?? null,
      })),
    );
    const known = new Set(models.map((m) => m.fileName));
    setOtherFiles(
      status
        .filter((s) => s.present && !known.has(s.name))
        .map((s) => ({ name: s.name, sizeBytes: s.sizeBytes })),
    );
  }, []);

  // Each part loads on its own, so one failure does not leave the rest of the screen dead.
  useFocusEffect(
    useCallback(() => {
      const report = (error: unknown) => {
        console.warn('[settings] load failed:', error);
        if (mounted.current) setNotice({ text: toMessage(error), error: true });
      };
      getOrCreateUserProfile()
        .then((profile) => {
          if (!mounted.current) return;
          setUserId(profile.UserID);
          setName(profile.Name ?? '');
          setEmail(profile.Email ?? '');
        })
        .catch(report);
      getPreferences()
        .then((prefs) => mounted.current && setPreferences(prefs))
        .catch(report);
      loadModels().catch(report);
    }, [loadModels]),
  );

  const saveProfile = async () => {
    const problem = validateProfile(name, email);
    if (problem) {
      setProfileMessage({ text: problem, error: true });
      return;
    }
    if (userId === null) {
      setProfileMessage({ text: 'Your profile has not loaded yet. Try again.', error: true });
      return;
    }
    try {
      const saved = await updateUserProfile(userId, {
        Name: name.trim() || null,
        Email: email.trim() || null,
      });
      setName(saved.Name ?? '');
      setEmail(saved.Email ?? '');
      setProfileMessage({ text: 'Profile saved.', error: false });
    } catch (error) {
      setProfileMessage({ text: toMessage(error), error: true });
    }
  };

  const changePreference = async <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const previous = preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: value }));
    try {
      await setPreference(key, value);
    } catch (error) {
      setPreferences((prev) => ({ ...prev, [key]: previous }));
      setNotice({ text: toMessage(error), error: true });
    }
  };

  const startDownload = async (model: ModelDefinition) => {
    setNotice(null);
    setProgress((prev) => ({ ...prev, [model.id]: 0 }));
    try {
      const done = await downloadModel(model.id, (fraction) => {
        if (mounted.current) setProgress((prev) => ({ ...prev, [model.id]: fraction }));
      });
      if (done && mounted.current) setNotice({ text: `${model.name} is ready.`, error: false });
    } catch (error) {
      if (mounted.current) setNotice({ text: toMessage(error), error: true });
    } finally {
      if (mounted.current) {
        setProgress((prev) => ({ ...prev, [model.id]: undefined }));
        await loadModels();
      }
    }
  };

  const runAction = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (error) {
      setNotice({ text: toMessage(error), error: true });
    }
    await loadModels().catch((error) => console.warn('[settings] reload failed:', error));
  };

  const confirmDelete = (model: ModelDefinition) => {
    Alert.alert(`Delete ${model.name}?`, 'You can download or import it again later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          runAction(async () => {
            if (isPipelineBusy()) {
              throw new Error('Wait for the current generation to finish before deleting a model.');
            }
            // Free the model from memory first so the file is not in use.
            if (model.role === 'generation' && isModelLoaded()) await unloadModel();
            await deleteModel(model.id);
            setNotice({ text: `${model.name} was deleted.`, error: false });
          }),
      },
    ]);
  };

  const importFile = () =>
    runAction(async () => {
      const path = await importModel();
      if (path) {
        setNotice({ text: `Model ready: ${path.split('/').pop()}`, error: false });
      }
    });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {notice && (
        <Text
          style={[styles.notice, notice.error ? styles.errorText : styles.successText]}
          accessibilityLiveRegion="polite"
        >
          {notice.text}
        </Text>
      )}

      <Text style={styles.heading}>Profile Information</Text>
      <View style={styles.box}>
        <Text style={styles.label}>First & Last Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setProfileMessage(null);
          }}
          placeholder="Your name"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Name"
        />
        <Text style={[styles.label, styles.gap]}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setProfileMessage(null);
          }}
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Email"
        />
        {profileMessage && (
          <Text style={profileMessage.error ? styles.errorText : styles.successText}>
            {profileMessage.text}
          </Text>
        )}
        <Pressable style={styles.button} onPress={saveProfile} accessibilityRole="button">
          <Text style={styles.buttonText}>Save profile</Text>
        </Pressable>
      </View>

      <Text style={styles.heading}>AI Models</Text>
      {!isGenerationModelInstalled() && (
        <Text style={styles.hint}>No AI model is installed. Download or import one below.</Text>
      )}
      {rows.map(({ model, state, sizeBytes }) => {
        const fraction = progress[model.id];
        const downloading = fraction !== undefined;
        return (
          <View key={model.id} style={styles.box}>
            <Text style={styles.modelName}>{model.name}</Text>
            <Text style={styles.hint}>
              {model.role === 'generation' ? 'Writes summaries and answers' : 'Searches your notes'}
              {'  |  '}
              {downloading ? `Downloading ${Math.round(fraction * 100)}%` : STATE_LABEL[state]}
              {state === 'installed' && sizeBytes ? ` (${formatBytes(sizeBytes)})` : ''}
            </Text>
            {downloading && (
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${Math.round(fraction * 100)}%` }]} />
              </View>
            )}
            <View style={styles.actions}>
              {(state === 'available' || state === 'paused') && !downloading && (
                <Pressable
                  style={styles.smallButton}
                  onPress={() => startDownload(model)}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>
                    {state === 'paused' ? 'Resume' : 'Download'}
                  </Text>
                </Pressable>
              )}
              {downloading && (
                <Pressable
                  style={styles.smallButton}
                  onPress={() => runAction(() => pauseDownloadModel(model.id))}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>Pause</Text>
                </Pressable>
              )}
              {(downloading || state === 'paused') && (
                <Pressable
                  style={styles.smallButton}
                  onPress={() => runAction(() => cancelDownloadModel(model.id))}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </Pressable>
              )}
              {state === 'installed' && !downloading && (
                <Pressable
                  style={styles.smallButton}
                  onPress={() => confirmDelete(model)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.buttonText, styles.errorText]}>Delete</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
      {otherFiles.map((file) => (
        <Text key={file.name} style={styles.hint}>
          Also installed: {file.name}
          {file.sizeBytes ? ` (${formatBytes(file.sizeBytes)})` : ''}
        </Text>
      ))}
      <Pressable style={styles.button} onPress={importFile} accessibilityRole="button">
        <Text style={styles.buttonText}>Import model (.gguf)</Text>
      </Pressable>

      <Text style={styles.heading}>App Preferences</Text>
      <View style={styles.box}>
        <View style={styles.prefRow}>
          <View style={styles.prefText}>
            <Text style={styles.modelName}>Download on Wi-Fi only</Text>
            <Text style={styles.hint}>Avoids using mobile data for large model files</Text>
          </View>
          <Switch
            value={preferences.wifiOnlyDownloads}
            onValueChange={(v) => changePreference('wifiOnlyDownloads', v)}
            trackColor={{ false: '#45464D', true: colors.accentDark }}
            thumbColor={preferences.wifiOnlyDownloads ? colors.accent : '#BDBDBD'}
            accessibilityLabel="Download on Wi-Fi only"
          />
        </View>
      </View>
      <View style={[styles.box, !cloudAvailable && styles.disabled]}>
        <View style={styles.prefRow}>
          <View style={styles.prefText}>
            <Text style={styles.modelName}>Enhanced Mode</Text>
            <Text style={styles.hint}>
              {cloudAvailable ? 'Allow internet-based features' : 'Cloud mode coming soon'}
            </Text>
          </View>
          <Switch
            value={cloudAvailable && preferences.enhancedMode}
            onValueChange={(v) => changePreference('enhancedMode', v)}
            disabled={!cloudAvailable}
            trackColor={{ false: '#45464D', true: colors.accentDark }}
            thumbColor={preferences.enhancedMode && cloudAvailable ? colors.accent : '#BDBDBD'}
            accessibilityLabel="Enhanced Mode"
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 48 },
  notice: { marginBottom: 12, fontSize: 14, textAlign: 'center' },
  heading: { color: colors.text, fontSize: 20, fontWeight: '500', marginTop: 20, marginBottom: 10 },
  box: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 12,
  },
  label: { color: colors.text, fontSize: 14, marginBottom: 6 },
  gap: { marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  button: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.accentDark,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
  },
  buttonText: { color: colors.text, fontSize: 15 },
  modelName: { color: colors.text, fontSize: 16, fontWeight: '500' },
  hint: { color: colors.text, opacity: 0.6, fontSize: 12, marginTop: 4 },
  track: { height: 6, borderRadius: 3, backgroundColor: '#45464D', marginTop: 10 },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  smallButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prefText: { flex: 1, paddingRight: 12 },
  disabled: { opacity: 0.5 },
  errorText: { color: colors.danger },
  successText: { color: colors.success },
});
