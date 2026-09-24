# PRIVACY AND DATA — INTERNET DETECTIVE

Two things: an accurate inventory of what the app stores, and the answers to
the App Store privacy questionnaire and the Google Play Data Safety form that
follow from it. Section 4 is a policy you can publish as-is.

**The short version: the app collects nothing, transmits nothing, and has no
server to transmit it to.** That is unusual enough that it is worth stating
plainly rather than hedging — and unusual enough that both consoles will make
you confirm it, so the evidence is set out below.

---

## 1. What the app stores — the complete inventory

Everything is written to the device's own app-private storage (`AsyncStorage`
→ `NSUserDefaults`-backed file on iOS, `SharedPreferences` on Android), under
four keys. Nothing else is written anywhere.

| Storage key | Contents | Personal data? |
| --- | --- | --- |
| `internet-detective.app-shell` | Audio volumes, haptics on/off, reduce-motion, high-contrast, text size, and the last screen you were on. | No |
| `internet-detective.case-sessions` | Your investigation: which evidence you have found and read, your notes, the strings and contradictions on the board, card positions, board zoom, pinned timeline events, deductions attempted and solved, hints used, play time, and score. | No |
| `internet-detective.player-profile` | Detective level, experience total, completed cases, achievements earned. | No |
| `internet-detective.entitlements` | Which cases and collections you own, how each was obtained, and when. | No |

Plus `.backup` and `.corrupt` siblings of those keys — a rolling copy of the
last readable save, and quarantine for a payload that failed to parse, so a
corrupted file never silently erases progress.

**Not stored anywhere, in any form:** name, email address, phone number,
username, account, password, date of birth, gender, address, precise or coarse
location, contacts, calendar, photos, microphone or camera capture, device
identifier, advertising identifier, IP address, crash report, or analytics
event.

### Notes you write

The evidence board lets you type notes on evidence cards. They are free text,
so you *could* type personal information into one. Those notes are stored in
the same app-private save file as the rest of the case, are never transmitted,
and are deleted with the app. The app does not read, index, or upload them.

### Deletion

Uninstalling removes everything. In-app, Settings → Reset shell position
restores defaults, and the developer QA console (development builds only) can
clear the whole save.

On Android, `android:allowBackup` is left at the platform default, so Android's
own Auto Backup may copy the save file to the user's Google Drive backup under
their own account. That is the device owner's backup of their own data; the
developer has no access to it and no visibility of it.

---

## 2. What the app transmits

Nothing.

| Claim | How it is verified |
| --- | --- |
| No network requests | A test fails the build if `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, or `sendBeacon` appears anywhere in `src`. |
| No remote URLs | A test fails the build if any `http(s)://` string literal appears in application source. |
| No analytics, crash reporting, auth, or backend SDK | A test fails the build if any such package appears in `dependencies`. |
| No arbitrary loads on iOS | `NSAppTransportSecurity.NSAllowsArbitraryLoads` is `false`. |
| No over-the-air updates | `updates.enabled` is `false`; the binary cannot change after install. |
| No ad identifier | No advertising SDK, no `AD_ID` permission, no ads of any kind. |

The `INTERNET` permission remains in the Android manifest because the React
Native runtime declares it. The game issues no requests over it. It is a normal
permission and Android shows the player no prompt for it.

### The in-game internet

Case 001 contains six fictional websites. They are structured TypeScript data
compiled into the app and rendered by an in-game browser. They cannot reach a
real domain, and no clue anywhere in the game depends on a real website. The
whole case works in airplane mode, on first launch, forever.

---

## 3. Console answers

### App Store — App Privacy

Select **"Data Not Collected"** for the app as a whole. No data types, no
purposes, no tracking. `NSPrivacyTracking` is false; there is no tracking
domain and no `ATTrackingManager` prompt.

If asked about required reason APIs (`NSPrivacyAccessedAPITypes`): the app uses
`UserDefaults`, reason code **CA92.1** — access only to app-private data, never
transmitted off device. No file-timestamp, disk-space, active-keyboard, or
system-boot-time API is used.

### Google Play — Data Safety

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **No** |
| Is all user data encrypted in transit? | Not applicable — no data is transmitted |
| Do you provide a way for users to request data deletion? | Not applicable — uninstalling deletes everything; no server copy exists |
| Does your app contain ads? | **No** |
| Target audience | 13+ (not directed at children; do not enrol in the Families programme) |
| Financial info / purchases | In-app purchases are processed entirely by the store; the app never sees or stores payment data |

### Google Play — additional declarations

- **Ads:** none, of any kind.
- **News app:** no.
- **COVID-19 contact tracing:** no.
- **Data safety "collected" vs "processed ephemerally":** neither; nothing
  leaves the device at all.

---

## 4. Privacy policy — ready to publish

Publish this at the address you will paste into `PLACEHOLDER_PRIVACY_POLICY_URL`.
Replace the bracketed items.

> ## Privacy Policy — INTERNET DETECTIVE
>
> Last updated: [DATE]
>
> ### The short version
>
> INTERNET DETECTIVE does not collect your data. It has no account system, no
> servers, and no analytics. Nothing you do in the game is sent anywhere.
>
> ### What is stored on your device
>
> The game saves your progress on your device so you can put it down and come
> back: your settings, which evidence you have found, notes you have written,
> the layout of your evidence board, your detective level and achievements, and
> which cases you own.
>
> This information stays in the app's private storage on your phone. It is not
> uploaded, backed up to us, shared, or sold. We cannot see it.
>
> ### What is not collected
>
> We do not collect your name, email address, phone number, location, contacts,
> photos, microphone or camera input, device identifiers, or advertising
> identifiers. We do not use analytics or crash reporting. We do not show
> advertising. We do not track you across apps or websites.
>
> ### Permissions
>
> The game requests no sensitive permissions. It does not ask for your camera,
> microphone, location, contacts, or messages. On Android it declares the
> standard internet permission required by its application framework, and
> vibration for haptic feedback; it makes no network requests.
>
> ### Purchases
>
> Additional cases can be bought as one-time purchases. Payment is handled
> entirely by Apple or Google. We never see your payment details. The game
> stores only a local record of what you own.
>
> ### Children
>
> The game is not directed at children under 13 and collects no data from
> anyone.
>
> ### Deleting your data
>
> Uninstalling the app removes everything it has stored. There is no server
> copy, so there is nothing else to request the deletion of.
>
> ### Changes
>
> If this policy changes, the updated version will be posted here with a new
> date.
>
> ### Contact
>
> [SUPPORT EMAIL]

---

## 5. Not added, on purpose

No analytics SDK was added for the sake of "store readiness". Neither store
requires one, an empty privacy label is an asset rather than a gap, and adding
data collection so there is something to declare would be exactly backwards.
