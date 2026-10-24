# Coding log

History of each phase handoff, in order. Source plan: [`build-and-fix-plan.md`](build-and-fix-plan.md).
Branches are stacked locally (each starts from the previous phase), and PRs merge to `main` in order.

---

## Handoff 1: Phase 1, inference cleanup (`feature/inference`)

**Date:** 2026-10-23
**Commit message used:** `feat(inference): fix model path, add output parser and prod cleanup`

### Result

Typecheck green, prettier clean on changed files, 19 isolated tests passing, `/code-review medium` run and 7 of 10 findings fixed.

### What changed

- `GenerationService.ts`: loads from `files/models/`, prefers Llama and falls back to any installed generation model. `releaseAllLlama` removed (B1, B3). Concurrent loads share one load promise. `unloadModel` is a no-op when nothing is loaded and throws while generating. New `isGenerationModelInstalled()`.
- `config.ts`: Llama restored as `GENERATION_MODEL` (B2).
- `PromptBuilder.ts`: `flashcards` and `questions` ask for `Q:` / `A:` output (B4). An oversized first chunk is truncated instead of leaving the notes empty. Free-form text counts against the notes budget. Debug logs removed. `estimateTokens` exported.
- New `OutputParser.ts`: `parseQAPairs` (B5).
- New `ChunkSampler.ts`: `sampleChunks`, evenly spaced and in reading order, binary search for the count.
- `src/utils/paths.ts`: `stripPath` now decodes percent-encoding.
- Deleted `src/dev/` and the duplicate root `build-and-fix-plan.md`. `RootNavigator.tsx` restored from merge base `6d69a53`. `src/utils/` is now tracked (B17).

### Verified

- Isolated node tests: parser (clean, numbered one-line, bold, rambling, trailing Q, multi-line, empty answer, "A:" inside an answer, "A-level" continuation, duplicate "A:", lowercase inline, "Option A:" in a question) and sampler (1, 5, 40 and 2000 uneven chunks, order, budget).
- Emulator (arm64, SmolLM2): fallback load from `files/models/`, double load, concurrent load (loaded once), generate, unload and reload, double unload, and the "No AI model installed" error.

### Review findings left alone

- Cloud fallback hides the real cloud error: out of scope while `CLOUD_ENDPOINT_URL` is empty.
- Navigator diff note: already restored from the merge base.
- `toMessage` and `formatBytes` unused: wired in Phase 6.

### Not done / deferred

- **B13 token check** (`tokens_evaluated + 600 < 4096` on a full prompt): the Inference Lab was removed before it was measured. Do it with real Llama in Phase 6 or 7.
- `GenerationPipeline.ts` held back until the history queries from PR #2 are merged in (added after the UI fixes merge).

### Next

`git switch -c feature/ui-fixes origin/main`, then Phase 5 (UI fixes).

---

## Handoff 2: Phase 5, UI fixes (`feature/ui-fixes`, branched from `origin/main` 9eed139)

