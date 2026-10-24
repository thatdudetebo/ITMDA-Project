// Exam-style questions with answers for the active material, plus a box to ask your own question.

import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import AppButton from '../components/AppButton';
import NoMaterial from '../components/NoMaterial';
import { useGeneration } from '../hooks/useGeneration';
import { isEmbeddingModelInstalled } from '../services/EmbeddingService';
import { useSavedResults } from '../hooks/useSavedResults';
import type { RootDrawerParamList } from '../navigation/RootNavigator';
import { useActiveMaterial } from '../state/ActiveMaterialContext';
import { colors } from '../theme';
import { materialTitle } from '../utils/format';

const MAX_QUESTION_LENGTH = 300;

export default function QuestionsScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const route = useRoute<RouteProp<RootDrawerParamList, 'Questions'>>();
  const { material } = useActiveMaterial();
  const clearParam = () => navigation.setParams({ historyId: undefined });
  const historyId = route.params?.historyId;
  // Both kinds of result are opened from the same history parameter; each keeps its own. Each
  // hook reads the parameter synchronously when the screen gains focus, before either clears it.
  const qa = useSavedResults('questions', historyId, clearParam);
  const answer = useSavedResults('freeform', historyId, clearParam);
  const qaRun = useGeneration('questions');
  const askRun = useGeneration('freeform');

  const [question, setQuestion] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  if (!material) return <NoMaterial />;

  const busy = qaRun.busy || askRun.busy;
  const qaResult = qa.item?.Result.kind === 'question-answer' ? qa.item.Result : null;
  const answerResult = answer.item?.Result.kind === 'text' ? answer.item.Result : null;

  const onGenerate = async () => {
    const item = await qaRun.run();
    if (item) qa.show(item);
  };

  const onAsk = async () => {
    const text = question.trim();
    if (!text) {
      setInputError('Type a question first.');
      return;
    }
    setInputError(null);
    const item = await askRun.run(text);
    if (item) {
      answer.show(item);
      setQuestion('');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.material} numberOfLines={1}>
        {materialTitle(material)}
      </Text>

      <Text style={styles.heading}>Questions & answers</Text>
      <AppButton
        label={qaResult ? 'Generate new questions' : 'Generate questions'}
        onPress={onGenerate}
        loading={qaRun.busy}
        disabled={busy}
      />
      {qaRun.status === 'preparing' && (
        <Text style={styles.status} accessibilityLiveRegion="polite">
          Loading the AI model and reading your notes. This can take a minute.
        </Text>
      )}
      {qaRun.status === 'generating' && (
        <Text style={styles.status} accessibilityLiveRegion="polite">
          Writing your questions...
        </Text>
      )}
      {qaRun.error && <Text style={styles.error}>{qaRun.error}</Text>}
      {qaResult ? (
        qaResult.items.map((pair, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.cardLabel}>QUESTION {index + 1}</Text>
            <Text style={styles.cardText}>{pair.question}</Text>
            <Text style={[styles.cardLabel, styles.answerLabel]}>ANSWER</Text>
            <Text style={styles.cardText}>{pair.answer}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>
          {qa.loading ? 'Loading...' : 'No questions yet for this material.'}
        </Text>
      )}

      <Text style={[styles.heading, styles.section]}>Ask your material</Text>
      <TextInput
        style={styles.input}
        value={question}
        onChangeText={(value) => {
          setQuestion(value);
          setInputError(null);
        }}
        placeholder="What would you like to know?"
        placeholderTextColor={colors.muted}
        multiline
        maxLength={MAX_QUESTION_LENGTH}
        editable={!askRun.busy}
        accessibilityLabel="Your question"
      />
      {!isEmbeddingModelInstalled() && (
        <Text style={styles.hint}>
          The search model is not installed, so answers use a sample of your notes. Install it in
          Settings for better answers.
        </Text>
      )}
      {inputError && <Text style={styles.error}>{inputError}</Text>}
      <View style={styles.askRow}>
        <AppButton label="Ask" onPress={onAsk} loading={askRun.busy} disabled={busy} />
      </View>
      {askRun.status === 'preparing' && (
        <Text style={styles.status} accessibilityLiveRegion="polite">
          Searching your notes and loading the AI model...
        </Text>
      )}
      {askRun.status === 'generating' && (
        <Text style={styles.status} accessibilityLiveRegion="polite">
          Writing the answer...
        </Text>
      )}
      {askRun.error && <Text style={styles.error}>{askRun.error}</Text>}

      {askRun.busy && askRun.streamed ? (
        <View style={styles.card}>
          <Text style={styles.cardText}>{askRun.streamed}</Text>
        </View>
      ) : (
        answerResult &&
        answer.item && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>YOU ASKED</Text>
            <Text style={styles.cardText} selectable>
              {answer.item.Prompt}
            </Text>
            <Text style={[styles.cardLabel, styles.answerLabel]}>ANSWER</Text>
            <Text style={styles.cardText} selectable>
              {answerResult.text}
            </Text>
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 48 },
  material: { color: colors.text, fontSize: 20, fontWeight: '500', marginBottom: 12 },
  heading: { color: colors.text, fontSize: 18, fontWeight: '500', marginBottom: 10 },
  section: { marginTop: 32 },
  status: { color: colors.text, opacity: 0.7, marginTop: 10, fontSize: 13 },
  error: { color: colors.danger, marginTop: 10, fontSize: 14 },
  hint: { color: colors.text, opacity: 0.6, fontSize: 12, marginTop: 8 },
  empty: { color: colors.text, opacity: 0.6, marginTop: 14, fontSize: 15 },
  card: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 14,
    marginTop: 12,
  },
  cardLabel: { color: colors.accent, fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  answerLabel: { marginTop: 10 },
  cardText: { color: colors.text, fontSize: 16, lineHeight: 22 },
  input: {
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 10,
    color: colors.text,
    backgroundColor: colors.surface,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  askRow: { marginTop: 12 },
});
