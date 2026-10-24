# Real-phone test checklist (Phase 7)

Performance figures for Deliverable 5 must come from a **real phone**, never an emulator. Run this
on the phone with the real model (`Llama-3.2-1B-Instruct-Q4_K_M.gguf`), not SmolLM.

Tick each box only when you saw it work. Write what went wrong next to anything that did not.

## 1. Setup

- [ ] Install the newest `app-debug.apk` from Releases **over the old one**. Never uninstall (it deletes the models and the database). No new APK is needed for the current code.
- [ ] `git switch main && git pull && npm install && npm start`, then scan the QR code (phone and laptop on the same Wi-Fi).
- [ ] Open **Settings -> AI Models** and install the Llama model and the BGE search model (Download on Wi-Fi, or Import).
- [ ] Settings shows both as "Installed" with sizes, and the Home banner "No AI model installed" is gone.

Record: phone model ______ Android version ______ RAM ______ battery saver off [ ]

## 2. Where the numbers come from

Watch the **Metro terminal** (or `adb logcat | grep ReactNativeJS`). The app prints one line for each:

| What                  | Log line                                                                            |
| --------------------- | ----------------------------------------------------------------------------------- |
| Generation model load | `[generation] loaded Llama-3.2-1B-... (context <id>) in <ms>ms`                     |
| One generation        | `[generation] <seconds>s, prompt tokens <n>, output tokens <n>`                     |
| Search model load     | `[embedding] loaded bge-small-... in <ms>ms`                                        |
| Indexing a material   | `[embedding] embedded <n> chunks in <ms>ms` (only the first question on a PDF)      |
| Search result         | `[retrieval] top 5 of <n>: #0=0.723 #3=0.614 ...` (3 decimals)                      |
| Search was NOT used   | `[pipeline] retrieval failed, using sampled chunks` (and no `[retrieval] top` line) |
| Which model answered  | `[dispatch] running on device`                                                      |

Things that look odd but are normal:

- `(context <id>)` is an internal number, not a size. Ignore it.
- The Llama load time is printed only the first time after the app starts. Later runs print `[generation] model already loaded` instead. Close and reopen the app to measure the load again.
- The search model is loaded and freed for **every** question, so `[embedding] loaded ...` appears each time. A second question's time therefore includes that reload.

Tokens per second is `output tokens / seconds`. The seconds include reading the prompt, so it is a
slightly low figure for pure generation speed. Say so in the report.

PDF import has no log line: time it with a stopwatch from tapping Import to the library row appearing.

## 3. The tests

Use a text PDF of about 10 pages for most steps and one of 40 or more pages for the "big PDF" steps.

- [ ] **Upload.** Pick the PDF, the title popup is prefilled, an empty title is rejected, a real title imports. Import time: ______ s (10 pages) ______ s (40+ pages)
- [ ] **Scanned PDF.** A scanned (image-only) PDF gives "no selectable text" and leaves nothing in the library.
- [ ] **Summary.** Streams text, then stays on screen. Load ______ ms, ______ s, prompt tokens ______, output tokens ______
- [ ] **Flashcards, three runs.** How many of the three gave a deck? ___ / 3. Cards flip, "Got it" shows "Mastered x of y". If runs fail with "Couldn't read the AI's answer", note how often. (If it is often, tell the maintainer: the app needs an automatic retry.)
- [ ] **Q&A.** Question and answer cards appear. Runs that worked ___ / 3
- [ ] **Ask your material.** Ask about one specific fact that is in the PDF. Is the answer right? ______ First question on this PDF indexes it: ______ ms. Second question: ______ s
- [ ] **Search model off.** Delete the BGE model in Settings, open Questions again (the hint "The search model is not installed..." shows) and ask: an answer still comes, and the log shows `[pipeline] retrieval failed, using sampled chunks` with no `[retrieval] top` line. Install the model again.
- [ ] **Biggest PDF.** Summary of the 40+ page PDF: prompt tokens ______ + 600 must stay **below 4096**. Prompt tokens: ______
- [ ] **Two materials.** Upload a second PDF. History groups the results under each title. Reopen one result, then pick the same screen from the menu and leave and come back: the newest result shows.
- [ ] **Rename and delete.** Press and hold a material: rename it, then delete it. Its results vanish from History. If it was the selected one, the Home buttons ask you to choose a material.
- [ ] **Kill and relaunch.** Close the app completely and reopen: the selected material, profile and results are still there.
- [ ] **Airplane mode.** Turn on airplane mode and generate a summary and ask a question: both still work.
- [ ] **Memory.** With two materials, generate five or six results in a row (switch between screens too): no crash or freeze. Note anything slow: ______
- [ ] **Back button.** On a screen other than My Library, Back goes to My Library. On My Library, Back closes the app (normal). Nothing crashes.
- [ ] **Profile.** Save a name and a valid email in Settings. An invalid email is refused.

## 4. Results to give the report writer

| Measure                    | 10-page PDF | 40+ page PDF |
| -------------------------- | ----------- | ------------ |
| Import time (s)            |             |              |
| Llama load (ms)            |             | n/a          |
| Summary: seconds           |             |              |
| Summary: prompt tokens     |             |              |
| Summary: output tokens     |             |              |
| Summary: tokens per second |             |              |
| Flashcards: seconds        |             |              |
| Q&A: seconds               |             |              |
| Index chunks: ms / count   |             |              |
| Free-form answer: seconds  |             |              |

## 5. Stop and tell the maintainer if

- the app crashes or the screen goes blank during a generation (note which step and the last log line),
- prompt tokens plus 600 is 4096 or more,
- flashcards or Q&A fail to parse in most runs,
- importing a 40-page PDF takes longer than about two minutes.
