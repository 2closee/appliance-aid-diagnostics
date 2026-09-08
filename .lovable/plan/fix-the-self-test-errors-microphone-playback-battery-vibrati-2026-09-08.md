# Fix the self-test errors: microphone playback, battery, vibration

## What is actually happening

These three messages are not bugs in FixBudi's logic — they come from what the phone's browser is willing to let a web page do. All three appear together on iPhones (Safari, and any browser on iOS, since they all use Safari's engine):

- **Battery: "Battery API not available"** — Safari/iOS never reports battery level or charging state to a web page. Chrome on Android does. So the message is correct, but it reads like a failure instead of "your phone doesn't share this".
- **Vibration: "Vibration API unavailable"** — same story: iOS does not let a web page vibrate the phone. Android Chrome does (and only after the user has tapped something, and only if silent/vibrate mode allows it).
- **Microphone: records, then playback is silent or errors** — the current test hard-codes a recording format the iPhone cannot produce or play back. It also treats "no recording produced" as an unclear error rather than telling the person what to do. On some Android phones the same happens when the browser only supports a different format.

So instead of leaving the person with three scary red messages, the test should either measure the thing a different way, or clearly say "your phone doesn't allow this in the browser — here's the manual check", and pass those observations to the AI assistant.

## What we will change

### 1. Microphone test — make recording work everywhere, and add a live level meter
- Pick a recording format the phone actually supports instead of assuming one, and record without forcing a format if none matches.
- While recording, show a live loudness meter and capture a peak loudness value. This is the real signal: if the meter never moves while the person is talking, the mic is not picking up sound — regardless of whether playback works.
- Keep the 3-second playback, but make it optional evidence rather than the pass condition; the "I can hear myself" button no longer stays locked when playback isn't possible on that phone.
- Replace raw technical errors with plain guidance: permission blocked, mic in use by another app, or no sound detected.
- Record the measured peak loudness in the result detail so the AI assistant sees a number, not just "silent".

### 2. Battery test — reframe, don't fail
- When the phone doesn't share battery data, show it as "Not available on this phone's browser" (neutral, not an error) with a short explanation.
- Ask two quick questions instead: does the phone lose charge unusually fast, and does it get hot or stop charging? Capture the answers as the result detail so the AI has something useful.

### 3. Vibration test — reframe, plus a manual check
- Same neutral wording when vibration isn't allowed.
- Offer a manual check: ask the person to set a short ring/notification or press keys and confirm whether they feel any vibration at all, and record that answer.
- On Android, keep the vibrate button but tell people to take the phone off silent-with-vibration-off first, since that alone makes it feel broken.

### 4. Results summary wording
- Show "Not supported on this phone" distinctly from "Failed", so a completed scan on an iPhone doesn't look like a broken phone.
- Add one line at the top of the summary noting which checks the browser could not perform, so expectations are clear before results are shared with the AI or a repair center.

## Technical notes

- Files touched: `src/components/selftest/tests/MicrophoneTest.tsx`, `BatteryTest.tsx`, `VibrationTest.tsx`, `src/components/selftest/ResultsSummary.tsx`, and small copy/detail additions in `src/lib/selftest/handoff.ts`.
- Microphone: probe `MediaRecorder.isTypeSupported` across `audio/mp4`, `audio/webm;codecs=opus`, `audio/webm`, `audio/ogg`; fall back to `new MediaRecorder(stream)` with no options. Add an `AudioContext` + `AnalyserNode` RMS/peak sampler during capture (resumed on the user gesture, closed on stop) and use peak level as the objective pass/fail signal. Blob type must match the chosen mime so the `<audio>` element can play it.
- Battery/Vibration unsupported paths keep `status: "unsupported"` but gain answer-derived `detail` text; `types.ts` statuses stay unchanged.
- No backend, schema, or business-logic changes; nothing outside the self-test flow is affected.

## Out of scope

A browser still cannot read battery health percentage, cycle count, motherboard or chip-level faults on any phone. Those remain the AI assistant's follow-up questions plus a partner repair center's physical inspection.
