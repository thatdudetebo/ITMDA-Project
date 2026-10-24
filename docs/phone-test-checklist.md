# StudyBee phone test

This takes about 30 minutes. You need an Android phone, Wi-Fi, and about 1 GB of free space.
Tick each box when it works. If something goes wrong, write what happened next to it.

## 1. Install the app

1. Get the file `StudyBee-1.0.0-release-arm64-2026-10-24.apk` onto your phone (from the group chat, or from the Releases page on GitHub).
2. Tap it to install. If the phone asks, allow "install from unknown sources".
3. If StudyBee is already on your phone, **install over it. Do not uninstall it first** (that deletes the AI files and your data).
4. Open StudyBee. You should see **My Library**.

Write down: phone model ........ Android version ........ RAM (if you know) ........

## 2. Add the two AI files

The app needs two files before it can do anything clever. Open the menu (top left), go to **Settings**, find **AI Models**.

| File                        | Size   | What it does                       |
| --------------------------- | ------ | ---------------------------------- |
| Llama 3.2 1B Instruct       | 770 MB | Writes the summaries and answers   |
| BGE Small English v1.5 Q8_0 | 35 MB  | Finds the right part of your notes |

**Try this first:** tap **Download** next to each one (use Wi-Fi). Wait for "Installed".

**If Download does not start or gets stuck after a minute**, do it by hand instead:

1. On the phone's browser, download these two files:
   - https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf
   - https://huggingface.co/CompendiumLabs/bge-small-en-v1.5-gguf/resolve/main/bge-small-en-v1.5-q8_0.gguf
2. In StudyBee, Settings, tap **Import model (.gguf)** and pick each file from **Downloads**.

- [ ] Both models show **Installed**
- [ ] Which way worked? Download / Import ........

## 3. Try it

Use a PDF with text you can select (not a photo or scan). One of about 10 pages is perfect.
After each step, look at the screen and tick it if it did what is written.

- [ ] **Upload.** On My Library, tap Upload Document, pick the PDF, type a name, tap Import. It appears in the list. Time it took: ........ seconds
- [ ] **Summary.** Open the menu, Summaries, tap Generate summary. Words appear and a summary stays on screen. Time: ........ seconds
- [ ] **Flashcards.** Menu, Flashcards, tap Generate flashcards. Cards appear. Tap a card to flip it, then tap "Got it". Time: ........ seconds
- [ ] **Questions.** Menu, Questions & answers, tap Generate questions. Questions with answers appear. Time: ........ seconds
- [ ] **Ask your own question.** On the same screen, ask about something that is in your PDF. The answer makes sense. Time: ........ seconds
- [ ] **History.** Menu, History. Everything you made is listed. Tap one and it opens.
- [ ] **Rename and delete.** On My Library, press and hold your PDF. Rename it, then delete it.
- [ ] **Close and reopen.** Fully close the app, open it again. Your things are still there.
- [ ] **No internet.** Turn on airplane mode and make a summary. It still works.
- [ ] **Scanned PDF.** Upload a scan or photo PDF. The app says it has no selectable text and does not crash.
- [ ] **Back button.** Press your phone's Back button on any screen. It goes to My Library. On My Library it closes the app. Nothing crashes.

Flashcards and questions can sometimes fail with "Couldn't read the AI's answer". Tap generate
again. Write down how many times out of 3 it worked: Flashcards ......../3 Questions ......../3

## 4. Tell the group

Send these back (a screenshot of this page with the blanks filled in is fine):

- the phone details from step 1
- every box you ticked or could not tick, and what went wrong
- the times you wrote down
- anything slow, strange, or that crashed, and what you were doing at the time

**Stop and tell us straight away if:** the app crashes or goes blank while making something, it
will not install, or the models will not install either way.

---

## Optional: exact numbers (for the person writing the report)

Stopwatch times are fine. For exact figures, connect the phone to a laptop with USB debugging on
and run `adb logcat -s ReactNativeJS`. The app prints one line for each of these:

- `[generation] loaded Llama-... in <ms>ms`: Llama loading (only the first time after the app starts)
- `[generation] <seconds>s, prompt tokens <n>, output tokens <n>`: one generation. Tokens per second is output tokens divided by seconds
- `[embedding] embedded <n> chunks in <ms>ms`: the first question on a new PDF
- `[retrieval] top 5 of <n>: ...`: the search worked. If you see `[pipeline] retrieval failed, using sampled chunks` instead, the search model was not used

Prompt tokens plus 600 must stay under 4096. Emulator numbers must not be used for Deliverable 5.
