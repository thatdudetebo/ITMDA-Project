// The library: upload a PDF, pick the material to work on, and jump to a generate screen.
// Logo layout by Lea (leago9).

import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import ProgressOverlay from '../components/ProgressOverlay';
import TitleModal from '../components/TitleModal';
import { listGenerationHistory } from '../db/queries';
import type { RootDrawerParamList } from '../navigation/RootNavigator';
import {
  deleteMaterial,
  importDocument,
  pickDocument,
  renameMaterial,
  validateTitle,
  type ImportStage,
  type PickedDocument,
} from '../services/DocumentService';
import { isGenerationModelInstalled } from '../services/GenerationService';
import { useActiveMaterial } from '../state/ActiveMaterialContext';
import { colors } from '../theme';
import type { GenerationHistoryPreview, GenerationHistoryTask } from '../types/models';
import { toMessage } from '../utils/errors';
import { formatTimestamp, materialTitle } from '../utils/format';
import { SCREEN_FOR_TASK, TASK_BADGE } from '../utils/tasks';

type Navigation = DrawerNavigationProp<RootDrawerParamList>;

const STAGE_LABEL: Record<ImportStage, string> = {
  copying: 'Copying your PDF...',
  extracting: 'Reading the text...\nLong PDFs can take a minute.',
  saving: 'Saving...',
  chunking: 'Preparing your notes...',
};

/** "Mathematics.pdf" becomes "Mathematics", the suggested title for a new upload. */
function suggestTitle(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '');
}

