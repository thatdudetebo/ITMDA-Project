# Test log (emulator, development model)

This is the factual record of what was run and what happened, as input for Deliverable 5. It is
**not** the final Deliverable 5 document: the group should re-run the important rows, add
screenshots or screen recordings as proof (the guide asks for proof of testing), and write the
testing plan and narrative in its own words.

**Environment:** Android emulator "Medium Phone", API 37, arm64, driven through the real user
interface (taps, typing, the real system file picker). Models: SmolLM2 135M (development stand-in,
**not** the production Llama) and BGE small (search). Date: 24 Oct 2026.
**Real-phone rows are still empty:** see `docs/phone-test-checklist.md`.

Result key: **Pass** = behaved as expected. **Partial** = part of the expected behaviour was seen. **Not run** = not tested yet.

## 1. Functional tests

| ID  | Feature             | What was tested                                                             | Expected                                                                    | Actual                                                                      | Result |
| --- | ------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------ |
| F1  | Upload (create)     | Pick a PDF with the system picker, accept the prefilled title popup, import | Progress shown, material appears in the library and becomes selected        | As expected. Picker listed only PDFs                                        | Pass   |
| F2  | Library (read)      | Open Home after several imports                                             | Materials newest first with dates, selected one highlighted                 | As expected                                                                 | Pass   |
| F3  | Rename (update)     | Press and hold a material, choose Rename, type a new title, Save            | Title changes in the library                                                | "Second" became "Biology 101"                                               | Pass   |
| F4  | Delete material     | Delete the selected material and confirm                                    | Row, stored PDF and results removed; selection cleared; Home asks to choose | As expected; stored file count dropped from 3 to 2                          | Pass   |
| F5  | Remember selection  | Select a material, kill the app, reopen                                     | Same material still selected                                                | As expected after fixing bug B1 (see below)                                 | Pass   |
| F6  | Model install       | Settings, Import model, pick a 100 MB .gguf                                 | "Model ready" message, "Installed" with size, Home warning disappears       | As expected                                                                 | Pass   |
| F7  | Profile             | Enter a name and valid email, Save, kill and reopen the app                 | "Profile saved." and the values are still there                             | As expected                                                                 | Pass   |
| F8  | Summary             | Generate a summary                                                          | Text streams in, result saved and shown with local time                     | As expected (small model: low quality text)                                 | Pass   |
| F9  | Ask your material   | Ask "What is the Calvin cycle?" with the search model installed             | Searches the notes, streams an answer, saves it                             | Top chunks found (same scores as the isolated test), answer saved and shown | Pass   |
| F10 | Flashcards (read)   | Open Flashcards with two decks                                              | Newest deck selected, chips for both, "Mastered 0 of 3"                     | As expected                                                                 | Pass   |
| F11 | Flashcards (update) | Flip a card, tap "Got it"                                                   | "Mastered 1 of 3", saved in the database                                    | Database `MasteryLevel` changed to 1                                        | Pass   |
| F12 | Switch deck         | Tap the other deck chip and back                                            | Each deck keeps its own mastery                                             | As expected                                                                 | Pass   |
| F13 | Flashcards (delete) | Delete a deck and confirm                                                   | Deck and its cards removed, the other deck shown                            | Cards removed with the deck (4 cards left, all from the other deck)         | Pass   |
| F14 | Q&A display         | Open Questions with a saved Q&A set                                         | Question and answer cards shown                                             | As expected (stored data, not generated)                                    | Pass   |
| F15 | History             | Open History                                                                | Rows grouped under the material titles, newest first                        | Grouped under "Biology 101" and "Mathematics" (titles, not file names)      | Pass   |
| F16 | History paging      | Open History with 58 rows                                                   | 50 rows, "Load more" appears, loads the other 8, then disappears            | As expected                                                                 | Pass   |
| F17 | Open from History   | Tap a summary, a flashcards row, a free-form row                            | The right screen opens with exactly that result, material becomes selected  | As expected                                                                 | Pass   |
| F18 | History (delete)    | Press and hold a row, confirm                                               | Row removed                                                                 | Database rows 60 to 59                                                      | Pass   |
| F19 | Continue link       | Tap the Continue link on Home                                               | Opens the newest result's screen                                            | As expected                                                                 | Pass   |
| F20 | Navigation menu     | Open the menu, visit all six screens                                        | All reachable, dark theme throughout                                        | As expected                                                                 | Pass   |

## 2. Edge cases and invalid input

