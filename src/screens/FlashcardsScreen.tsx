// Generates flashcard decks for the active material and lets the user study them.
// Tap a card to flip it, then mark it "Again" or "Got it". Mastery is saved per card.

import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import AppButton from '../components/AppButton';
import NoMaterial from '../components/NoMaterial';
import {
  deleteRevisionDeck,
  listFlashcards,
  listRevisionDecks,
  updateFlashcardMastery,
} from '../db/queries';
import { useGeneration } from '../hooks/useGeneration';
import { useSavedResults } from '../hooks/useSavedResults';
import type { RootDrawerParamList } from '../navigation/RootNavigator';
import { useActiveMaterial } from '../state/ActiveMaterialContext';
import { colors } from '../theme';
import type { Flashcard, RevisionDeck } from '../types/models';
import { toMessage } from '../utils/errors';
import { materialTitle } from '../utils/format';

/** A card on screen. Cards from History after their deck was deleted have no CardID. */
interface ShownCard extends Pick<Flashcard, 'Question' | 'Answer' | 'MasteryLevel'> {
  CardID?: number;
}

const AGAIN = 0;
const GOT_IT = 1;

/** "Flashcards - 2026-10-24 11:43:07" becomes "2026-10-24 11:43:07", unique for each deck. */
function deckLabel(deck: RevisionDeck): string {
  return deck.DeckName.replace(/^Flashcards - /, '');
}

