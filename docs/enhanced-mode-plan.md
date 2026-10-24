# Enhanced Mode plan (cloud backend)

Status: **plan, not built yet.** Written 24 Oct 2026.

## 1. What it should do

The **Enhanced Mode** switch in Settings makes generation use a cloud AI model instead of the
on-device model. If the cloud is unreachable, too slow, or refuses, the app quietly falls back to
the on-device model (this fallback already exists in `InferenceRouter.dispatch`).

## 2. Replace or boost? Recommendation: replace

| Option                                                    | Effort | Notes                                                                                                                                                                                                             |
| --------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Replace** (cloud answers instead of the local model) | Low    | The app already has this path (`runCloud`) and the fallback. Cloud models are expected to follow the `Q:` / `A:` format reliably, which would fix the main weakness of the small local model (checked in Part C). |
| B. Boost (local draft first, then the cloud improves it)  | High   | Two model calls per request, double the waiting and two things that can fail, plus new prompts to refine a draft. Slower than A in every case.                                                                    |

Build **A**. Revisit B only if the group wants it after A works.

Retrieval stays on the phone in both cases: only the final prompt (the question plus the note
excerpts chosen for it) is sent to the cloud.

## 3. Architecture

```
phone app  --HTTPS-->  our small web service (Cloudflare Worker)  --HTTPS-->  Gemini API
 (no API key)            (holds the API key, limits abuse)                    (free tier)
```

Why a web service in the middle:

- An API key put inside the app can be extracted from the APK. The service keeps it as a secret.
- It limits the size and rate of requests, so one leaked app token cannot run up usage.
- It is the single place to change provider or model. It also gives the project a real web service, which the module name and the final presentation ask for.

### Which AI provider

What the research on 24 Oct 2026 showed, split by how sure it is:

- **Confirmed from official pages:**
  - Cloudflare Workers free plan: 100,000 requests a day, 10 ms of CPU per request (time spent waiting on another service does not count), and a limit of 50 outgoing requests per request ([pricing](https://developers.cloudflare.com/workers/platform/pricing/), [limits](https://developers.cloudflare.com/workers/platform/limits/)).
  - Gemini has a free tier with per-minute and per-day request caps that depend on the model. The exact current numbers and model list could **not** be confirmed (the official pages found disagreed). Read them in Google AI Studio before choosing a model ([rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)).
- **Not confirmed, check the provider's own page before relying on it:**
  - whether Google may use free-tier inputs to improve its products (assume yes, and say so in the consent message),
  - whether a Cloudflare account and a Google AI Studio key need a payment card (the plan assumes neither does),
  - whether Claude or ChatGPT have any free API access. Search results disagreed (some mention small trial credits that need billing). Treat them as paid. If the group has paid keys later, the service can switch provider by adding one small file and the app does not change.

**The core safety rule: the Google project that owns the AI Studio key must have no billing account attached.** Then a leaked token can only use up the free quota (the service then gets `429`, and the app falls back to the phone). It can never create a bill. That is why the service needs no rate limiting of its own at first.

Hosting: **Cloudflare Workers free plan**. (Firebase Functions was considered; it is believed to need a billing account, which is not confirmed.)

## 4. The contract (already used by the app)

`POST <service URL>/generate`, header `X-StudyBee-Key: <app token>`, JSON body `{ "prompt": string }`
Success: `200 { "text": string }`. Anything else is a failure and the app falls back to the phone.
The service answers `400` (bad body), `401` (bad token), `413` (prompt over about 16,000 characters),
`429` (rate limited), `502` (Gemini failed). It never logs prompts.

## 5. Work to do

**Part A: the service (`backend/` in this repo, with its own packages, excluded from the app's type check)**

1. `backend/src/index.ts`: check the token and the size (`413` over about 16,000 characters), call Gemini, return `{text}`. The provider lives in its own file (`providers/gemini.ts`). No rate limiting at first (see the safety rule above); add it only if abuse shows up.
2. Tests with a fake Gemini response: success, bad token, too large, `429`, Gemini error, empty answer.
3. `backend/README.md`: deploy steps.
4. Checks while building:
   - **Timeout.** Set `maxOutputTokens` in the service and keep any "thinking" mode off or low on the chosen model. Otherwise answers can take longer than the app's 30 s `CLOUD_TIMEOUT_MS` and the app would fall back to the phone every time. Measure this in the real request in Part C.
   - **Location errors.** Gemini can refuse requests from some regions ("user location is not supported"). Check for it in the first real request, since a Worker calls from Cloudflare's servers, not from the phone.
   - **Secrets can never be committed.** `.gitignore` already covers `.env*.local`. It also now covers `backend/.dev.vars` (the Worker's local secrets file), `backend/node_modules/` and `backend/.wrangler/`.
   - **Metro.** After `npm install` inside `backend/` (Wrangler downloads large files), confirm `npm start` still bundles the app. Add the folder to Metro's `blockList` if it does not.

**Part B: the app**

1. `config.ts`: read the service URL and the app token from `EXPO_PUBLIC_CLOUD_URL` and `EXPO_PUBLIC_CLOUD_TOKEN` (a `.env.local` file that is not committed, plus a committed `.env.example`). No native rebuild is needed. **Everyone who runs `npm start` needs their own `.env.local`**, otherwise Enhanced Mode stays "Cloud mode coming soon".
2. `InferenceRouter`: send the token header, check the phone is online first (the `expo-network` package is already installed) so an offline phone does not wait for a timeout, validate the reply, and report which engine answered. If the network state is unknown (`isInternetReachable` is `null`), try the cloud anyway.
3. Settings: the switch becomes usable when a service URL is configured. Turning it on shows a consent message naming the provider and what is sent. Off by default.
4. Screens: a small note under a result when the cloud answered, or when the cloud failed and the phone answered.
5. Tests: router tests with a fake `fetch` (success, `429`, timeout, bad reply, offline, token header) and the consent logic.
6. Docs: README section, changelog entry, deploy notes.

**Part C: checking it**

1. Without Google: run the real service code locally with `wrangler dev` (port 8787) and a fake Gemini reply, and reach it from the emulator at `http://10.0.2.2:8787`. Drive the UI: consent, a cloud answer shown, flashcards parsed from a well-formed reply, the service stopped and then the fallback to the phone, offline fallback.
2. With Google (needs your account and key): one real request from the emulator and then from a phone. Cloud models are expected to follow the `Q:` / `A:` format reliably, which is why this should fix the flashcard weakness, but that is only proven by this step.

## 6. What the group needs to provide

The assistant never sees or handles these secrets. Never paste a key into a chat.

1. A free Cloudflare account (for the Worker).
2. A free Google AI Studio API key, in a Google project **with no billing account**.
3. Agreement that Enhanced Mode is **opt-in** with a consent message.
4. Approval to install Wrangler (Cloudflare's tool) from npm into `backend/`.
5. You run `wrangler login`, `wrangler secret put GEMINI_API_KEY`, `wrangler secret put APP_TOKEN` and `wrangler deploy`, then put the service URL and token into `.env.local`.

Nothing is built until the group approves this plan.

## 7. Risks

- Free tier limits and rules change. The app handles refusals by falling back to the phone, and the no-billing-account rule means they can never cost money.
- The app token ships inside the app, so it only deters casual misuse. The size limit, the free-quota-only key and the phone fallback are the real protection. If it is abused, rotate the token and the key, and add rate limiting then.
- The text of the user's notes leaves the phone when the mode is on. That is the privacy trade-off, and why it needs consent and is off by default.
- Cloud answers are not capped to the on-device 600-token output limit, so a cloud answer can be longer. Screens already scroll.
