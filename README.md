# StudyBee

Offline AI study assistant for Android. Runs a small AI model directly on the phone, so
students can turn their own notes and PDFs into summaries, flashcards and Q&A with no
internet and no subscription.

ITMDA3-34 Group Project - Eduvos Pretoria.

Demo Video link 1
https://youtu.be/Lof2gh-dzuU


Demo Video link 2
https://youtube.com/shorts/cfipVW8tSOQ?feature=share
---

## Collaborators

| Area                               | Owner                                            | Files                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inference, ingestion and retrieval | [@SirMcKenzie](https://github.com/sirmckenzie)   | `PromptBuilder`, `GenerationService`, `InferenceRouter`, `GenerationPipeline`, `OutputParser`, `DocumentService`, `ChunkingService`, `EmbeddingService`, `RetrievalService` |
| Screens and navigation (wiring)    | [@SirMcKenzie](https://github.com/sirmckenzie)   | `src/screens`, `src/hooks`, `src/state`, `src/components`, `RootNavigator`                                                                                                  |
| Storage & models                   | [@thatdudetebo](https://github.com/thatdudetebo) | `ModelManager`, `PreferencesService`, database schema and queries                                                                                                           |
| UI design                          | [@leago9](https://github.com/leago9)             | Logo, screen mock-ups, profile and Enhanced Mode layout                                                                                                                     |

### Working agreements

- Work on a `feature/*` branch, never on `main`.
- Pull `main` into your branch often so you don't drift.
- Run `npm run format`, `npm run typecheck` and `npm test` before every commit.
- Added a package? Tell the group as everyone needs to run `npm install` after pulling.
- Open a pull request into `main` when something works. One other person reviews it.
- Commit messages follow Conventional Commits, for example `feat(retrieval): add cosine search`.

## What the app does

1. **Upload** a PDF of your notes (it must have selectable text, scanned pages are not supported) and give it a title.
2. **Generate** a summary, flashcards, or exam-style questions with answers from that material, or **ask your own question** about it. Everything runs on the phone.
3. **Study** the flashcards: tap to flip, then mark "Again" or "Got it".
4. **Come back later**: every result is saved, and **History** reopens any of them.

## How the code is organised

```
src/
  config.ts          fixed values from Deliverable 3 (chunk size, token budget, model names)
  db/                SQLite schema and queries
  services/
    DocumentService, ChunkingService        PDF -> text -> chunks
    EmbeddingService, RetrievalService      chunks -> vectors -> the most relevant chunks
    PromptBuilder, GenerationService,
      InferenceRouter, OutputParser         prompt -> local model -> text -> flashcards / Q&A
    GenerationPipeline                      the one function the screens call to generate
    ModelManager, PreferencesService        model files and settings
  state/ hooks/ components/ screens/        what the user sees
tests/                                      isolated tests (run with npm test, no phone needed)
docs/                                       build guide, test log, phone test checklist, Deliverable 4 checklist
```

A generation goes: screen -> `GenerationPipeline` -> pick chunks (search for questions, a spread across the document for everything else) -> `PromptBuilder` -> the model -> `OutputParser` -> saved to SQLite -> rendered.

## Changelog

Changes made after the Deliverable 3 design (the ERD, wireframes and architecture in that document describe the original plan).

### 24 Oct 2026

- **Removed** the `CramSummary` table, its queries and its type. Summaries are stored in `GenerationHistory` with every other generated result, so the table was redundant. Phones that ran an older build drop the (empty) table automatically on the next start.
- **Added** the `GenerationHistory` table and the History screen. Every summary, flashcard set, Q&A set and free-form answer is saved and can be reopened or deleted.
- **Changed** where the user's title for a material is stored: it uses the existing `StudyMaterial.ModuleCode` column, so no schema change was needed.
- **Added** a profile (name and email, validated) to Settings, stored in `UserProfile`.
- **Added** model management to Settings: download with Wi-Fi-only control, pause and resume, import from a file, delete. Models are stored in the app's `files/models/` folder.
- **Added** rename and delete for materials, and delete for decks and history rows, so each of those modules supports create, read, update and delete.
- **Changed** how the model answers are read: flashcards and Q&A are requested as `Q:` / `A:` pairs and parsed into cards.
- **Changed** to a drawer menu with six screens, and a dark theme.
- **Added** a standalone release APK (the app code inside, no laptop needed) and turned off minification in release builds so the PDF reader and the model engine are not stripped.
- **Changed** generation to per-task temperatures (0.3 for flashcards and Q&A, 0.4 for your own questions, 0.5 for summaries) and stricter reading of flashcards and Q&A: template leftovers such as "Q: question", repeated or copied questions are ignored, at most the first 5 pairs are kept, an unfinished last pair from a cut-off answer is dropped, and a result with fewer than 2 usable pairs is refused with a clear message. Found by running the real Llama 3.2 1B model, which at the default temperature once copied the template word instead of writing questions.

<br>

---

# Setup

You do this once.

You need **Node 22** and somewhere to run the app. An Android phone, or an emulator if you
don't have one. You will never compile anything and you do not need a JDK.

### 1. Install Node 22

**macOS**

```bash
brew install nvm
mkdir ~/.nvm
```

Add these two lines to `~/.zshrc`, then open a **new terminal**:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
```

```bash
nvm install 22
```

**Windows**

Install `nvm-setup.exe` from
[nvm-windows](https://github.com/coreybutler/nvm-windows/releases), then in PowerShell:

```powershell
nvm install 22
nvm use 22
```

### 2. Somewhere to run the app

**Using your own Android phone** there's nothing to install. Go to step 3.

**No phone?** then install [Android Studio](https://developer.android.com/studio), then
Device Manager → Create Virtual Device → any Pixel → system image **arm64-v8a** on Apple
Silicon Macs or **x86_64** on Intel Macs and Windows → 4 GB+ RAM.

You only need the emulator from Android Studio. You are not using it to build anything.

### 3. Install the StudyBee app

Download the newest `app-debug.apk` from
[Releases](https://github.com/thatdudetebo/ITMDA-Project/releases).

- **Phone**: open the file, allow "install from unknown sources".
- **Emulator**: start it, then drag the `.apk` onto its window.

This is our app shell with the AI engine compiled inside. You never build it.

There are two kinds of APK on Releases. `app-debug.apk` is the **developer** build: it needs
`npm start` running on a laptop. The **standalone** build (`StudyBee-...-release-arm64-....apk`) is for
testers: it has the app code inside and runs on its own on any arm64 phone. Install either one
**over** an older StudyBee, never after uninstalling it.
[@SirMcKenzie](https://github.com/sirmckenzie) publishes a new one when the native
dependencies change.

### 4. Get the code

**macOS**

```bash
git clone https://github.com/thatdudetebo/ITMDA-Project.git
cd ITMDA-Project
nvm use
npm install
git checkout feature/<your-area>
```

**Windows**

```powershell
git clone https://github.com/thatdudetebo/ITMDA-Project.git
cd ITMDA-Project
nvm use 22
npm install
git checkout feature/<your-area>
```

Your branch name is in the table at the top.

### 5. Run it

Emulator users: start the emulator first and wait for the home screen.

```bash
npm start
```

- **Phone**: open StudyBee, tap "Scan QR code", scan the code in your terminal. Phone and
  laptop must be on the same Wi-Fi.
- **Emulator**: press `a`.

Save a file and the app reloads. Done.

<br>

---

# Every time you come back

```bash
cd ITMDA-Project
nvm use                      # Windows: nvm use 22
git checkout feature/<your-area>
git pull origin main         # everyone else's merged work
npm install                  # harmless; required if anyone added a package
npm start
```

Before you commit:

```bash
npm run format
npm run typecheck
npm test
```

Push your branch and open a pull request into `main` when a piece of work is finished.

<br>

---

# The AI model

The app ships without a model. The files are 35 MB to 1 GB and cannot live in a git repo.
Nothing that calls the AI will work until a model is on your device. Open **Settings -> AI Models**.
There are two ways to install one:

- **Download** in the app (use Wi-Fi: **Download on Wi-Fi only** is on by default), or
- **Import model (.gguf)**: download the file on your computer or phone first, then pick it with the file picker. The app copies it into its own storage (`files/models/`).

| Model                                            | File                                | Size    | Used for                                                                      |
| ------------------------------------------------ | ----------------------------------- | ------- | ----------------------------------------------------------------------------- |
| SmolLM2 135M (development)                       | `SmolLM2-135M-Instruct-Q4_K_M.gguf` | ~100 MB | Quick testing. It often ignores the flashcard format, so use Llama for demos. |
| Llama 3.2 1B Instruct (**the real model**)       | `Llama-3.2-1B-Instruct-Q4_K_M.gguf` | ~770 MB | Summaries, flashcards, Q&A and answers. Slower to load.                       |
| BGE Small English v1.5 (search, **recommended**) | `bge-small-en-v1.5-q8_0.gguf`       | ~35 MB  | Finds the right part of your notes for your own questions.                    |

Files: [SmolLM2](https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF) and
[Llama](https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF) (bartowski),
[BGE](https://huggingface.co/CompendiumLabs/bge-small-en-v1.5-gguf) (CompendiumLabs). Open "Files and versions"
and click the download arrow on the row. _No account needed_. The file name must match exactly.

Without the search model the app still works: your own questions are answered from a sample of
the notes instead of the most relevant parts, and Questions shows a hint. Performance figures
for Deliverable 5 need the Llama model on a real phone.

<br>

---

# If something breaks

| Problem                                    | Fix                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| App won't connect to Metro                 | Same Wi-Fi? Otherwise `npm start -- --tunnel`.                                     |
| "Unable to resolve module ..."             | Someone added a package - `npm install`.                                           |
| App crashes immediately after `git pull`   | Native dependency changed - get the newest APK from Releases.                      |
| Pressing `a` says no device found          | Emulator not fully booted. Wait for the home screen, press `a` again.              |
| Pressing `a` can't find `adb`              | Set `ANDROID_HOME` to your SDK path (`~/Library/Android/sdk` on macOS).            |
| `nvm use` says version not found           | `nvm install 22`.                                                                  |
| Changes don't appear in the app            | Shake the phone, or `Cmd+M` in the emulator → Reload.                              |
| Anything AI-related says "model not found" | Install a model in Settings - see **The AI model** above.                          |
| Download says "Connect to Wi-Fi"           | You are not on Wi-Fi. Connect, or turn off **Download on Wi-Fi only** in Settings. |
| "This PDF has no selectable text"          | The PDF is a scan. Use a PDF where you can select the text.                        |
| Flashcards say "Couldn't read the answer"  | The small model ignored the format. Try again, or use the Llama model.             |

**Install a new APK over the old one. Never uninstall.** Uninstalling deletes the app's
private storage, which takes your imported model and your local database with it. Android
allows installing over the top because every release is signed with the same key.

## By The Way

- **Expo Go will not work.** It contains only Expo's own native modules, and our AI engine
  isn't one of them. Use the APK from Releases.
- **The APK contains no app code.** It's a shell. Your TypeScript is served live from your
  laptop by `npm start` - which is why everyone can run a different branch through
  the same installed app, and why a new APK is almost never needed.
- **Never edit `android/` by hand.** It is generated from `app.json` and gets wiped.
- **Performance figures must come from a real phone.** Emulator timings are meaningless for
  on-device AI and must not go into Deliverable 5.

Building and publishing the APK: see [`docs/BUILDING.md`](docs/BUILDING.md) - only for maintaining.