**Date:** 2026-10-24
**Commit message to use:** `fix(ui): resolve screen type errors and add shared theme`
(credit Lea in the body; `origin/main` was red on typecheck with 13 errors from PR #3)

### Result

Typecheck green (13 errors to 0), `format:check` green, `/code-review medium` run, 4 of 10 findings fixed.

### What changed

- New `src/theme.ts` with the shared palette (`bg`, `surface`, `accent`, `accentDark`, `text`), used by all six screens.
- `HomeScreen.tsx`: `DrawerNavigationProp<RootDrawerParamList>` typing, `DocumentPickerAsset` instead of the removed `DocumentResult`, numeric margins and padding, duplicate `borderColor: '#'` removed, buttons centred with `alignSelf`. Each whole box is now the `Pressable` (the tap target used to be the text only). A picker failure shows an `Alert` instead of failing silently (B14).
- `SummaryScreen.tsx`: `fontsize` to `fontSize`, stray `color` removed from the container.
- `SettingsScreen.tsx`: unused styles removed. No extra title, because the drawer header already says "Settings".
- `QuestionsScreen.tsx`, `FlashcardsScreen.tsx`, `HistoryScreen.tsx`: theme colours, unused styles removed, style keys renamed (`flashcards` to `flashcard`, `cardie` to `cardText`).
- `RootNavigator.tsx`: commented-out junk removed, `History` screen spacing fixed.
- Repo-wide `npm run format` (the only phase where this is allowed).

### Intentional visual differences from Lea's mock-ups

These fix invalid values, so the old layout was never what she intended: summary text 14px to 16px (`fontsize` typo), upload box now has its real 15px padding and 40px top margin, the Summary button has its accent border (the duplicate `'#'` key used to override it), buttons centred instead of `marginLeft: '11%'`, History label spacing `'Name:  '` to `'Name: '`.

### Verified on the emulator

- Home renders in the dark theme.
- Home to Summary and Home to Flashcards navigation works, including tapping the empty corner of a button.
- Summary and Flashcards render in the dark theme.
- No JS errors in logcat.

### Not verified

- **Drawer.** _(Resolved in Phase 6a: the drawer works. The earlier miss was animation timing; its items show in the UI hierarchy and on screen.)_
- Questions, History and Settings screens were not seen rendered. They are covered by typecheck only.
- The emulator needed a cold restart (Pixel Launcher and System UI ANRs) before testing.

### Review findings left alone

- Theme holds colours only: spacing and title styles are still repeated. Phase 6 rewrites these screens.
- History uses hard-coded placeholder data and a fixed row size: replaced in Phase 6.

### Deliverable 4 requirements from the assignment guide (now in `docs/`)

Read from "ITMDA3-34 Assignment Guide.pdf", Deliverable 4 (50 marks: system design 15, prototype development 20, prototype integration 15). These change the Phase 6 scope:

1. **At least two complete modules, each with create, read, update AND delete.** Today the storage layer has no update for materials and no delete for decks, cards or history. Plan for Phase 6: rename a material's title (update), delete a deck, delete a history entry. This needs small additions to `queries.ts` (no schema change), and @thatdudetebo should be told.
2. **User identity logic**, even without login. `getOrCreateUserProfile()` covers the minimum. A name field in Settings would make it visible.
3. **UI feedback**: success and failure messages, loading indicators and input validation (the title modal must reject an empty title).
4. **Code quality**: remove unused code and redundant files before submission, consistent style, comments on important logic.
5. A local database satisfies "backend integration". The cloud endpoint is not required.

### Next

You commit and push `feature/ui-fixes` and open PR #4, then `git switch feature/inference && git merge feature/ui-fixes`.

---

## Handoff 3: Phase 1 completion, generation pipeline (`feature/inference`, after merging `feature/ui-fixes`)

**Date:** 2026-10-24
**Commit message to use:** `feat(inference): add generation pipeline`

### Result

Typecheck and `format:check` green. 21 stubbed pipeline tests and the 19 earlier parser and sampler tests pass. `/code-review medium` run, 6 of 10 findings fixed.

### What changed

- New `src/services/GenerationPipeline.ts`: `generateForMaterial(materialId, task, userText?, onToken?)`, `isPipelineBusy()`, `TASK_LABEL`. It is the only function screens call to generate.
  - Context: free-form questions call `retrieve()`, and any retrieval failure or empty result falls back to `sampleChunks` with a warning. Every other task samples chunks across the document and ignores typed text. Blank chunks are filtered, and zero chunks throws "This material has no readable text."
  - Result: summary and free-form are saved as text. Questions and flashcards go through `parseQAPairs`, and zero pairs throws "Couldn't read the AI's answer. Please try again."
  - Flashcards create a deck named `Flashcards - YYYY-MM-DD HH:MM:SS` and its cards. If the card insert or the history insert fails, the new deck is deleted so a retry does not pile up empty decks.
  - One lock: `isPipelineBusy()` is true while the pipeline or the router is busy, and a second call is rejected.
- `src/db/queries.ts` (teammate-owned, 5 lines added): `deleteRevisionDeck(deckId)`. Cards go with it through the cascade. It is also the delete half of CRUD for decks that Deliverable 4 requires. **Tell @thatdudetebo.**

### Verified

Tests ran against stubbed `queries`, `InferenceRouter` and `RetrievalService`: every task's result shape, the two parse-failure errors, empty summary, zero and blank chunks, retrieval success, retrieval error and empty fallbacks, deck cleanup on card failure and on history failure, no deletion for non-flashcard failures, typed text ignored outside free-form, the shared busy lock, and `onToken` forwarding.

### Not verified / known limits

- **Not run against the real SQLite database.** The queries are the teammate's, and the first real run is the Phase 6 emulator flow.
- Streamed text can show on screen before a parse failure throws. The Phase 6 `useGeneration` hook must clear the streamed text when it shows the error.
- One parsed pair is accepted as a full deck, with no minimum count.
- The history result stores the deck name but not its ID, because the history result type is fixed by the storage code.
- A `dispatch` that never settles would hold the lock until the app restarts (no cancel path).
- `CramSummary` is not written (history stores summaries in full). Revisit if the Deliverable 3 ERD requires it.

### Next

Push `feature/inference` and open PR #5, then `git switch feature/ingestion && git merge feature/inference` (a fast-forward) and start Phase 3.

---

## Repo standing check (2026-10-24, after PRs #6 and #7 merged)

Checked on GitHub (Chrome and `gh`, read-only) and by test-merging into a scratch clone, so the working repo was untouched.

### State of `main` (31f0da3)

- Contains our work: PR #6 (`feature/ui-fixes`) and PR #7 (`feature/inference`, including the pipeline). Typecheck is green on `main`.
- **PR numbers differ from the original plan.** #4 and #5 belong to teammates. The stacked-branch plan collapsed because #6 and #7 merged straight away, so new work now branches from `main`.

### Open PRs from teammates

- **#4 `feature/ingestion` by unanneR, "added PDF ingestion and chunk storage" (1 commit, +136/-9).** Real implementation of `DocumentService`, `ChunkingService` and the README owner line. Merges cleanly into `main` and typechecks green. Gaps against the plan:
  - `importDocument()` opens the picker itself, takes no title (`ModuleCode` is always null) and throws on cancel. The title popup needs `pickDocument()` then `importDocument(doc, title, onProgress)`.
  - Chunks are 380 words with 38 overlap. That matches the 512 and 50 token targets approximately, but there is no character cap, so a chunk of long words can be much larger than 2048 characters.
  - Never run on a device (the author's typecheck was red from older UI errors).
  - Strengths: extracts before copying (a scanned PDF leaves no file behind), rolls back the row and the file if chunking fails, `deleteMaterial` also removes the stored file.
- **#5 `feature/ui-screens` by leago9, "Update settings and document upload UI" (2 commits).** Adds a logo and a Settings layout (profile box with placeholder "John Doe", Enhanced Mode switch with local state only). Based on the old `ae0f16b`, so it **conflicts with `main` in HomeScreen, SettingsScreen and SummaryScreen** and would undo the theme, the tap-target fix and the picker error alert from PR #6.

### Local repo

`git branch --show-current` reported `feature/ingestion` at the old scaffold commit `ca043a0`, not `feature/inference`. That local branch has diverged from the remote `feature/ingestion` (b04479f, unanneR's work).

---

## Handoff 4: Phase 3, ingestion (`feature/ingestion`, from `main` 31f0da3)

**Date:** 2026-10-24
**Commit message to use:** `feat(ingestion): add PDF import and text chunking`
Written from scratch by the team. The earlier external PR #4 was closed and none of its code was used.

### Result

Typecheck and `format:check` green. 39 isolated tests pass and the real PDF extractor ran on the emulator. `/code-review medium` run, 7 of 10 findings fixed.

### What changed

- `ChunkingService.ts`: `chunkText` normalises whitespace, then cuts windows of `CHUNK_SIZE_TOKENS * 4` (2048) characters with `CHUNK_OVERLAP_TOKENS * 4` (200) characters of overlap. Cuts prefer a sentence end or newline in the second half of the window, then whitespace in the second half, then a hard cut. It never splits a surrogate pair, always moves forward, starts chunks on a word boundary when one exists, and keeps the overlap for text with no spaces. `chunkAndStore` throws "This document has no readable text." for empty text.
- `DocumentService.ts`:
  - `pickDocument()` returns a `PickedDocument` or null on cancel. It accepts a PDF by MIME type or extension and deletes a rejected file's cache copy.
  - `importDocument(doc, title, onProgress)` validates the title (required, at most 80 characters), copies the PDF to `files/materials/<timestamp>-<random>-<name>.pdf`, extracts text, creates the `StudyMaterial` with the title in `ModuleCode`, then chunks. Stages reported: `copying`, `extracting`, `saving`, `chunking`. On any failure the row and the copy are removed. On success the picker's temporary cache copy is deleted. On failure it is kept so the user can retry.
  - `extractText` gives friendly errors for scanned PDFs, password-protected PDFs (by error code or message) and corrupt PDFs.
  - `listMaterials()` and `deleteMaterial()` (row via cascade, plus the stored PDF).
- `src/utils/paths.ts`: `toSafeFileStem`.

### Bug found on the device that the stubbed tests could not have caught

`File.copy` in expo-file-system is **async** (`copySync` is the sync version), but the typings do not flag a missing `await`. Without it, extraction started before the copy finished (`ENOENT` and an empty-file read). Fixed with `await`. The test fake now mirrors the real behaviour, and the suite fails 11 tests if the `await` is removed. `delete`, `create` and `exists` are sync.

### Verified

- Isolated tests (39): chunker (empty, 100 chars, 10k chars, 5000-char word, 100k-char word, 2 MB speed, sentence boundaries, word starts, normalisation, no-space overlap, astral characters, no tiny chunks) and `DocumentService` (cancel, non-PDF, extensionless PDF, stage order, title rules, scanned, password, corrupt, extractor missing, chunk failure, row failure, missing source, cleanup failure not hiding the real error, unique names, cache copy handling, list, delete).
- Emulator, real extractor, generated PDFs: empty title rejected; image-only PDF gives the friendly error and leaves no stored file or row; a 5986-character text PDF becomes 4 chunks (2048, 2028, 1995, 553 characters) with the right title; second import works; delete removes the row and file; stored files match rows; the successful import's cache copy was removed and the failed one kept.

### Not verified / known limits

- The system file picker UI was not driven (the emulator is hard to drive). The picker returns cache URIs, which the code treats generically, and Phase 6 exercises it.
- A real scanned PDF made of page images was not tested; the image-only test file is a hand-made PDF with no text objects.
- The emulator database holds leftover test rows ("Biology" and others) from these runs.
- `.` followed by a space is treated as a sentence end, so abbreviations like "e.g. " can end a chunk early. Cosmetic.
- Review findings left alone: the `file://` URI passes straight to the extractor (worked on device); title stored in `ModuleCode` (deliberate, no schema change); `deleteMaterial` finds the row by listing (small lists); non-ASCII file names are reduced to a safe stem plus a unique suffix.

### Next

Phase 4 (retrieval). After you commit: `git switch feature/retrieval && git merge feature/ingestion` (a fast-forward).

---

## Handoff 5: Phase 4, retrieval (`feature/retrieval`, from `feature/ingestion`)

**Date:** 2026-10-24
**Commit message to use:** `feat(retrieval): add on-device embeddings and cosine retrieval`

### Result

Typecheck and `format:check` green. All four isolated suites pass with zero failures (45 retrieval, 20 parser and sampler, 21 pipeline, 39 ingestion). `/code-review medium` run, 4 of 9 findings fixed. **On-device check with the real bge model: done, see below.**

### What changed

- New `VectorMath.ts` (pure): `normalise`, `cosineSimilarity` (throws on a length mismatch, 0 for a zero vector), `toBlob` (always copies) and `fromBlob` (copies into an aligned buffer, rejects partial floats). This is the fix for B9: SQLite can return a BLOB view whose offset is not a multiple of 4.
- `EmbeddingService.ts`:
  - Its own llama.rn context (`embedding: true`, `n_ctx`, `n_batch` and `n_ubatch` all 512) loaded from `files/models/` and checked for 384 dimensions, then L2-normalised.
  - `withEmbeddingModel(work)` runs work one caller at a time, loads the model, and always releases it afterwards. Two embedding contexts can never exist at once.
  - `embedPendingChunks` embeds only chunks with no usable vector, saves each one as it goes (so an interrupted run resumes), and returns all chunks so retrieval reads the table once. A blank chunk gets an all-zero vector so it is never retried. A token-dense chunk that overflows the model is retried once with shorter text, and a failure that persists is reported (it means a model problem).
  - Input is cut to 1800 characters (never mid emoji). `isEmbeddingModelInstalled()` is exported for Settings.
- `RetrievalService.ts`: `retrieve(query, materialId)` embeds missing chunks, embeds the query, scores by cosine similarity, takes the top `TOP_K` (5), re-sorts by `ChunkIndex`, logs the scores, and frees the embedding model before returning. `cosineSimilarity` is re-exported.
- `GenerationPipeline.ts` is unchanged: it already calls `retrieve(question, materialId)` and falls back to sampled chunks on any error or an empty result.

### Verified

Isolated tests against a fake llama.rn context (word-hash embeddings) and an in-memory chunk table that stores vectors as odd-offset views like SQLite. They cover:

- cosine similarity, normalisation and blob round trips;
- model lifecycle, including release after failure and a failure not breaking the queue;
- resume after a partial failure;
- stored vectors reused, so a second question embeds only the query;
- the 5 returned really are the 5 best, in reading order;
- chunks of other materials are never touched;
- four concurrent calls peak at one live context.

### Verified on the emulator with the real model

The user supplied `bge-small-en-v1.5-q8_0.gguf` (36.8 MB, valid GGUF, BERT architecture with pooling metadata). It was copied to `files/models/`. A generated 6-page, 5-topic PDF ("Mixed") was imported through `importDocument` (8 chunks).

- The model loaded, returned 384 dimensions, and the pooling setting in the GGUF worked (no override needed).
- **All 6 topic probes ranked the correct chunk first**, with a clear gap: Calvin cycle 0.72 (next 0.62), Bastille 0.66 (0.52), Newton's third law 0.78 (0.72), INNER JOIN 0.76 (0.59), earthquakes at a fault 0.73 (next 0.72, same topic), subduction volcanoes 0.80 (0.79, same topic).
- The first question embedded all 8 chunks in 6.7 s on the emulator; later questions took about 0.2 s (the vectors are reused, most of that is the 150 to 180 ms model load). These are emulator numbers and must not be quoted as performance figures.
- **The real pipeline wrote to the real database for the first time**: free-form and summary results were saved and listed in history. The free-form call used the retrieved chunks.
- Process memory went from about 486 MB to 756 MB PSS with both models loaded and used. No crash.
- The embedding context was loaded and released on every call (log shows a fresh load each time).

### Found and fixed during the device test

- `parseQAPairs` kept a leading "1." in question text after a "Question:" marker ("Question: 1. What is ..."). It is now stripped (new test).

### Not verified / known limits

- **Flashcards and Q&A quality is unproven.** The only generation model on the emulator is SmolLM2-135M, a development stand-in. It ignored the `Q:` / `A:` format for flashcards (it chatted instead), parsed 4 pairs for one Q&A run, and failed to parse another. A worked example added to the prompts did not help it (it copied the notes and even the example question), so the prompts were reverted to the reviewed versions. **Llama 3.2 1B on a real phone is the real test (Phase 7).** If parsing fails often there, add one automatic retry in the pipeline, or a "Try again" button (the error already says "Please try again").
- No query instruction prefix is added (optional for bge v1.5). Revisit if retrieval looks weak.
- The generation model stays loaded while the embedding model runs. The embedding model is about 36 MB, and the locks stop concurrent work, but out-of-memory behaviour must be checked on a real phone in Phase 7.
- **First free-form question on a large material embeds every chunk before answering** (no progress callback). The Phase 6 screen must show a "Searching your notes" indicator. Embedding at import time is an option.
- Vectors carry no model tag. Changing `EMBEDDING_MODEL` to another 384-dimension model needs the stored vectors cleared (a schema change was out of scope).

### Next

If the device check passes: commit, push, PR, then Phase 6 (wiring) on `feature/wiring`.

---

## Handoff 6a: Phase 6, library, upload flow and Settings (`feature/wiring`, from `main` after PR #9)

**Date:** 2026-10-24
**Commit to make** (the logo, the profile box and the Enhanced Mode layout come from Lea, so she is credited as co-author):

```
git add src assets App.tsx
git commit -m "feat(wiring): add library, upload flow and settings" \
  -m "Ports the logo, profile box and Enhanced Mode layout from the closed PR #5." \
  -m "Co-authored-by: leago9 <162553886+leago9@users.noreply.github.com>"
```

### Result

Typecheck and `format:check` green. 136 isolated tests pass (20 parser and sampler, 21 pipeline, 43 ingestion, 45 retrieval, 7 active-material). `/code-review medium` run, 7 of 10 findings fixed. Verified on the emulator through the real UI (driven by `uiautomator` hierarchy dumps).

### What changed

- **Storage (`queries.ts`, teammate-owned, no schema change):** `getStudyMaterial`, `updateStudyMaterialTitle`, `deleteGenerationHistory`, `updateUserProfile`, and the history SELECTs now show `COALESCE(ModuleCode, FileName)` so History lists the user's title (B8). **Tell @thatdudetebo.**
- **`DocumentService`:** `validateTitle` (shared by import, rename and the popup), `renameMaterial`; delete and rename look the row up with `getStudyMaterial`.
- **`ActiveMaterialContext`** (with the pure `resolveActiveId` in `utils/activeMaterial.ts`): holds the library and the active material, saved under `studybee.activeMaterialId`, validated against the database (B15). First launch picks the newest material. Refreshes and selection changes run through one queue so they cannot overwrite each other.
- **`TitleModal`** (a Modal, not iOS-only `Alert.prompt`, B21) with inline validation, **`ProgressOverlay`** for long steps, and new theme colours.
- **Home** (Lea's logo): upload through the real picker, title popup prefilled with the file name, progress stages, a "No AI model installed" banner that opens Settings, a "Working on" card with a Continue link to the newest history item, generate buttons disabled until a material is active, library list with task badges, tap to select, long-press to rename or delete (with confirmation).
- **Settings** (Lea's profile and Enhanced Mode layout): profile name and email saved to `UserProfile` with validation; AI model list with download, pause, resume, cancel, delete, progress and sizes; model import; installed-but-unlisted files; "Download on Wi-Fi only"; Enhanced Mode disabled with "Cloud mode coming soon" while `CLOUD_ENDPOINT_URL` is empty (B16). Deleting a model is refused during a generation and unloads the model first.
- **Navigation:** dark drawer and header (the drawer and header were white), Settings and History order, and route params are now only `historyId`.
- Plan doc: en dashes replaced with hyphens.

### Verified on the emulator

- Fresh state (database, stored PDFs and models moved aside with `run-as`, no uninstall): logo, banner, empty library and the "Upload or choose a material first" hint. The banner opens Settings.
- Settings: bad email rejected inline, valid profile saved ("Profile saved."), kept after a kill and relaunch. Real picker import of a 100 MB model: "Model ready" notice, installed size shown, Home banner gone. "Cloud mode coming soon" shown.
- Real picker upload: only PDFs listed (the `.gguf` filtered out), title popup prefilled, empty title rejected inline, progress overlay, library row created and selected.
- Rename through long-press, delete of the active material (confirmation, file removed, selection cleared), kill and relaunch keeps the chosen material.

### Bugs found on the device and fixed

- **Selection was lost on relaunch.** The provider and Home both refresh at startup, and the second refresh reset the selection to nothing. Refreshes are now serialised and the selection lives in a ref.
- Import progress label now says "Long PDFs can take a minute".
- Phase 5's "drawer not verified" caveat is resolved (it works; the miss was animation timing).

### Not verified / known limits

- **PDF text extraction is slow on the emulator:** about 28 s for a 6-page, 17 KB PDF with no UI interaction (and minutes if the UI is polled constantly). A real phone must be timed in Phase 7. If it is too slow, read page by page and show "page 3 of 40".
- **The logo is 29x22 px** and is drawn at 80x60, so it is blurry. Lea needs to supply a larger image.
- Library badges need history rows, so they are checked in 6b with seeded history.
- Review findings left alone: empty-string `ModuleCode` (titles are validated non-empty); the history fetch can race with a delete (cosmetic).
- Emulator state: the app database now holds test materials. The original database, PDFs and models are saved as `files/SQLite.bak`, `files/materials.bak` and `files/models.bak` and are restored at the end of Phase 6.

### Next

6b: Summary, Flashcards, Questions and History screens (with the generation hook, history delete, deck delete, mastery).

---

## Handoff 6b: Phase 6, Summary, Flashcards, Questions and History (`feature/wiring-screens`)

**Date:** 2026-10-24
**Commit to make** (the screens keep the look of Lea's mock-ups, so she is credited again):

```
git add src
git commit -m "feat(wiring): add summary, flashcards, questions and history screens" \
  -m "Keeps the visual style of the original screen mock-ups." \
  -m "Co-authored-by: leago9 <162553886+leago9@users.noreply.github.com>"
```

### Result

Typecheck and `format:check` green. 142 isolated tests pass (20 parser and sampler, 21 pipeline, 43 ingestion, 45 retrieval, 7 active-material, 6 format). `/code-review medium` run, 9 of 10 findings fixed. Verified on the emulator through the real UI.

### What changed

- **Shared pieces:** `useGeneration` (runs `generateForMaterial`, throttles streamed text to 4 updates a second, clears it on error, clears old errors when the screen is shown again, never updates after unmount), `useSavedResults` (the newest saved result for the active material, or the one a History row opened; an opened result is dropped when the screen loses focus; the route parameter is read through a ref so clearing it cannot drop the result), `AppButton`, `NoMaterial`, and `utils/tasks.ts` (labels and destination screens, shared with Home).
- **Summary:** generate, live streaming text, saved result with local time, an empty state that does not replace an existing summary while generating.
- **Flashcards:** deck chips (labelled with the unique creation time), "Mastered x of y", tap a card to flip it then mark "Again" or "Got it" (saved per card), generate a new deck, delete a deck (cards cascade). An opened History row whose deck was deleted shows its saved cards read-only with an explanation.
- **Questions:** generate Q&A cards; "Ask your material" with a 300-character box, inline validation, "Searching your notes and loading the AI model..." then "Writing the answer..." with streaming; a hint appears if the search model is not installed (answers then use a sample of the notes instead of real retrieval).
- **History:** grouped by material using the user's title, 50 rows per page with "Load more", tap to reopen (selects that material, then opens the result), press and hold to delete a row.
- `formatTimestamp` converts SQLite's UTC timestamps to local time everywhere they are shown (the first version showed UTC, two hours behind). `materialTitle` replaces three copies of the title rule.

### Verified on the emulator (real UI, real file picker earlier in 6a)

- History: grouping by title (B8), pagination (50 then 8, footer appears and disappears), reopening a summary, a Q&A, a flashcards row and a free-form answer, deleting a row (60 to 59 in the database).
- Opening an older Biology summary from History, leaving the screen and returning shows the newest again.
- Flashcards: newest deck selected by default, chip switching keeps each deck's mastery, flip, "Got it" saved (database `MasteryLevel` = 1), deleting a deck removes its cards (cascade), deleted-deck and orphan History rows show read-only cards.
- Questions: seeded Q&A cards and answer render, empty question rejected inline, **a real free-form question ran through real retrieval (bge) and generation (SmolLM)** with streaming and was saved (history row) and shown under "You asked".
- **A real summary generation** streamed and was saved as the newest result and shown with local time.
- **A real flashcards generation failed to parse** (the 135M dev model ignores the `Q:` / `A:` format): a readable error appeared, the streamed text was cleared, and no deck or history row was created.
- Home: badges per material, the "Continue" link opens the newest item's screen.

### Bugs found on the device and fixed

- An opened History row whose deck had been deleted silently showed some other deck instead of its own saved cards.
- Streaming and spinner animation starved the model on the software-rendered emulator (a free-form answer streamed at about 0.5 token/s and had not finished after 18 minutes). The spinner is replaced by the text "Working..." and updates are throttled; the same run then took 218 s. Real-phone speed is for Phase 7.
- Times were shown in UTC (see above).
- The button's accessible name was "busy" instead of its label.
- Review findings fixed: stale results after a material change, a false "deck was deleted" flash right after generating, stale cards after switching decks, stale error messages, timestamp zone handling, ambiguous deck labels.

### Not verified / known limits

- **Flashcards generation with a real model that follows the format.** The only generation model available is SmolLM2-135M, which does not. The success path is covered by the pipeline tests and by the seeded-deck UI, not by a real run. Llama 3.2 1B on a real phone is the real test (Phase 7). If parsing fails often, add one automatic retry or a "Try again" prompt.
- **Generation speed on the emulator:** idle screen about 80 s for 600 tokens, live screen 180 to 240 s. Not representative of a phone.
- Choosing "Summaries" from the drawer while already on Summaries keeps the opened item (nothing was navigated away from); leaving and returning shows the newest.
- Home reads up to 1000 history rows to build badges and the Continue link. Materials whose only history is older than that would show no badges.
- A flashcards history row stores the deck name, not the deck ID, so a renamed deck would not match (decks cannot be renamed in the app).
- Questions uses two instances of `useSavedResults` that read the same route parameter; this is safe because each reads it synchronously on focus (documented in the code).
- Emulator state is restored to its original database, PDFs and models.

### Plan status

Phase 6 is complete. The 12-step flow from the plan is covered between 6a and 6b except steps that need a model that follows the Q&A format (flashcards and Q&A generation success) and airplane mode (generation is on-device by design, and retrieval and generation ran with no network use).

### Next

Phase 8 (README and BUILDING.md updates, on a docs branch) and Phase 9 (checking the work against the assignment guide). Phase 7 (testing on a real phone with Llama 3.2 1B) needs you and a teammate.

---

## Handoff 7: Phase 8 (docs) and Phase 9 (checked against the assignment guide) (`feature/docs`)

**Date:** 2026-10-24

### Commits to make (three small ones)

```
git add tsconfig.json src
git commit -m "chore(ts): enable unused-code checks and remove dead code"

git add tests package.json
git commit -m "test: add isolated tests and an npm test script"

git add README.md docs/BUILDING.md docs/phone-test-checklist.md docs/deliverable-4-checklist.md docs/test-log.md
git commit -m "docs: update README and build guide, add test and checklist docs"
```

Do not `git add docs/ITMDA3-34 Assignment Guide.pdf` (course material). `docs/build-and-fix-plan.md` and `docs/coding-log.md` are optional (they record how the project was built).

### Result

Typecheck, `format:check` and `npm test` (142 tests, six suites) all pass. `npm test` was shown to fail (exit code 1) when the code is broken on purpose, and pass (exit code 0) once restored. `/code-review medium` was run on the docs and the small code changes, and every wrong statement it found was corrected.

### What changed

- **Code (small):** `tsconfig.json` now also enforces `noUnusedLocals`, `noUnusedParameters` and `noImplicitReturns` (the code already passed). Removed the unused `embedMaterial`, made `TASK_LABEL` private, and added the missing Deliverable 3 header line to `OutputParser.ts`.
- **Tests in the repo:** `tests/*.test.js` and `tests/run.js`, run with `npm test`. No packages were added.
- **README:** three-person ownership table, what the app does, a code map, the AI model section (three models, file names, sizes, Settings paths, the Wi-Fi-only default, what happens without the search model), `npm test` before commits, new troubleshooting rows.
- **docs/BUILDING.md:** adb commands use `files/models/`, plus how to inspect the app's files and database safely (a fresh folder each time).
- **docs/phone-test-checklist.md (Phase 7 for you and a teammate):** the exact log lines that hold the numbers, with the caveats that make them easy to misread, and the tests to run on the real phone.
- **docs/deliverable-4-checklist.md (Phase 9):** each Deliverable 4 requirement from the guide against the code, with the gaps and decisions for the group.
- **docs/test-log.md:** the tests actually run so far (functional, edge cases, bugs found and fixed), as input for Deliverable 5, with real-phone rows left empty.
- No new APK is needed: the only dependency added since the scaffold is `expo-network`, which the current APK already contains.

### Needs a decision or action from the group (also in the Deliverable 4 checklist)

1. **Web services.** The module and the final presentation mention "supporting web services". The app is fully on-device and Enhanced Mode (the cloud hook) is off because no backend exists. Ask the lecturer whether the local database satisfies this, or whether a small cloud endpoint is expected.
2. **CramSummary.** The table is in the schema but unused (summaries live in `GenerationHistory`). Either write both, or describe the design change in the report.
3. **Logo.** Lea needs to supply a higher-resolution image (29 x 22 px now).
4. **Wireframes.** Compare the app with the Deliverable 3 wireframes and list the differences.
5. **Instruction 6 of the guide** forbids submitting AI-generated content as your own work. Ask the lecturer how that applies to AI-assisted code, and write the Deliverable 5 and 6 narrative yourselves.
6. **Phase 7**: the Llama test on a real phone. In particular whether flashcards and Q&A follow the `Q:` / `A:` format, which the 135M development model does not.

### Not done by me (yours)

- Commits, push, the PR and the merge.
- Release APK: not needed. Deleting the old remote `feature/ui` branch: only after Lea confirms, with `git push origin --delete feature/ui`.
- Phase 7 on a real phone.

---

## Handoff 8: CramSummary removed, Enhanced Mode planned, Llama model received (`feature/docs`)

**Date:** 2026-10-24

### Commits to make now (in this order, each one type-checks on its own)

```
git add tsconfig.json src/services
git commit -m "chore(ts): enable unused-code checks and remove dead code"

git add src/db src/types
git commit -m "refactor(db): remove the unused CramSummary table"     # tell @thatdudetebo: it is his storage code

git add tests package.json
git commit -m "test: add isolated tests and an npm test script"

git add README.md .gitignore docs/BUILDING.md docs/phone-test-checklist.md docs/deliverable-4-checklist.md docs/test-log.md docs/enhanced-mode-plan.md
git commit -m "docs: update README and build guide, add checklists and the Enhanced Mode plan"

git push -u origin feature/docs     # then open the PR into main
```

After the PR is merged: `git push origin --delete feature/ui && git branch -d feature/ui && git fetch --prune`. (Cleared with Lea. Leave `feature/ui-screens` alone.)

### What changed

- **CramSummary removed**: table, index, `createCramSummary`, `listCramSummaries` and the type. `DROP TABLE IF EXISTS CramSummary` runs at start so phones that ran an older build lose the empty table. Checked against a copy of the emulator's real database: only that table disappeared, every other table kept all its rows, running it twice is harmless, and a fresh database is created correctly. `SCHEMA_VERSION` is now 3. A **Changelog** section was added to the README (changes since the Deliverable 3 design).
- **Enhanced Mode plan** written: `docs/enhanced-mode-plan.md`. Recommendation: the cloud model replaces the local one (the app already has that path and the fallback), through a small web service on Cloudflare Workers that holds the Gemini key. The Google project behind the key must have no billing account, so a leak can only use up the free quota. Not built yet: waiting for the group's approval and accounts.
- `.gitignore` now also covers `backend/.dev.vars`, `backend/node_modules/` and `backend/.wrangler/` before any secret exists.
- The logo file: `assets/StudyBee2.png` (29 x 22 px). The launcher icon and splash screen are still Expo's default blue chevron (`assets/icon.png` and friends).
- The Llama model file arrived complete (807,694,464 bytes, the exact size on Hugging Face, valid GGUF header, "Llama 3.2 1B Instruct").

### Next

After your commits: run Llama on the emulator headlessly (flashcards and Q&A raw output and parse counts, which also gives the real prompt-token count for the 4096 limit) and confirm on the device that `CramSummary` is gone from the database.

---

## Handoff 9: the real Llama model tested, flashcard and Q&A output hardened

**Date:** 2026-10-24

### Commits to make (on `feature/docs` if its PR is still open, otherwise `git switch main && git pull && git switch -c fix/llama-output`)

```
git add src tests
git commit -m "fix(inference): per-task temperature and stricter flashcard and Q&A checks"

git add README.md docs/deliverable-4-checklist.md docs/phone-test-checklist.md docs/test-log.md docs/coding-log.md
git commit -m "docs: record the Llama test results"
```

### What the test found

`Llama-3.2-1B-Instruct-Q4_K_M.gguf` (the production model) was run on the emulator through the real app code. At the default temperature, **flashcards worked but Q&A failed**: the model copied the template word (`Q: question`), then wrote sentences from the notes as "questions" with no answers. The old parser accepted that as one valid pair, so the app would have saved garbage as a successful result.

### Fixes

- **Per-task temperature** (`TASK_TEMPERATURE` in `config.ts`): 0.3 for flashcards and Q&A (they must follow the format), 0.4 for your own questions, 0.5 for summaries.
- **Parser** ignores template leftovers (`question`, `Question 1`, `<the answer>`, `...`), questions copied as their own answer (ignoring punctuation and case) and repeated questions. It keeps symbols that carry meaning, so `C++` and `C#`, `2+3` and `2-3`, and answers such as `∞` or `%` are real content.
- **Pipeline** keeps at most 5 pairs and refuses fewer than 2 usable ones, with a different message when exactly one pair was usable. If the model was cut off by the output limit, an unfinished last pair is dropped (unless the model had only started its next question, in which case nothing is lost), or marked with `...` when there is no pair to spare. The cut-off comes from the model's own result (`stopped_limit`, or 599 of 600 tokens, which is what a cut-off run reported).
- **Tests:** `npm test` now has 7 suites and 176 tests (new: inference router, template leftovers, symbols, cut-off handling). The exact failure from the emulator is a test.

### Results with the final code (emulator, real Llama)

| Run                                           | Result                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| Q&A, default temperature (before the fix)     | Failed (template word copied, 1 bogus pair accepted)                              |
| Q&A, temperature 0.3, real pipeline x2        | 5 good pairs both times                                                           |
| Flashcards, temperature 0.3, real pipeline x3 | 5 good cards each time                                                            |
| Summary, temperature 0.5, real pipeline       | A readable topic-by-topic bullet summary                                          |
| Largest prompt (6 chunks)                     | 2,712 tokens, so with the 600 output tokens it is 3,312, under 4,096 (B13 closed) |

Emulator speed from the model's own log: reading the prompt about 15 tokens/s, writing about 18.7 tokens/s (do not quote as performance; use the phone).

### Checked

- The regex that reads answers uses Unicode classes (`\p{L}`, `\p{N}`, `\p{S}`). Hermes' own compiler accepts it and rejects a deliberately invalid one, and the earlier device runs executed the parser.
- `CramSummary` migration and all screens (previous handoff).
- The emulator is back to its original data and models.

### Not verified / known limits

- The cut-off-flag value (`stopped_limit`) was never `true` in a device run with the final code (neither run reached the limit), so the dropping logic is tested with fakes only.
- Quality is one material (Mixed) and a handful of runs. A real phone and a real lecture PDF are the real test (`docs/phone-test-checklist.md`).
- Placeholder detection is English only.
- One of the earlier emulator runs took 20 minutes because the emulator had about 200 MB of free memory. If a phone shows the same slowdown after several generations in a row, tell the maintainer.

### Next

Enhanced Mode (`docs/enhanced-mode-plan.md`) waits for the group's approval and accounts.

---
