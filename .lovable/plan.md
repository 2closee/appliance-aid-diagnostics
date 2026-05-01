## Plan: On-Device Self-Diagnostic (MVP + AI Hand-off)

### What we're building
A browser-based "Run Self-Diagnostic" tool that walks the user through real, executable device tests, then hands the failed results to the existing AI diagnostic chat for follow-up and (if needed) repair-center routing.

**Important honesty caveat:** The browser cannot perform deep internal hardware scans (motherboard, ICs, NAND wear, etc.). We test what the browser is actually allowed to test — which is still genuinely useful for triaging the most common phone complaints.

---

### Scope (MVP tests)

| Test | How it works | What it catches |
|---|---|---|
| Battery & charging | `navigator.getBattery()` (Android Chrome) | Bad battery, not charging |
| Screen | Full-screen color bars (R/G/B/W/black) + dead-pixel sweep | Dead pixels, screen burn, tint |
| Touch | Grid where user must tap every cell + multi-touch detection | Dead zones, digitizer fault |
| Camera (front + rear) | `getUserMedia` preview, user confirms image is clear | Cracked lens, software access |
| Microphone | Record 3s, play back, user confirms | Dead mic, muffled audio |
| Speaker | Play test tone at low/mid/high freq | Blown speaker, distortion |
| Vibration | `navigator.vibrate()` patterns, user confirms felt | Dead haptic motor |

Each test produces `pass | fail | skipped | inconclusive` + optional user note.

---

### Entry points (both)

1. **New page `/self-test`** — standalone, with prominent CTA from homepage hero (`src/pages/Index.tsx`) and `Navigation` link.
2. **Inside existing AI Diagnostic** (`src/pages/Diagnostic.tsx`) — add an early step "Want to run quick device tests first?" that launches the same flow inline.

### AI hand-off

When the user finishes the test suite (or skips), if any tests failed:
- Build a structured summary (e.g. `"Failed: microphone, vibration. Passed: battery, screen, touch, speaker."`)
- Pre-populate the existing AI diagnostic chat with that summary as the `initialDiagnosis`
- The existing `ai-diagnostic-chat` edge function already accepts this — no backend changes needed

If everything passes, surface a "Likely software issue — try X" message and still offer the AI chat.

---

### Files to create

```
src/pages/SelfTest.tsx                    # new /self-test page
src/components/selftest/SelfTestRunner.tsx     # orchestrator, step state machine
src/components/selftest/TestResultCard.tsx     # per-test result display
src/components/selftest/ResultsSummary.tsx     # final report + "Continue to AI" CTA
src/components/selftest/tests/BatteryTest.tsx
src/components/selftest/tests/ScreenTest.tsx
src/components/selftest/tests/TouchTest.tsx
src/components/selftest/tests/CameraTest.tsx
src/components/selftest/tests/MicrophoneTest.tsx
src/components/selftest/tests/SpeakerTest.tsx
src/components/selftest/tests/VibrationTest.tsx
src/lib/selftest/types.ts                 # TestResult, TestStatus types
src/lib/selftest/handoff.ts               # buildAIHandoffSummary(results)
```

### Files to modify

- `src/App.tsx` — add `<Route path="/self-test" element={<SelfTest />} />`
- `src/components/Navigation.tsx` — add "Self-Test" link
- `src/pages/Index.tsx` — add hero CTA "Run Free Phone Diagnostic"
- `src/pages/Diagnostic.tsx` — add optional self-test step at top of flow
- `src/pages/JoinRepairCenter.tsx` — no changes (separate feature)

### No backend changes required
The existing `ai-diagnostic-chat` edge function and `diagnostic_conversations` table already support being seeded with an `initialDiagnosis`. We just pass the test summary into it.

---

### UX flow

```text
/self-test
  → Intro card: "We'll run 7 quick tests, ~3 min total"
  → [Start]
  → Test 1: Battery (auto, instant)
  → Test 2: Screen (interactive, 30s)
  → ...continue through all tests, user can Skip any...
  → Results summary: ✅ 5 passed, ❌ 2 failed
  → [Talk to AI about these issues] → /diagnostic with prefilled context
  → [Find a repair center]         → /repair-centers
```

### Permissions handled gracefully
Camera/mic require user grant. If denied, mark test `skipped` with a note. iOS Safari restrictions (battery API unavailable, vibration limited) are detected and the test is marked `unsupported` — not a failure.

### PWA note
The user has not requested PWA/offline support, so we will NOT add `vite-plugin-pwa` or service workers. The `/self-test` page works fine as a regular web page and is fully linkable from social media.

### What this does NOT do (so expectations are clear)
- No motherboard / IC / NAND health checks (impossible from a browser)
- No iOS battery health % (Apple blocks it)
- No automatic "fix" — the tool detects, the AI advises, the repair center fixes
- No background scanning — runs only when the user taps Start

---

### Out of scope for this PR (future ideas)
- Capacitor wrapper for deeper Android device info (battery cycles, model, OS patch level)
- Network speed / GPS / sensor sweep tests (Phase 2)
- Saving test history per user account
- Sharing diagnostic report PDF

Approve and I'll build it.