| ID  | Feature                         | What was tested                                      | Expected                                                                       | Actual                                                                                                                                                     | Result  |
| --- | ------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| E1  | Title validation                | Clear the title and tap Import                       | Inline error "Enter a title for this material."                                | As expected                                                                                                                                                | Pass    |
| E2  | Scanned PDF                     | Import a PDF with no selectable text                 | Friendly error, nothing stored                                                 | "no selectable text" error, no row and no stored file left                                                                                                 | Pass    |
| E3  | Email validation                | Save an invalid email, then a valid one              | Error "Enter a valid email address...", then "Profile saved."                  | As expected                                                                                                                                                | Pass    |
| E4  | Empty question                  | Tap Ask with nothing typed                           | "Type a question first." and no model run                                      | As expected                                                                                                                                                | Pass    |
| E5  | Missing search model            | Ask a question with no BGE model installed           | The question is still answered from a sample of the notes                      | Retrieval failed and the app fell back to sampled notes (seen in the log). The on-screen hint was added afterwards and has not been seen on the device yet | Partial |
| E6  | Unreadable model answer         | Generate flashcards with the small model             | A readable error, streamed text cleared, no deck or history row saved          | "Couldn't read the AI's answer. Please try again." and nothing saved                                                                                       | Pass    |
| E7  | Deleted deck in History         | Open the History row of a deck that was deleted      | Its saved cards shown read-only with an explanation, no crash                  | "This deck was deleted. Showing the cards saved in your history."                                                                                          | Pass    |
| E8  | Stale result                    | Open an older summary from History, leave, come back | The newest summary is shown                                                    | As expected                                                                                                                                                | Pass    |
| E9  | No model installed              | Start with no models                                 | Warning banner on Home that opens Settings                                     | As expected (banner only; pressing Generate with no model was not run)                                                                                     | Pass    |
| E10 | Pressing Generate with no model | Tap Generate with no model installed                 | Message "No AI model is installed. Install one in Settings."                   | Not run on the device (covered by the code path only)                                                                                                      | Not run |
| E11 | Double tap Import               | Tap Import twice quickly                             | Only one import                                                                | Not run on the device (guarded in code)                                                                                                                    | Not run |
| E12 | Airplane mode                   | Generate and ask with no network                     | Everything still works (all on the device)                                     | Not run                                                                                                                                                    | Not run |
| E13 | Android Back button             | Press Back on each screen                            | Returns to My Library (drawer default), no crash; on My Library the app closes | Not run                                                                                                                                                    | Not run |

## 3. Usability observations

- Long operations always show what is happening: the import steps, "Searching your notes and loading the AI model...", "Writing your summary...", and the text streams as it is written.
- Destructive actions always ask first, and press and hold is explained on the Home screen.
- The logo is only 29 x 22 pixels and looks blurry. A higher-resolution image is needed from the designer.
- The 135M development model writes poor summaries and often ignores the flashcard format. Judge answer quality only with the Llama model.

## 4. Bugs found by testing, and how they were fixed

| ID  | Bug                                                                                         | Found by               | Fix                                                                                    |
| --- | ------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| B1  | After restarting, no material was selected (two startup loads overwrote each other)         | Kill and reopen test   | Loads now run one at a time and the choice is kept immediately                         |
| B2  | PDF import failed with "file not found" (the file copy was asynchronous but not awaited)    | Emulator import test   | Added the missing wait, and the test fake now behaves like the real module             |
| B3  | History row of a deleted deck showed a different deck's cards                               | Open from History test | An opened result shows its own deck or its saved cards read-only, never another deck   |
| B4  | Times were shown in UTC, two hours behind                                                   | Summary test           | All screens convert to local time                                                      |
| B5  | Generation crawled at about 0.5 tokens/s while the screen animated (emulator without a GPU) | Free-form question     | Spinner replaced by a text label, text updates throttled; the same run then took 218 s |
| B6  | A button's accessible name was "busy" instead of its label                                  | Interface dump         | Explicit accessible label                                                              |
| B7  | The menu and header were white on a dark app                                                | Screenshot             | Navigation theme                                                                       |
| B8  | A retrieval failure or blank chunk could break questions for a material permanently         | Code review            | Blank chunks get a stand-in vector, oversized chunks are retried shorter               |

## 5. Automated checks (no device)

`npm test` runs isolated tests of the logic that does not need a phone: the answer parser, chunk
sampler, PDF import (with a fake file system), chunker, embeddings and retrieval (with a fake
model), generation pipeline, active material and date formatting. The test files are in `tests/`.
Run `npm run typecheck` and `npm run format:check` as well. Result at the time of writing: all
tests passing (see the end of the `npm test` output for the exact count).

## 6. Timings seen on the emulator (do not quote as performance)

| Step                                           | Time on the emulator                                    |
| ---------------------------------------------- | ------------------------------------------------------- |
| Import a 6 page, 17 KB PDF                     | about 28 s (minutes if the screen is polled constantly) |
| Embed 8 chunks (first question)                | about 6.7 s                                             |
| Generate 600 tokens (small model, idle screen) | about 80 s                                              |
| Same, with the live screen                     | 180 to 240 s                                            |

The README forbids using emulator timings for Deliverable 5 performance figures. Measure these
again on a real phone with the Llama model.
