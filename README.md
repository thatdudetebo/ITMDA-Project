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
<br>

## Collaborators

**Ingestion** - _group_member_name_

- DocumentService
- ChunkingService

**Retrieval** - _group_member_name_

- EmbeddingService
- RetrievalService

**UI** - _group_member_name_

- 5 screens, RootNavigator

**Inference** - _[@SirMcKenzie](https://github.com/sirmckenzie)_

- PromptBuilder
- GenerationService
- InferenceRouter

**Storage & models** - _[@thatdudetebo](https://github.com/thatdudetebo)_

- ModelManager
- PreferencesService
- database queries

<br>

### Notes

- pull from main often to avoid drifting from the main branch on your feature branch code.

- if you install a package using `npm install` then the entire group needs to do the same after pulling main

<br>
<br>

## Getting started

You only need **Node 22** and an **Android phone**. No Android Studio, no JDK, no building.

### 1. Install Node 22

**macOS**

```bash
brew install nvm
```

Add to `~/.zshrc`, then open a new terminal:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
```

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

### 2. Install the app

Get `app-debug.apk` from the group chat and open it on your phone. Allow "install from unknown
sources" when prompted. This is our app with the AI engine already built in - you never compile
anything. [@SirMcKenzie](https://github.com/sirmckenzie) will rebuild and reshare it whenever needed.

### 3. Get the code

**macOS**

```bash
git clone https://github.com/thatdudetebo/ITMDA-Project.git
cd ITMDA-Project
nvm use
npm install
npm start
```

**Windows**

```powershell
git clone https://github.com/thatdudetebo/ITMDA-Project.git
cd ITMDA-Project
nvm use 22
npm install
npm start
```

### 4. Connect your phone

Open StudyBee on the phone and scan the QR code in your terminal. Phone and laptop must be on
the same Wi-Fi. If that fails, use `npm start -- --tunnel`.

Save a file and the app reloads instantly.

### Every time after that

**macOS** - `nvm use && npm start`
**Windows** - `nvm use 22` then `npm start`

Run `npm install` again whenever someone adds a package.

<br>
<br>

## Full setup - only for rebuilding the APK

Needed if you change a native dependency. Otherwise skip this.

**1.** Install JDK 17 and Android Studio. In SDK Manager tick **NDK**, **CMake** and
**Command-line Tools**.

**2.** Add to `~/.zshrc`, then open a new terminal:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/emulator"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"

export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"
```

`java -version` must say 17.

**3.** Build and install on a connected device:

```bash
npm run prebuild
npm run android
```

First build takes 10-20 minutes because the AI engine compiles from source. Share the new
`android/app/build/outputs/apk/debug/app-debug.apk` with the group afterwards.

<br>
<br>

## Watch out for

- **Expo Go will not work.** Use the APK - it is our own build with the AI engine inside.
- **Never edit `android/` by hand.** It is generated and gets wiped. Change `app.json` instead.
- **Use `npm run android`, not `expo run:android`.** The script sets the CPU architecture;
  without it the build takes four times longer and the app doubles in size.
- **Speed and memory figures must come from a real phone.** Emulator numbers mean nothing for AI
  performance.
