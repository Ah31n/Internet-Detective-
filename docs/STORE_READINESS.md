# APP STORE + GOOGLE PLAY READINESS — INTERNET DETECTIVE

Phase 18. The project is configured for real distribution and the submission
work that requires a human is listed precisely.

**Nothing has been published.** No app record exists, no certificate was
created, no credential was invented. This phase makes the project ready for
the console work, and says clearly where that work begins.

---

## 1. What the audit found

Three real problems, all of them invisible in the source, all of them
introduced by library defaults rather than by anything the game does. They were
found by generating the native projects and reading the manifests.

### The game was asking for your microphone

`expo-audio`'s config plugin defaults to `recordAudioAndroid: true` and adds
`NSMicrophoneUsageDescription`. Listed as a bare `"expo-audio"` plugin string,
the build produced:

```
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<key>NSMicrophoneUsageDescription</key>
<string>Allow $(PRODUCT_NAME) to access your microphone</string>
```

The game has never recorded anything — it plays short bundled cues and room
tone. Shipped as-is, the Play listing would have shown a microphone permission
on a detective game, and an App Store reviewer would reasonably have asked why.

### The game was declaring background audio

The same plugin defaults to `enableBackgroundPlayback: true`, which produced
`UIBackgroundModes: [audio]` plus `FOREGROUND_SERVICE` and
`FOREGROUND_SERVICE_MEDIA_PLAYBACK`. A case file should stop when the phone is
put down, and background audio is an entitlement that invites review questions.

### The game was asking for storage and the dev launcher's local network

`READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` came from `expo-image`'s
manifest (for loading images from a user's gallery — every image here is
bundled). `SYSTEM_ALERT_WINDOW` came from React Native's debug overlay.
`NSLocalNetworkUsageDescription` came from `expo-dev-client`, announcing to
reviewers and to the privacy label that an entirely offline game wanted the
local network.

### Before and after

| | Before | After |
| --- | --- | --- |
| Android permissions | 9, including `RECORD_AUDIO` | **3** |
| iOS usage descriptions | 2, including microphone | **0** |
| iOS background modes | `audio` | none |

```
android.permission.INTERNET                required by the RN runtime; unused
android.permission.VIBRATE                 haptics on the evidence board
android.permission.MODIFY_AUDIO_SETTINGS   ambient beds and interface cues
```

No contacts, microphone, camera, location, SMS, storage, notifications, or
advertising identifier. Held in place by tests, because the next dependency
upgrade could quietly add one back.

---

## 2. Configuration

`app.json` is replaced by **`app.config.ts`**, so each decision carries its
reason. Highlights:

| Setting | Value | Why |
| --- | --- | --- |
| `version` | `1.0.0` | First release version |
| `ios.buildNumber` / `android.versionCode` | `1` / `1` | Local fallback; EAS increments remotely |
| `orientation` | `portrait` | Nothing in the game is designed to rotate |
| `userInterfaceStyle` | `dark` | The game has one look; following the system theme would fight the art |
| `backgroundColor` | `#121511` | The launch surface never flashes white |
| `ios.supportsTablet` | `false` | Phone-first by design; an unconsidered iPad build is worse than none |
| `updates.enabled` | `false` | An authored mystery should not change under the player |
| `ITSAppUsesNonExemptEncryption` | `false` | Answers export compliance once, not on every TestFlight upload |
| `NSAllowsArbitraryLoads` | `false` | Makes "no network" enforceable at the platform level |
| `android.blockedPermissions` | storage, alert window | Strips what libraries add behind our back |

`plugins/withReleaseHygiene.js` removes `expo-dev-client`'s Info.plist keys
from release builds; `expo-dev-client` itself moved to `devDependencies`.

Safe area was already correct and was re-verified: `SafeAreaProvider` at the
root, every screen through a `Screen` component with all four edges, and the
evidence board insetting its own trays from `useSafeAreaInsets`.

---

## 3. Offline

Case 001 is fully playable with no connection, on first launch, permanently.

| Requirement | Status |
| --- | --- |
| No AI API | No AI SDK, no model call. Canonical truth is a fixed data table, authored and deterministic. |
| No external website | Six fictional sites are compiled-in TypeScript data. The in-game browser cannot reach a real domain. |
| No remote database | All state is device-local under four `AsyncStorage` keys. |
| No authentication | No account, no sign-in, no identity of any kind. |

Enforced by tests that fail the build on any `fetch`, `XMLHttpRequest`,
`WebSocket`, `EventSource`, or `sendBeacon`; on any `http(s)://` literal in
application source; and on any networking, analytics, auth, or backend package
in `dependencies`.

---

## 4. Data

`docs/PRIVACY.md` holds the full inventory, the console answers, and a
publishable policy. In summary: **four local storage keys, nothing
transmitted, nothing collected.** App Store → *Data Not Collected*. Play Data
Safety → *no data collected or shared*.

No analytics were added for the sake of store readiness. Neither store requires
any, and adding collection so there is something to declare would be exactly
backwards.

