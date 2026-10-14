# StudyBee

Offline AI study assistant for Android. Runs a small AI model directly on the phone, so students
can turn their own notes and PDFs into summaries, flashcards and Q&A with no internet and no
subscription.

ITMDA3-34 Group Project - Eduvos Pretoria.

---

## What each piece does

- **Node 22** - runs the build tools on your laptop; it is not part of the app itself.
- **nvm** - switches Node versions so this project always builds on 22.
- **JDK 17** - the Java toolchain Android builds with; newer versions fail.
- **Android Studio** - supplies the Android SDK, the emulator and the device manager.
- **NDK + CMake** - compile the C++ that the AI engine is written in.
- **Expo** - manages the project and generates the native `android/` folder for us.
- **React Native + TypeScript** - the app's screens and logic.
- **llama.rn** - runs the AI model on the phone itself.
- **GGUF** - the compressed file format the AI model comes in.
- **SQLite** - stores documents, text chunks and generated study material on the device.

<br>

## Collaborators

| Area             | Branch              | Owner                                              | Files                                                   |
| ---------------- | ------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| Ingestion        | `feature/ingestion` | _group_member_name_                                | `DocumentService`, `ChunkingService`                    |
| Retrieval        | `feature/retrieval` | _group_member_name_                                | `EmbeddingService`, `RetrievalService`                  |
| Inference        | `feature/inference` | [@SirMcKenzie](https://github.com/sirmckenzie)     | `PromptBuilder`, `GenerationService`, `InferenceRouter` |
| UI               | `feature/ui`        | _group_member_name_                                | 5 screens, `RootNavigator`                              |
| Storage & models | `feature/storage`   | _[@thatdudetebo](https://github.com/thatdudetebo)_ | `ModelManager`, `PreferencesService`, database queries  |

### Working agreements

- Work on your own `feature/*` branch, never directly on `main`.
- Pull `main` into your branch often so you don't drift.
- Run `npm run format` and `npm run typecheck` before you commit.
- If you run `npm install` to add a package, tell the group - everyone must run `npm install`
  after pulling.
- Open a pull request into `main` when a piece works. One other person reviews before merging.

<br>

---

# First-time setup

Do this once. You need **Node 22** and somewhere to run the app.

- **If you have an Android phone**, that's all - no Android Studio, no JDK.
- **If you don't**, you'll install Android Studio for its emulator only. You still won't need a
  JDK and you'll never compile anything.

### 1. Install Node 22

**macOS**

```bash
brew install nvm
mkdir ~/.nvm
```

Add to `~/.zshrc`:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
```

Open a **new terminal**, then:

```bash
nvm install 22
```

**Windows**

Download and run `nvm-setup.exe` from
[nvm-windows](https://github.com/coreybutler/nvm-windows/releases). Then in PowerShell:

```powershell
nvm install 22
nvm use 22
```

### 2. Set up somewhere to run the app

**With a phone** - nothing to do, move to step 3.

**Without a phone** - install [Android Studio](https://developer.android.com/studio) and create
an emulator: Device Manager → Create Virtual Device → pick a Pixel → choose a system image
(**arm64-v8a** on Apple Silicon Macs, **x86_64** on Intel Macs and Windows) → give it 4GB+ RAM.

You only need the emulator. Skip the SDK Tools, NDK and CMake options - those are for building
the APK, which you won't do.

### 3. Install the StudyBee app

Download `app-debug.apk` from
[Releases](https://github.com/thatdudetebo/ITMDA-Project/releases).

- **On a phone** - open the file and allow "install from unknown sources" when prompted.
- **On an emulator** - start the emulator, then drag the `.apk` file onto its window.

This is our app with the AI engine already compiled inside. You never build it yourself.
[@SirMcKenzie](https://github.com/sirmckenzie) publishes a new release whenever one is needed.

### 4. Get the code

**macOS**

```bash
git clone https://github.com/thatdudetebo/ITMDA-Project.git
cd ITMDA-Project
nvm use
npm install
```

**Windows**

```powershell
git clone https://github.com/thatdudetebo/ITMDA-Project.git
cd ITMDA-Project
nvm use 22
npm install
```

### 5. Switch to your branch

Use the branch for your area from the table above:

```bash
git checkout feature/ingestion
```

### 6. Start it up

If you're using the emulator, make sure it is **running and fully booted** first - wait until
you can see the home screen.

```bash
npm start
```

- **On a phone** - open StudyBee and use its "Scan QR code" button on the code in your terminal.
  Phone and laptop must be on the same Wi-Fi. If your network blocks it, stop and run
  `npm start -- --tunnel` instead.
- **On an emulator** - press `a` in the terminal.

Save a file and the app reloads instantly. You're set up.

<br>

---

# Every time you come back to code

```bash
cd ITMDA-Project
nvm use                 # Windows: nvm use 22
git checkout feature/your-area
git pull origin main    # bring in everyone else's merged work
npm install             # only needed if someone added a package
npm start
```

Then scan the QR code on your phone, or press `a` for the emulator.

Before you commit:

```bash
npm run format
npm run typecheck
```

Push your branch and open a pull request into `main` when a piece of work is finished.

<br>

---

# Rebuilding the APK

**Only [@SirMcKenzie](https://github.com/sirmckenzie) does this.** Everyone else skips this
section entirely.

A rebuild is only needed when a **native dependency** changes - a package containing C++ or
platform code. New screens, services, schema changes and ordinary TypeScript never require one,
because your code reaches the app over Wi-Fi from Metro rather than being baked into the APK.

### One-time machine setup

Install JDK 17 and Android Studio. In SDK Manager tick **NDK**, **CMake** and
**Command-line Tools**. Then add to `~/.zshrc` and open a new terminal:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/emulator"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"

export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"
```

`java -version` must say 17. Anything newer fails with
"Unsupported class file major version".

### Building

For local development - arm64 only, four times faster:

```bash
npm run prebuild
npm run android
```

For a release to share - all architectures, so it runs on any phone or emulator:

```bash
npm run prebuild
cd android && ./gradlew assembleDebug && cd ..
```

First build takes 10-20 minutes because the AI engine compiles from source.

### Publishing

The APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`. It cannot go in the repo -
`android/` is gitignored and GitHub rejects files over 100MB.

Publish under [Releases](https://github.com/thatdudetebo/ITMDA-Project/releases): Draft a new
release → tag with the date, e.g. `apk-2026-10-14` → attach the APK → list the native
dependency versions in the notes → publish. Tell the group so everyone reinstalls.

<br>

---

## Watch out for

- **Expo Go will not work.** It only contains Expo's own modules and our AI engine isn't one of
  them. Use the APK from Releases.
- **The APK contains no app code.** It's a shell. Your TypeScript is served live from your own
  machine by `npm start`, which is why five people can run five different branches through the
  same installed app, and why you almost never need a new APK.
- **Never edit `android/` by hand.** It is generated and gets wiped. Change `app.json` instead.
- **Use `npm run android`, not `expo run:android`.** The script sets the CPU architecture;
  without it the build takes four times longer and the app doubles in size.
- **Speed and memory figures must come from a real phone.** Emulator numbers mean nothing for AI
  performance and must not go into Deliverable 5.

### If something breaks

| Problem                                | Fix                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| App won't connect to Metro             | Same Wi-Fi? Try `npm start -- --tunnel`.                                      |
| "Unable to resolve module"             | Someone added a package - run `npm install`.                                  |
| App crashes right after `git pull`     | A native dependency changed - get the new APK from Releases.                  |
| "App not installed" when updating      | Uninstall the old StudyBee first, then install again.                         |
| `nvm use` says version not found       | Run `nvm install 22` first.                                                   |
| `Can't find service: activity`         | Emulator wasn't fully booted. Wait for the home screen, then press `a` again. |
| `Unsupported class file major version` | Wrong JDK - must be 17. Only affects APK rebuilds.                            |
