// Generates a summary of the active material and shows the newest saved one.

import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import AppButton from '../components/AppButton';
import NoMaterial from '../components/NoMaterial';
import { useGeneration } from '../hooks/useGeneration';
import { useSavedResults } from '../hooks/useSavedResults';
import type { RootDrawerParamList } from '../navigation/RootNavigator';
import { useActiveMaterial } from '../state/ActiveMaterialContext';
import { colors } from '../theme';
import { formatTimestamp, materialTitle } from '../utils/format';

export default function SummaryScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const route = useRoute<RouteProp<RootDrawerParamList, 'Summary'>>();
  const { material } = useActiveMaterial();
  const saved = useSavedResults('summary', route.params?.historyId, () =>
    navigation.setParams({ historyId: undefined }),
  );
  const generation = useGeneration('summary');

  if (!material) return <NoMaterial />;

  const result = saved.item?.Result;
  const savedText = result?.kind === 'text' ? result.text : '';
  const text = generation.busy && generation.streamed ? generation.streamed : savedText;

  const onGenerate = async () => {
    const item = await generation.run();
    if (item) saved.show(item);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.material} numberOfLines={1}>
        {materialTitle(material)}
      </Text>
      <AppButton
        label={saved.item ? 'Generate a new summary' : 'Generate summary'}
        onPress={onGenerate}
        loading={generation.busy}
      />
      {generation.status === 'preparing' && (
        <Text style={styles.status} accessibilityLiveRegion="polite">
          Loading the AI model and reading your notes. This can take a minute.
        </Text>
      )}
      {generation.status === 'generating' && (
        <Text style={styles.status} accessibilityLiveRegion="polite">
          Writing your summary...
        </Text>
      )}
      {generation.error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {generation.error}
        </Text>
      )}

      <View style={styles.summaryBox}>
        <ScrollView>
          {text ? (
            <Text style={styles.summaryText} selectable>
              {text}
            </Text>
          ) : (
            <Text style={styles.empty}>
              {generation.busy
                ? 'Your summary will appear here.'
                : saved.loading
                  ? 'Loading...'
                  : 'No summary yet for this material. Tap Generate summary.'}
            </Text>
          )}
        </ScrollView>
      </View>
      {saved.item && !generation.busy && (
        <Text style={styles.meta}>Generated {formatTimestamp(saved.item.GeneratedDate)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.bg },
  material: { color: colors.text, fontSize: 20, fontWeight: '500', marginBottom: 12 },
  status: { color: colors.text, opacity: 0.7, marginTop: 10, fontSize: 13 },
  error: { color: colors.danger, marginTop: 10, fontSize: 14 },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    backgroundColor: colors.surface,
  },
  summaryText: { color: colors.text, fontSize: 16, lineHeight: 24 },
  empty: { color: colors.text, opacity: 0.6, fontSize: 15 },
  meta: { color: colors.text, opacity: 0.5, fontSize: 12, marginTop: 8, textAlign: 'center' },
});
