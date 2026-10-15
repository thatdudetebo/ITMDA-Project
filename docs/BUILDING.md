# Building and publishing the APK

**Maintainer only.** If you are not [@SirMcKenzie](https://github.com/sirmckenzie), you do
not need anything in this file. Follow the main [README](../README.md) instead.

Nothing here is required to write code for StudyBee. This document exists so the setup
instructions in the README can stay short and stop changing.

---

## When a rebuild is actually needed

Only when a **native dependency** changes - a package containing C++, Java or Kotlin that
has to be compiled into the APK. In practice that means:

- adding, removing or upgrading a package with a native module
  (`llama.rn`, `expo-sqlite`, `expo-file-system`, `react-native-reanimated`, …)
- changing anything in `app.json` that affects the native project - the package name, the
  permissions, the plugins array, the app icon
- upgrading the Expo SDK or React Native

A rebuild is **not** needed for new screens, new services, schema changes, styling, or any
ordinary TypeScript. That code reaches the installed app over Wi-Fi from Metro.

When in doubt: if `npm install` added or changed a line in `package.json` dependencies,
assume a rebuild. If it didn't, you don't need one.

---

## One-time machine setup

### JDK 17

Gradle in this project requires exactly JDK 17. Newer JDKs fail with
`Unsupported class file major version`.

```bash
brew install --cask zulu@17
```

### Android Studio

Install [Android Studio](https://developer.android.com/studio), then in
**SDK Manager → SDK Tools** tick:

- **NDK (Side by side)** - compiles llama.cpp's C++
- **CMake** - drives that compilation
- **Android SDK Command-line Tools** - provides `sdkmanager`, `avdmanager`

`platform-tools` (which gives you `adb`) installs automatically with the SDK.

### Environment

Add to `~/.zshrc`, then open a new terminal:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/emulator"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"

export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"
```

Verify:

```bash
java -version      # must report 17
adb version
sdkmanager --list | head
```

If `java -version` reports anything other than 17, fix it before building. The Gradle
daemon caches the JDK it started with, so after changing `JAVA_HOME` run
`cd android && ./gradlew --stop` to kill the stale daemon.

---

## Building

Both commands regenerate `android/` first. That folder is gitignored and generated from
`app.json` by Expo's Continuous Native Generation - never edit it, never commit it.

### Local development build - arm64 only

```bash
npm run prebuild
npm run android
```

Roughly 7 minutes and a 128 MB APK, and it installs and launches on the connected device
or running emulator automatically.

`npm run android` is `expo run:android` with
`ORG_GRADLE_PROJECT_reactNativeArchitectures=arm64-v8a` in front of it. That environment
variable restricts the build to one CPU architecture instead of four. **Always use the npm
script, never bare `expo run:android`** - `expo run:android` does not forward `-P` flags to
Gradle, so the environment variable is the only way to set this.

This APK runs on physical Android phones and on arm64 emulators (Apple Silicon Macs). It
will **not** run on an x86_64 emulator.

### Release build - all architectures

```bash
npm run prebuild
cd android && ./gradlew assembleDebug && cd ..
```

Roughly 13 minutes and a 237 MB APK. Without the architecture variable Gradle builds
`arm64-v8a`, `armeabi-v7a`, `x86` and `x86_64`, so the result runs on every teammate's
phone and on x86_64 emulators (Intel Macs, Windows).

**Always publish this version**, never the arm64-only one - teammates on Windows and Intel
Macs need x86_64.

The first build of either kind takes 10-20 minutes because llama.cpp compiles from source.
Later builds reuse the CMake cache unless you ran `prebuild --clean`.

### Verify the AI engine actually made it in

```bash
unzip -l android/app/build/outputs/apk/debug/app-debug.apk | grep librnllama
```

You should see `librnllama*.so` entries - one per arm64 CPU-feature variant
(`_v8`, `_v8_2`, `_dotprod`, `_i8mm`, and so on), which llama.rn selects between at
runtime. If this returns nothing, the APK is a shell with no AI engine and the app will
crash the moment inference is called.

---

## Publishing

The APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`.

It cannot go in the repository: `android/` is gitignored, and GitHub rejects files over
100 MB. It goes to
[Releases](https://github.com/thatdudetebo/ITMDA-Project/releases) instead.

1. Draft a new release
2. Tag with the date - `apk-2026-10-15`
3. Attach `app-debug.apk`
4. In the notes, list which native dependency changed and its version
5. Publish, then tell the group

### Keep the debug keystore

Debug APKs are signed with `~/.android/debug.keystore`, generated once per machine. Every
release must be signed with the **same** keystore, or teammates get "App not installed"
when updating and have to uninstall - which destroys their imported model and local
database.

So: do not delete `~/.android/`, and do not publish a release built on a different
computer. If the keystore is ever lost, warn the group that the next update requires an
uninstall before they install it.

### Do not lower the version

`app.json` sets no `versionCode`, so Expo defaults to `1`. Installing version code 1 over
version code 1 is allowed, which is what makes install-over-the-top work. If you ever add
a `versionCode`, only ever increase it - Android refuses downgrades.

---

## Pushing a model with adb

The README tells collaborators to import a model through the app, because app-private
storage is unreachable without `adb` or root and most of them have neither.

You have adb, so you can skip the UI:

```bash
adb push ~/Downloads/SmolLM2-135M-Instruct-Q4_K_M.gguf /data/local/tmp/

adb shell run-as za.ac.eduvos.studybee \
  cp /data/local/tmp/SmolLM2-135M-Instruct-Q4_K_M.gguf files/

adb shell rm /data/local/tmp/SmolLM2-135M-Instruct-Q4_K_M.gguf

adb shell run-as za.ac.eduvos.studybee ls -lh files/
```

`run-as` switches to the app's UID, which is the only reason the copy into `files/` is
permitted - and it works only on debug builds. The staging hop through
`/data/local/tmp/` is necessary because `adb push` itself cannot write into app-private
storage.

`files/` in the copy is relative: `run-as` starts in
`/data/data/za.ac.eduvos.studybee/`, the same directory the app sees as
`/data/user/0/za.ac.eduvos.studybee/files/`.

The model survives reboots and APK updates. It does not survive uninstalling the app or
wiping the AVD.

---

## Troubleshooting

| Problem                                              | Cause and fix                                                                                             |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Unsupported class file major version 65/67/71`      | Wrong JDK. Fix `JAVA_HOME` to 17, then `cd android && ./gradlew --stop`.                                  |
| `cmd: Can't find service: activity`                  | Emulator booted but its framework isn't up. Check `adb shell getprop sys.boot_completed` returns `1`.     |
| Port 8081 already in use                             | A second Metro is running. Answer `n` to the port prompt and kill the other instance.                     |
| `Could not find a shared URI scheme`                 | A stale `ios/` folder. `rm -rf ios` - this project is Android-only.                                       |
| `expo prebuild` ConfigError on `plugins`             | Malformed `app.json`. Plugins with options need the nested-array form: `[["expo-build-properties", {}]]`. |
| CMake / NDK errors on first build                    | NDK or CMake missing. Install both in SDK Manager → SDK Tools.                                            |
| Build succeeds but the app crashes calling the model | `librnllama*.so` missing from the APK. Run the `unzip -l` check above.                                    |
| App installs but shows a blank white screen          | Metro isn't running or isn't reachable. Run `npm start`.                                                  |