export default function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const { material, materials, loaded, setActiveMaterial, refresh } = useActiveMaterial();

  const [history, setHistory] = useState<GenerationHistoryPreview[]>([]);
  const [modelInstalled, setModelInstalled] = useState(true);
  const [picked, setPicked] = useState<PickedDocument | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [stage, setStage] = useState<ImportStage | null>(null);
  // A ref, so a second tap in the same tick is stopped before React re-renders.
  const importing = useRef(false);

  // Reload whenever the screen is shown: a generation or delete elsewhere changes these.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setModelInstalled(isGenerationModelInstalled());
      refresh().catch((error) => console.warn('[home] refresh failed:', error));
      listGenerationHistory({ limit: 1000 })
        .then((rows) => !cancelled && setHistory(rows))
        .catch((error) => console.warn('[home] history failed:', error));
      return () => {
        cancelled = true;
      };
    }, [refresh]),
  );

  // Which tasks each material has, and its newest history row, built once per history change.
  const tasksByMaterial = useMemo(() => {
    const map = new Map<number, Set<GenerationHistoryTask>>();
    for (const row of history) {
      const tasks = map.get(row.MaterialID) ?? new Set<GenerationHistoryTask>();
      tasks.add(row.TaskType);
      map.set(row.MaterialID, tasks);
    }
    return map;
  }, [history]);
  const tasksFor = (materialId: number): GenerationHistoryTask[] =>
    (Object.keys(TASK_BADGE) as GenerationHistoryTask[]).filter((task) =>
      tasksByMaterial.get(materialId)?.has(task),
    );
  const lastItem = material ? history.find((h) => h.MaterialID === material.MaterialID) : undefined;

  const onUpload = async () => {
    if (stage) return;
    try {
      const doc = await pickDocument();
      if (doc) setPicked(doc);
    } catch (error) {
      Alert.alert('Could not open the file', toMessage(error));
    }
  };

  const onTitleChosen = async (title: string) => {
    const doc = picked;
    if (!doc || importing.current) return;
    importing.current = true;
    setPicked(null);
    setStage('copying');
    try {
      const created = await importDocument(doc, title, setStage);
      await refresh();
      await setActiveMaterial(created.MaterialID);
    } catch (error) {
      Alert.alert('Import failed', toMessage(error));
    } finally {
      importing.current = false;
      setStage(null);
    }
  };

  const onRenamed = async (title: string) => {
    const id = renaming;
    setRenaming(null);
    if (id === null) return;
    try {
      await renameMaterial(id, title);
      await refresh();
    } catch (error) {
      Alert.alert('Could not rename', toMessage(error));
    }
  };

  const confirmDelete = (id: number, title: string) => {
    Alert.alert(
      `Delete "${title}"?`,
      'This also deletes its flashcards, answers and history. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMaterial(id);
              if (material?.MaterialID === id) await setActiveMaterial(null);
              await refresh();
              setHistory(await listGenerationHistory({ limit: 1000 }));
            } catch (error) {
              Alert.alert('Could not delete', toMessage(error));
            }
          },
        },
      ],
    );
  };

  const onLongPress = (id: number, title: string) => {
    Alert.alert(title, undefined, [
      { text: 'Rename', onPress: () => setRenaming(id) },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(id, title) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renamingMaterial = materials.find((m) => m.MaterialID === renaming);

  const header = (
    <View>
      <Image
        source={require('../../assets/StudyBee2.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="StudyBee logo"
      />
      <Text style={styles.title}>My Library</Text>

      {!modelInstalled && (
        <Pressable
          style={styles.banner}
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
        >
          <Text style={styles.bannerText}>No AI model installed. Tap to open Settings.</Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.uploadBox, stage !== null && styles.disabled]}
        onPress={onUpload}
        disabled={stage !== null}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Upload Document</Text>
        <Text style={styles.hint}>Choose a PDF with selectable text</Text>
      </Pressable>

      {material && (
        <View style={styles.continueCard}>
          <Text style={styles.cardLabel}>Working on</Text>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {materialTitle(material)}
          </Text>
          {lastItem && (
            <Pressable
              onPress={() =>
                navigation.navigate(SCREEN_FOR_TASK[lastItem.TaskType], {
                  historyId: lastItem.HistoryID,
                })
              }
              accessibilityRole="button"
            >
              <Text style={styles.link}>
                Continue: {TASK_BADGE[lastItem.TaskType]} (
                {formatTimestamp(lastItem.GeneratedDate, true)})
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {(
        [
          ['Summary', 'Generate Summary', true],
          ['Flashcards', 'Generate Flashcards', false],
          ['Questions', 'Generate Q&A', false],
        ] as const
      ).map(([screen, label, primary]) => (
        <Pressable
          key={screen}
          style={[
            styles.actionButton,
            primary ? styles.primaryButton : styles.secondaryButton,
            !material && styles.disabled,
          ]}
          onPress={() => navigation.navigate(screen)}
          disabled={!material}
          accessibilityRole="button"
          accessibilityState={{ disabled: !material }}
        >
          <Text style={styles.buttonText}>{label}</Text>
        </Pressable>
      ))}
      {!material && (
        <Text style={styles.hint}>
          {loaded ? 'Upload or choose a material first.' : 'Loading your library...'}
        </Text>
      )}

      <Text style={styles.sectionTitle}>Your materials</Text>
      {materials.length > 0 && (
        <Text style={styles.hint}>Tap to select. Press and hold to rename or delete.</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={materials}
        keyExtractor={(item) => String(item.MaterialID)}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loaded ? (
            <Text style={styles.empty}>No materials yet. Upload a PDF to get started.</Text>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const title = materialTitle(item);
          const active = item.MaterialID === material?.MaterialID;
          const tasks = tasksFor(item.MaterialID);
          return (
            <Pressable
              style={[styles.row, active && styles.rowActive]}
              onPress={() => setActiveMaterial(item.MaterialID).catch((e) => console.warn(e))}
              onLongPress={() => onLongPress(item.MaterialID, title)}
              accessibilityRole="button"
              accessibilityLabel={`${title}${active ? ', selected' : ''}`}
            >
              <Text style={styles.rowTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.rowMeta}>
                {formatTimestamp(item.UploadDate, true)}
                {tasks.length > 0 ? `  |  ${tasks.map((t) => TASK_BADGE[t]).join(', ')}` : ''}
              </Text>
            </Pressable>
          );
        }}
      />

      <TitleModal
        visible={picked !== null}
        heading="Name this material"
        confirmLabel="Import"
        initialValue={picked ? suggestTitle(picked.name) : ''}
        validate={validateTitle}
        onSubmit={onTitleChosen}
        onCancel={() => setPicked(null)}
      />
      <TitleModal
        visible={renaming !== null}
        heading="Rename material"
        confirmLabel="Save"
        initialValue={renamingMaterial ? materialTitle(renamingMaterial) : ''}
        validate={validateTitle}
        onSubmit={onRenamed}
        onCancel={() => setRenaming(null)}
      />
      <ProgressOverlay visible={stage !== null} label={stage ? STAGE_LABEL[stage] : ''} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  logo: { width: 80, height: 60, alignSelf: 'center', marginTop: 12 },
  title: {
    fontSize: 28,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  banner: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: { color: colors.text, textAlign: 'center' },
  uploadBox: {
    height: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  buttonText: { color: colors.text, fontSize: 16 },
  hint: { color: colors.text, opacity: 0.6, fontSize: 13, textAlign: 'center', marginTop: 6 },
  disabled: { opacity: 0.4 },
  continueCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentDark,
  },
  cardLabel: { color: colors.text, opacity: 0.6, fontSize: 12 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '500', marginTop: 2 },
  link: { color: colors.accent, marginTop: 8, fontSize: 14 },
  actionButton: {
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  primaryButton: { backgroundColor: colors.accentDark },
  secondaryButton: { backgroundColor: colors.surface },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '500', marginTop: 28 },
  empty: { color: colors.text, opacity: 0.6, textAlign: 'center', marginTop: 16 },
  row: {
    marginTop: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  rowActive: { borderColor: colors.accent },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '500' },
  rowMeta: { color: colors.text, opacity: 0.6, fontSize: 12, marginTop: 4 },
});
