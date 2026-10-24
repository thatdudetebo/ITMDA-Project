# Deliverable 4 checklist (Implementation, 50 marks)

Checked against `ITMDA3-34 Assignment Guide.pdf`, section "Deliverable 4: Implementation". Rubric:
System design 15, Prototype development 20, Prototype integration 15.

`[x]` = done and checked in the running app or the code. `[ ]` = open. Evidence points to a place
in the repo or to `docs/test-log.md`.

## 1. Screen development

- [x] All major screens exist: My Library (Home), Summaries, Flashcards, Questions and answers, History, Settings. `src/screens/`
- [x] Each has real interface elements (buttons, text inputs, lists, switches, popups) and is fully functional, not just designed.
- [x] Consistent styling: one palette in `src/theme.ts`, the same dark theme on screens, header and menu, shared `AppButton`, `TitleModal`, `ProgressOverlay`.
- [ ] The screen flow matches the wireframes in Deliverable 3. **Compare the wireframes with the app and note any differences in the report.** (History, the title popup and Settings model management were added or changed after Deliverable 3.)

## 2. Authentication (if applicable)

- [x] The guide says a system without login "must still implement some form of user identity logic". The app creates a local `UserProfile` on first use (`getOrCreateUserProfile`), every material belongs to that user, and **Settings -> Profile Information** shows and edits the name and email (with validation).
- [ ] No sign-up or login is built. Say in the report that the app is single-user and offline by design, so credentials would have nothing to protect.

## 3. Backend integration

- [x] The guide accepts "a cloud database or a local database". The app uses a local SQLite database with all create, read, update and delete operations (`src/db/queries.ts`), foreign keys with cascading deletes, and transactions for multi-row saves.
- [x] Storage follows the data design in Deliverable 3 (`UserProfile`, `StudyMaterial`, `MaterialChunk`, `RevisionDeck`, `Flashcard`).
- [ ] **Design changes to write up** (they differ from the Deliverable 3 ERD):
  - `GenerationHistory` was added. It stores every generated result (summary, flashcards, Q&A, answers) and drives the History screen.
  - `CramSummary` was **removed** (table, queries and type). Summaries are stored in `GenerationHistory`, which made it redundant. Existing installs drop the empty table on the next start. See the CHANGELOG in the README.
  - The user's title for a material is stored in `StudyMaterial.ModuleCode` (no schema change).
- [x] **The cloud endpoint is not required for Deliverable 4.** The guide's wording is "Integration with a cloud database or a local database is required, depending on the nature of the system", and the app has a local SQLite database with full create, read, update and delete. Enhanced Mode (a cloud model answering instead of the phone) is planned for Deliverable 5 (`docs/enhanced-mode-plan.md`). Until then the Settings switch is disabled and says "Cloud mode coming soon". The final presentation (not Deliverable 4) mentions "supporting web services", so Enhanced Mode matters for that.

## 4. Core functionality (at least two complete CRUD modules)

| Module            | Create                    | Read                        | Update                          | Delete                                    |
| ----------------- | ------------------------- | --------------------------- | ------------------------------- | ----------------------------------------- |
| Study materials   | Upload a PDF with a title | Library list, Continue card | Rename (press and hold)         | Delete (press and hold) with confirmation |
| Flashcard decks   | Generate a new deck       | Deck chips and the cards    | Mark a card "Again" or "Got it" | Delete deck (cards go with it)            |
| Generated results | Summary, Q&A, answers     | History list, reopen        | (results are not edited)        | Delete a history row (press and hold)     |
| Profile           | Created automatically     | Settings                    | Edit name and email             | n/a                                       |

- [x] At least two modules support all four operations: **study materials** and **flashcard decks**.
- [x] Modules include their screens, logic and database connections.
- [x] The modules reflect the original requirements and use cases (upload notes, generate study aids, revise).

## 5. Navigation and routing

- [x] Drawer navigation between all six screens, plus in-screen navigation (Home buttons, the Continue link, opening a History row, "Go to My Library").
- [x] Opening a History row selects that material and opens the right screen with that result. Leaving a screen and returning shows the newest result again.
- [ ] **Check the Android Back button** on a real phone. Nothing custom is coded: it relies on the drawer's default (Back from any screen goes to My Library, and Back on My Library closes the app). That has not been tested yet and is on the phone checklist.

## 6. UI feedback

- [x] Input validation with messages: empty or over-long title, empty question, invalid email, name length, non-PDF file.
- [x] Loading and progress: import progress overlay with the current step, "Searching your notes and loading the AI model...", "Writing your summary...", streamed text while generating, download progress bars.
- [x] Success and failure messages: "Profile saved.", "Model ready: ...", "Import failed" alerts, readable errors for scanned or password-protected PDFs, an unreadable model answer, a missing model, a busy model.
- [x] Destructive actions ask first (delete material, delete deck, delete model, delete history row).

## 7. Code quality

- [x] Structured into reusable modules: `services/` (logic), `db/`, `state/`, `hooks/`, `components/`, `screens/`, `utils/`. The README has a code map.
- [x] One style guide: Prettier (`npm run format:check` passes), TypeScript `strict` plus `noUnusedLocals`, `noUnusedParameters` and `noImplicitReturns` (`npm run typecheck` passes). Automated tests of the logic run with `npm test`.
- [x] Important logic is commented, and each service starts with a header that names its Deliverable 3 section.
- [x] Unused code removed: unused exports were scanned and the dead ones deleted. The only remaining unused export is `SCHEMA_VERSION` in the storage layer, kept as documentation of the schema.
- [x] Console output is limited to short prefixed status and warning lines (`[generation]`, `[embedding]`, `[retrieval]`, `[pipeline]`, `[dispatch]`, `[documents]`, `[home]`, `[settings]`). They are used for timing and diagnosis and are where the Deliverable 5 numbers come from. There are no leftover debug prints.
- [ ] **Redundant files before submission.** Do not commit `docs/ITMDA3-34 Assignment Guide.pdf` (course material). Decide whether `docs/build-and-fix-plan.md` and `docs/coding-log.md` stay in the repo (they document how the project was built; the plan is now historical).

## 8. "Run reliably on mobile devices"

- [ ] Not proven until the phone checklist (`docs/phone-test-checklist.md`) is done with the Llama model on a real phone.

## 9. Open items before submitting

1. Run the automated tests with `npm test` and do the phone test with Llama 3.2 1B (`docs/phone-test-checklist.md`). On the emulator the real Llama model followed the `Q:` / `A:` format in 4 of 4 runs after a fix (the 135M development model does not); the phone must confirm it.
2. Get a higher-resolution logo from Lea (the current file is 29 x 22 px and looks blurry).
3. Enhanced Mode and its small web service (`docs/enhanced-mode-plan.md`) are for Deliverable 5 and the final presentation, not Deliverable 4.
4. Compare the app with the Deliverable 3 wireframes and list the differences.
5. Instruction 6 in the guide says AI tools must not be used "to create content and submit it as your own work". Ask your lecturer how that applies to AI-assisted code, and write the Deliverable 5 and 6 text (testing narrative, reflection) yourselves.