---

## 5. Store assets

`docs/STORE_LISTING.md` contains the finished name, subtitle, short
description, full description, keywords, categories, the screenshot plan with
required pixel sizes, feature-graphic spec, and the age-rating questionnaire
answers.

Ready now: the 1024 × 1024 master icon and both Android adaptive layers.
Still to produce: screenshots from a release build, the mandatory 1024 × 500
Play feature graphic, and the hosted privacy and support pages.

URLs are `PLACEHOLDER_*`. A plausible-looking privacy policy link that resolves
to nothing is a rejection and a credibility problem; a blank is honest.

---

## 6. Building

```bash
# One time
npx eas init                      # creates the project, writes owner + projectId
npx eas credentials               # lets EAS generate and store signing keys

# Builds
npx eas build --profile preview    --platform all   # release code path, internal
npx eas build --profile production --platform all   # AAB + iOS archive

# Submission (after filling in the placeholders in eas.json)
npx eas submit --profile production --platform ios
npx eas submit --profile production --platform android
```

The Android production profile builds an **app bundle**; the first Play upload
is configured to land as a **draft on the internal track**, which is the right
place to discover a problem.

`android/` and `ios/` are not committed. The project uses continuous native
generation — EAS runs `expo prebuild` from `app.config.ts` on every build, so
the manifests cannot drift from the configuration. Run `npx expo prebuild` any
time you want to read them.

---

## 7. The QA checklist

The brief says not to declare the project production-ready until this is
addressed. It is addressed, and here it is.

### Verified in this phase

- [x] App name, bundle identifier, package, version, and build numbers set
- [x] Portrait lock, dark theme, and a launch surface that never flashes white
- [x] Icon and splash configured on both platforms; 1024 master and both
      adaptive layers present and correctly sized
- [x] Safe-area handling re-verified on every screen
- [x] Permissions cut from nine to three; zero iOS usage descriptions
- [x] No microphone, camera, contacts, location, SMS, storage, or ad identifier
- [x] No background audio entitlement
- [x] Developer tooling out of production dependencies and out of the plist
- [x] Case 001 verified playable offline — no AI, website, database, or auth
- [x] Data inventory complete; privacy policy drafted; both console forms answered
- [x] No analytics added for its own sake
- [x] Export compliance answered in config
- [x] EAS production and preview profiles configured; submit placeholders marked
- [x] No certificate, key, or credential in the repository
- [x] Store listing copy, screenshot plan, and age-rating answers written

### Carried forward from earlier phases, re-confirmed here

- [x] Case 001 complete: 48 evidence, 6 suspects, 10 scenes, 25 timeline
      events, 6 fictional sites, 7 deductions, one deterministic solution
- [x] Canonical solution absent from the production binary — verified by
      grepping a compiled release bundle (`npm run verify:release`)
- [x] Developer QA tools absent from the production binary — same check
- [x] Accessibility: contrast, touch targets, dynamic type, reduce motion,
      screen-reader names, colour never used alone
- [x] Performance: board render discipline, image budgets, memory budgets
- [x] Lifecycle: launch → background → foreground → navigate → background →
      return, with byte-identical state
- [x] No ads, energy, lives, loot boxes, or countdown timers

### Requires a developer account — cannot be done here

- [ ] `npx eas init`; Apple and Google developer accounts
- [ ] Signing credentials via `npx eas credentials`
- [ ] Replace every `PLACEHOLDER_*` in `eas.json` and `docs/STORE_LISTING.md`
- [ ] Host the privacy policy and support page
- [ ] Capture screenshots; produce the feature graphic
- [ ] Complete both age-rating questionnaires and both privacy forms
- [ ] Register the in-app purchase products from `src/core/commerce/catalog.ts`
      as **non-consumable** items, and implement the platform billing adapter
      (see `docs/COMMERCE.md` — the seam is built and honest about being unwired)
- [ ] Device testing on physical iPhone and Android hardware

### Status

**Ready for submission preparation, not yet submittable** — and the only
things standing between the two are the account-specific items above. The
build configuration, permissions, privacy posture, offline guarantee, and
listing content are done.

---

## 8. The final quality bar

The installed application should feel like a premium detective game, and not
like a website, dashboard, SaaS app, browser game, AI demo, or wrapped page.

It is a native Expo binary with no WebView anywhere in the dependency tree. It
opens on a dark editorial launch sequence rather than a login or a nav bar. Its
primary interaction is a corkboard you drag with one finger, pan with two, and
pinch to zoom, with springs and haptics. Its evidence is typeset as documents,
photographs, receipts, and surveillance stills. Its store is an anthology
contents page. Its profile is a typeset personnel record with a ledger, not a
tile of charts. It makes no network request, so there is no spinner to wait on
and nothing to demo. There is no dashboard, no card grid as a primary surface,
and no generic component anywhere in the visual language.

The remaining check that cannot be made from here is the one that matters most:
install a release build on real hardware and use it.
