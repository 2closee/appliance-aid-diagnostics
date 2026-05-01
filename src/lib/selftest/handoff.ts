import { TestResult, TestId } from "./types";

// Targeted follow-up questions per test, designed to disambiguate
// hardware vs software when a self-test is inconclusive, failed, or skipped.
const FOLLOW_UPS: Record<TestId, string[]> = {
  battery: [
    "Does the battery drain fast only on certain apps, or across the whole phone (suggests software vs hardware)?",
    "Does the phone get unusually hot while charging or under light use?",
    "Have you tried a different charger and cable — does the issue persist?",
  ],
  screen: [
    "Are the dead/odd pixels in the same fixed spot, or do they move/flicker (fixed = hardware, moving = often software/GPU)?",
    "Does the issue appear on the lock screen and in safe mode, or only inside specific apps?",
    "Did the screen issue start after a drop/water exposure, or after a software update?",
  ],
  touch: [
    "Are the unresponsive areas always in the same region of the screen (likely digitizer/hardware)?",
    "Does touch fail only with a screen protector/case on, or also without it?",
    "Does rebooting or booting into safe mode temporarily restore touch?",
  ],
  camera: [
    "Does the camera fail in the stock camera app only, or in every app (stock-only often = software)?",
    "Is the preview black, blurry, or showing an error code? Please share the exact error if any.",
    "Does the front camera work but the rear fails (or vice versa)?",
  ],
  microphone: [
    "Can the other party hear you on a normal phone call, on speaker, and on a Bluetooth headset?",
    "Does voice recording work in another app (e.g., voice memo) but fail elsewhere?",
    "Did the issue start after a software update, a drop, or water exposure?",
  ],
  speaker: [
    "Is the issue on the earpiece (calls), the loudspeaker (media), or both?",
    "Does sound work over headphones/Bluetooth but not the built-in speaker?",
    "Is the audio distorted at all volumes, or only at high volume?",
  ],
  vibration: [
    "Is vibration disabled in system settings / Do Not Disturb / silent profile?",
    "Does vibration fail for all events (calls, typing, notifications) or only some?",
    "Did vibration stop after a drop, water exposure, or a recent update?",
  ],
};

const isInconclusive = (r: TestResult) =>
  r.status === "fail" ||
  r.status === "inconclusive" ||
  r.status === "skipped" ||
  r.status === "unsupported";

export const buildAIHandoffSummary = (results: TestResult[]): string => {
  const failed = results.filter((r) => r.status === "fail");
  const passed = results.filter((r) => r.status === "pass");
  const inconclusive = results.filter((r) => r.status === "inconclusive");
  const skipped = results.filter((r) => r.status === "skipped" || r.status === "unsupported");
  const needsClarification = results.filter(isInconclusive);

  const lines: string[] = [
    "I just ran the FixBudi self-diagnostic on my phone. Here are the results:",
  ];

  if (failed.length) {
    lines.push("");
    lines.push("Failed tests:");
    failed.forEach((r) =>
      lines.push(`- ${r.label}${r.detail ? ` — ${r.detail}` : ""}${r.note ? ` (note: ${r.note})` : ""}`)
    );
  }
  if (inconclusive.length) {
    lines.push("");
    lines.push("Inconclusive tests:");
    inconclusive.forEach((r) =>
      lines.push(`- ${r.label}${r.detail ? ` — ${r.detail}` : ""}${r.note ? ` (note: ${r.note})` : ""}`)
    );
  }
  if (passed.length) {
    lines.push("");
    lines.push(`Passed: ${passed.map((r) => r.label).join(", ")}.`);
  }
  if (skipped.length) {
    lines.push(`Skipped/unsupported: ${skipped.map((r) => r.label).join(", ")}.`);
  }

  if (needsClarification.length) {
    lines.push("");
    lines.push(
      "Several tests were inconclusive, failed, or could not run, so we cannot yet tell whether this is a hardware or software issue. Please ask me the following follow-up questions ONE AT A TIME, wait for my answer, then use my answers to narrow down hardware vs software with a clear confidence score:"
    );
    needsClarification.forEach((r) => {
      const qs = FOLLOW_UPS[r.id] || [];
      if (!qs.length) return;
      lines.push("");
      lines.push(`For ${r.label} (${r.status}):`);
      qs.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    });
    lines.push("");
    lines.push(
      "After my answers, give your best assessment of: (a) hardware vs software, (b) likely root cause, (c) confidence %, and (d) whether professional repair is recommended."
    );
  } else {
    lines.push("");
    lines.push("Please help me figure out what is wrong and what I should do next.");
  }

  return lines.join("\n");
};

export const summarizeCounts = (results: TestResult[]) => ({
  pass: results.filter((r) => r.status === "pass").length,
  fail: results.filter((r) => r.status === "fail").length,
  inconclusive: results.filter((r) => r.status === "inconclusive").length,
  skipped: results.filter((r) => r.status === "skipped" || r.status === "unsupported").length,
  total: results.length,
});

export const hasInconclusiveResults = (results: TestResult[]) =>
  results.some(isInconclusive);