export default function FlashcardsScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const route = useRoute<RouteProp<RootDrawerParamList, 'Flashcards'>>();
  const { material } = useActiveMaterial();
  const saved = useSavedResults('flashcards', route.params?.historyId, () =>
    navigation.setParams({ historyId: undefined }),
  );
  const generation = useGeneration('flashcards');

  const [loadedDecks, setLoadedDecks] = useState<{
    materialId: number;
    decks: RevisionDeck[];
  } | null>(null);
  const [chosenDeckId, setChosenDeckId] = useState<number | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  const materialId = material?.MaterialID ?? null;
  // Decks only count once they were loaded for the material on screen, so a stale list from
  // another material (or none yet) is never mistaken for "this deck was deleted".
  const decksReady = loadedDecks !== null && loadedDecks.materialId === materialId;
  const decks = useMemo(() => (decksReady ? loadedDecks.decks : []), [decksReady, loadedDecks]);

  const loadDecks = useCallback(async () => {
    if (materialId === null) {
      setLoadedDecks(null);
      return;
    }
    try {
      const found = await listRevisionDecks(materialId);
      setLoadedDecks({ materialId, decks: found });
      setMessage(null);
    } catch (error) {
      setMessage(toMessage(error));
    }
  }, [materialId]);

  // Reload on every visit, and forget the manual deck choice when leaving.
  useFocusEffect(
    useCallback(() => {
      loadDecks();
      return () => setChosenDeckId(null);
    }, [loadDecks]),
  );

  // An opened or just generated result wins over an earlier manual choice.
  useEffect(() => {
    if (saved.pinned) setChosenDeckId(null);
  }, [saved.item?.HistoryID, saved.pinned]);

  const savedResult = saved.item?.Result.kind === 'flashcards' ? saved.item.Result : null;
  // An opened or just generated result shows its own deck. If that deck is gone it must not be
  // replaced by some other deck, so it falls through to the read-only view below.
  const deck =
    decks.find((d) => d.DeckID === chosenDeckId) ??
    (saved.pinned && savedResult
      ? (decks.find((d) => d.DeckName === savedResult.deckName) ?? null)
      : (decks[0] ?? null));
  // The deck an opened history row came from may have been deleted: show its saved cards.
  const readOnly = decksReady && !deck && saved.pinned && savedResult !== null;
  const deckId = deck?.DeckID ?? null;

  useEffect(() => {
    let cancelled = false;
    setFlipped(new Set());
    // Drop the previous deck's cards straight away so they never sit under the new deck's name.
    setCards([]);
    if (deckId === null) return;
    listFlashcards(deckId)
      .then((rows) => !cancelled && setCards(rows))
      .catch((error) => !cancelled && setMessage(toMessage(error)));
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  const shownCards: ShownCard[] =
    readOnly && savedResult
      ? savedResult.cards.map((c) => ({ Question: c.question, Answer: c.answer, MasteryLevel: 0 }))
      : cards;
  const mastered = cards.filter((c) => c.MasteryLevel >= GOT_IT).length;

  const onGenerate = async () => {
    setMessage(null);
    const item = await generation.run();
    if (!item) return;
    // Load the new deck first, so it can be found by name when the result is shown.
    await loadDecks();
    setChosenDeckId(null);
    saved.show(item);
  };

  const toggle = (index: number) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const mark = async (cardId: number, level: number) => {
    try {
      await updateFlashcardMastery(cardId, level);
      setCards((prev) =>
        prev.map((c) => (c.CardID === cardId ? { ...c, MasteryLevel: level } : c)),
      );
    } catch (error) {
      setMessage(toMessage(error));
    }
  };

  const confirmDeleteDeck = () => {
    if (!deck) return;
    Alert.alert(`Delete "${deckLabel(deck)}"?`, 'The deck and its cards will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRevisionDeck(deck.DeckID);
            saved.hide();
            setChosenDeckId(null);
            await loadDecks();
            await saved.reload();
          } catch (error) {
            setMessage(toMessage(error));
          }
        },
      },
    ]);
  };

  if (!material) return <NoMaterial />;

  const error = generation.error ?? message;

  return (
    <View style={styles.container}>
      <Text style={styles.material} numberOfLines={1}>
        {materialTitle(material)}
      </Text>
      <AppButton
        label={decks.length > 0 ? 'Generate a new deck' : 'Generate flashcards'}
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
          Writing your flashcards...
        </Text>
      )}
      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}

      {decks.length > 1 && (
        <FlatList
          horizontal
          data={decks}
          keyExtractor={(d) => String(d.DeckID)}
          style={styles.chips}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.chip, item.DeckID === deckId && styles.chipActive]}
              onPress={() => setChosenDeckId(item.DeckID)}
              accessibilityRole="button"
              accessibilityLabel={`Deck ${deckLabel(item)}${item.DeckID === deckId ? ', selected' : ''}`}
            >
              <Text style={styles.chipText}>{deckLabel(item)}</Text>
            </Pressable>
          )}
        />
      )}

      {deck && (
        <View style={styles.deckBar}>
          <Text style={styles.progress}>
            Mastered {mastered} of {cards.length}
          </Text>
          <Pressable onPress={confirmDeleteDeck} accessibilityRole="button">
            <Text style={styles.deleteText}>Delete deck</Text>
          </Pressable>
        </View>
      )}
      {readOnly && (
        <Text style={styles.status}>
          This deck was deleted. Showing the cards saved in your history.
        </Text>
      )}

      <FlatList
        data={shownCards}
        keyExtractor={(card, index) => String(card.CardID ?? `saved-${index}`)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {generation.busy ? '' : 'No flashcards yet for this material. Tap Generate flashcards.'}
          </Text>
        }
        renderItem={({ item: card, index }) => {
          const showAnswer = flipped.has(index);
          const cardId = readOnly ? undefined : card.CardID;
          return (
            <View style={[styles.card, card.MasteryLevel >= GOT_IT && styles.cardMastered]}>
              <Pressable
                onPress={() => toggle(index)}
                accessibilityRole="button"
                accessibilityLabel={`${showAnswer ? 'Answer' : 'Question'}: ${showAnswer ? card.Answer : card.Question}. Tap to flip.`}
              >
                <Text style={styles.cardLabel}>{showAnswer ? 'ANSWER' : 'QUESTION'}</Text>
                <Text style={styles.cardText}>{showAnswer ? card.Answer : card.Question}</Text>
                <Text style={styles.flipHint}>
                  {card.MasteryLevel >= GOT_IT ? 'Mastered  |  ' : ''}Tap to flip
                </Text>
              </Pressable>
              {showAnswer && cardId !== undefined && (
                <View style={styles.markRow}>
                  <Pressable
                    style={styles.markButton}
                    onPress={() => mark(cardId, AGAIN)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.markText}>Again</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.markButton, styles.gotIt]}
                    onPress={() => mark(cardId, GOT_IT)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.markText}>Got it</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.bg },
  material: { color: colors.text, fontSize: 20, fontWeight: '500', marginBottom: 12 },
  status: { color: colors.text, opacity: 0.7, marginTop: 10, fontSize: 13 },
  error: { color: colors.danger, marginTop: 10, fontSize: 14 },
  chips: { flexGrow: 0, marginTop: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.muted,
    marginRight: 8,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.surface },
  chipText: { color: colors.text, fontSize: 13 },
  deckBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  progress: { color: colors.text, fontSize: 14 },
  deleteText: { color: colors.danger, fontSize: 14 },
  list: { flex: 1, marginTop: 8 },
  listContent: { paddingBottom: 24 },
  empty: { color: colors.text, opacity: 0.6, fontSize: 15, marginTop: 16 },
  card: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    backgroundColor: colors.surface,
  },
  cardMastered: { borderColor: colors.success },
  cardLabel: { color: colors.accent, fontSize: 11, letterSpacing: 1, marginBottom: 6 },
  cardText: { color: colors.text, fontSize: 18, lineHeight: 24 },
  flipHint: { color: colors.text, opacity: 0.5, fontSize: 12, marginTop: 10 },
  markRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  markButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.muted,
    alignItems: 'center',
  },
  gotIt: { borderColor: colors.success },
  markText: { color: colors.text, fontSize: 15 },
});
