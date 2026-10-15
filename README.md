# StudyBee

Offline AI study assistant for Android. Runs a small AI model directly on the phone, so
students can turn their own notes and PDFs into summaries, flashcards and Q&A with no
internet and no subscription.

ITMDA3-34 Group Project — Eduvos Pretoria.

---

## Collaborators

| Area             | Branch              | Owner                                            | Files                                                   |
| ---------------- | ------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Ingestion        | `feature/ingestion` | _TBC_                                            | `DocumentService`, `ChunkingService`                    |
| Retrieval        | `feature/retrieval` | _TBC_                                            | `EmbeddingService`, `RetrievalService`                  |
| Inference        | `feature/inference` | [@SirMcKenzie](https://github.com/sirmckenzie)   | `PromptBuilder`, `GenerationService`, `InferenceRouter` |
| UI               | `feature/ui`        | _TBC_                                            | 5 screens, `RootNavigator`                              |
| Storage & models | `feature/storage`   | [@thatdudetebo](https://github.com/thatdudetebo) | `ModelManager`, `PreferencesService`, database queries  |

### Working agreements

- Work on your own `feature/*` branch, never on `main`.
- Pull `main` into your branch often so you don't drift.
- Run `npm run format` and `npm run typecheck` before every commit.
- Added a package? Tell the group as everyone needs to run `npm install` after pulling.
- Open a pull request into `main` when something works. One other person reviews it.

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
```

Push your branch and open a pull request into `main` when a piece of work is finished.

<br>

---

# The AI model

The app ships without a model. The file is 100 MB to 1 GB and cannot live in a git repo.
Nothing that calls the AI will work until a model is on your device.

Download **`SmolLM2-135M-Instruct-Q4_K_M.gguf`** (~100 MB) from
[bartowski/SmolLM2-135M-Instruct-GGUF](https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF) then open "Files and versions" and click the download arrow on that row. _No account needed_.

Then import it in the app: **Settings → Import model**, and pick the file you downloaded.
The app copies it into its own storage. Do this once per device.

This small model is for development. The real model
(`Llama-3.2-1B-Instruct-Q4_K_M.gguf`, ~810 MB, from
[bartowski/Llama-3.2-1B-Instruct-GGUF](https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF))
is slower to load and only needed when measuring performance for Deliverable 5.

<br>

---

# If something breaks

| Problem                                    | Fix                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| App won't connect to Metro                 | Same Wi-Fi? Otherwise `npm start -- --tunnel`.                          |
| "Unable to resolve module ..."             | Someone added a package - `npm install`.                                |
| App crashes immediately after `git pull`   | Native dependency changed - get the newest APK from Releases.           |
| Pressing `a` says no device found          | Emulator not fully booted. Wait for the home screen, press `a` again.   |
| Pressing `a` can't find `adb`              | Set `ANDROID_HOME` to your SDK path (`~/Library/Android/sdk` on macOS). |
| `nvm use` says version not found           | `nvm install 22`.                                                       |
| Changes don't appear in the app            | Shake the phone, or `Cmd+M` in the emulator → Reload.                   |
| Anything AI-related says "model not found" | Import a model - see **The AI model** above.                            |

**Install a new APK over the old one. Never uninstall.** Uninstalling deletes the app's
private storage, which takes your imported model and your local database with it. Android
allows installing over the top because every release is signed with the same key.

## By The Way

- **Expo Go will not work.** It contains only Expo's own native modules, and our AI engine
  isn't one of them. Use the APK from Releases.
- **The APK contains no app code.** It's a shell. Your TypeScript is served live from your
  laptop by `npm start` — which is why five people can run five different branches through
  the same installed app, and why a new APK is almost never needed.
- **Never edit `android/` by hand.** It is generated from `app.json` and gets wiped.
- **Performance figures must come from a real phone.** Emulator timings are meaningless for
  on-device AI and must not go into Deliverable 5.

Building and publishing the APK: see [`docs/BUILDING.md`](docs/BUILDING.md) - only for maintaining.
