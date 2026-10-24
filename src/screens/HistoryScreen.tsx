// Everything generated so far, grouped by material. Tap a row to reopen it, press and hold to
// delete it.

import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import {
  deleteGenerationHistory,
  getGenerationHistoryItem,
  listGenerationHistory,
} from '../db/queries';
import type { RootDrawerParamList } from '../navigation/RootNavigator';
import { useActiveMaterial } from '../state/ActiveMaterialContext';
import { colors } from '../theme';
import type { GenerationHistoryPreview } from '../types/models';
import { toMessage } from '../utils/errors';
import { formatTimestamp } from '../utils/format';
import { SCREEN_FOR_TASK, TASK_BADGE } from '../utils/tasks';

const PAGE_SIZE = 50;

interface Section {
  materialId: number;
  title: string;
  data: GenerationHistoryPreview[];
}

/** Groups rows by material, keeping the order in which each material first appears. */
function groupByMaterial(rows: GenerationHistoryPreview[]): Section[] {
  const sections = new Map<number, Section>();
  for (const row of rows) {
    const section = sections.get(row.MaterialID) ?? {
      materialId: row.MaterialID,
      title: row.MaterialName,
      data: [],
    };
    section.data.push(row);
    sections.set(row.MaterialID, section);
  }
  return [...sections.values()];
}

export default function HistoryScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const { setActiveMaterial } = useActiveMaterial();
  const [rows, setRows] = useState<GenerationHistoryPreview[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The newest request wins, so a slow first page cannot overwrite a faster later one.
  const request = useRef(0);

  const loadPage = useCallback(async (offset: number) => {
    const id = ++request.current;
    setError(null);
    try {
      const page = await listGenerationHistory({ limit: PAGE_SIZE, offset });
      if (id !== request.current) return;
      setRows((prev) => (offset === 0 ? page : [...prev, ...page]));
      setHasMore(page.length === PAGE_SIZE);
    } catch (e) {
      if (id === request.current) setError(toMessage(e));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPage(0);
    }, [loadPage]),
  );

  const sections = useMemo(() => groupByMaterial(rows), [rows]);

  const open = async (row: GenerationHistoryPreview) => {
    try {
      const item = await getGenerationHistoryItem(row.HistoryID);
      if (!item) {
        Alert.alert('Not found', 'That item was deleted.');
        await loadPage(0);
        return;
      }
      await setActiveMaterial(item.MaterialID);
      navigation.navigate(SCREEN_FOR_TASK[item.TaskType], { historyId: item.HistoryID });
    } catch (e) {
      Alert.alert('Could not open this item', toMessage(e));
    }
  };

  const confirmDelete = (row: GenerationHistoryPreview) => {
    Alert.alert(`Delete this ${TASK_BADGE[row.TaskType].toLowerCase()}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGenerationHistory(row.HistoryID);
            setRows((prev) => prev.filter((r) => r.HistoryID !== row.HistoryID));
          } catch (e) {
            Alert.alert('Could not delete', toMessage(e));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <SectionList
        sections={sections}
        keyExtractor={(row) => String(row.HistoryID)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          loading ? null : (
            <Text style={styles.empty}>
              Nothing here yet. Generate a summary, flashcards or questions and they will appear
              here.
            </Text>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <Pressable
              style={styles.more}
              onPress={() => loadPage(rows.length)}
              accessibilityRole="button"
            >
              <Text style={styles.moreText}>Load more</Text>
            </Pressable>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle} numberOfLines={1}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => open(item)}
            onLongPress={() => confirmDelete(item)}
            accessibilityRole="button"
            accessibilityLabel={`${describe(item)}, ${formatTimestamp(item.GeneratedDate)}. Press and hold to delete.`}
          >
            <Text style={styles.rowTitle}>{TASK_BADGE[item.TaskType]}</Text>
            {item.TaskType === 'freeform' && (
              <Text style={styles.rowPrompt} numberOfLines={2}>
                {item.Prompt}
              </Text>
            )}
            <Text style={styles.rowDate}>{formatTimestamp(item.GeneratedDate)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function describe(row: GenerationHistoryPreview): string {
  return `${row.MaterialName}: ${TASK_BADGE[row.TaskType]}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 48 },
  error: { color: colors.danger, padding: 24, paddingBottom: 0 },
  empty: { color: colors.text, opacity: 0.6, textAlign: 'center', marginTop: 40, fontSize: 15 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '500', marginTop: 20 },
  row: {
    marginTop: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '500' },
  rowPrompt: { color: colors.text, opacity: 0.8, fontSize: 14, marginTop: 4 },
  rowDate: { color: colors.text, opacity: 0.5, fontSize: 12, marginTop: 6 },
  more: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  moreText: { color: colors.text, fontSize: 15 },
});
