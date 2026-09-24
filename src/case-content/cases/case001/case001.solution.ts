/**
 * SPOILER-SEALED AUTHORING RECORD — NOT SHIPPED.
 *
 * The written truth of Case 001: who, how, why, where the stone went, and the
 * order it happened in.
 *
 * **Nothing in the application imports this file.** It is read by the
 * authoring tests, and by the developer QA console through a `require` that
 * only executes in a development build. That is what keeps this prose out of
 * the production bundle — for a while it was in there, dragged in because the
 * engine's answer key shared the module, and `strings` on the binary would
 * print the solution. The answer key now lives in `case001.truth.ts`.
 *
 * If you need something from here in app code, the answer is no.
 */
export const CASE001_SOLUTION_RECORD = {
  perpetratorId: 'suspect-adrian-cross',
  accompliceId: 'suspect-elias-ward',
  stolenObject: 'The Asterion Diamond',
  motive:
    'Adrian Cross needed to clear a concealed private debt of 96,000 called by a private lender on 06 OCT and never declared to museum vetting. Elias Ward arranged an illicit buyer and financed the museum-grade replica, paying Cross in two settlements of 48,000.',
  exclusions: {
    'suspect-celeste-vane':
      'Signed broadcast frames at 21:14:36, 21:17:08, and 21:20:41 hold her in the Rotunda, and the insurance rider names the Rook Trust as loss payee, so the museum gains nothing from a loss.',
    'suspect-mara-bell':
      'Biometric entry at 21:08:09, RM-2 autosaves through 21:23, biometric exit at 21:24:31, and a live source call from 21:11 to 21:24 cover the whole window. The panel event used duplicate token DT-884, while her physical card MC-04-P remained in the office safe.',
    'suspect-julian-rook':
      'The terrace camera holds him from 21:13:00 to 21:24:21 on a call recorded in his creditor thread, and the stone cannot be sold out of trust with a published inclusion map.',
    'suspect-nia-okafor':
      'Her signed press-alcove recording runs unbroken from 21:16:02 to 21:22:18 with continuous Rotunda audio, and she holds no credential, uniform, or bypass key.',
    'suspect-elias-ward':
      'The niche extension carried one continuous corded call from 21:14:06 to 21:22:58, the recess has a single doorway under the lounge camera, and no exit is recorded. He financed and brokered the theft but could not perform the exchange.',
  },
  method:
    'Cross created a clone of Mara Bell’s revoked conservator credential from the security administration terminal. During the scheduled 21:17 power transfer, he replayed ninety seconds of Gallery Four footage, entered through the east service cavity with a security bypass key, and exchanged the diamond for the commissioned replica.',
  concealment:
    'Cross sealed the real Asterion inside the battery cavity of retired emergency radio R-17 in Loading Locker B, ready for a later handoff to Ward.',
  framingAttempt:
    'The cloned conservator credential, Mara’s known criticism of the display climate, and her confidential contact with Nia Okafor were intended to make Bell appear responsible for both the access and the leak.',
  deterministicSequence: [
    'Twelve days before the gala, Ward commissioned a replica through Northline Events, a shell controlled from his auction office.',
    'At 20:52 on gala night, Cross used security terminal AS-01 to generate a duplicate of Bell credential MC-04 and suppressed the automated alert.',
    'Cross placed the replica and a triangular security bypass key in his uniform jacket before leaving the east desk at 21:12.',
    'At 21:17, the preannounced generator-transfer test created a short lighting transition without disabling the plinth battery circuit.',
    'Cross injected a repeated Gallery Four video segment while the transfer warning occupied the control monitors.',
    'The cloned MC-04 credential opened the east service panel at 21:17:43.',
    'Cross crossed the east corridor, shedding a navy aramid fiber from the torn cuff of his security jacket.',
    'The triangular bypass key opened the plinth service hatch without breaking its public glass seal.',
    'Cross exchanged the Asterion for the replica and restored the hatch before the replay ended at 21:21.',
    'He returned through the corridor and concealed the real stone inside radio R-17 in Loading Locker B.',
    'Ward remained visible in the auction lounge at the edges of the theft window but sent the agreed completion signal and transferred the second payment afterward.',
    'The diamond remained in Locker B because the gallery lockdown began before the planned loading-dock handoff.',
  ],
} as const;
