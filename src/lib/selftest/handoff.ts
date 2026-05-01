import { TestResult } from "./types";

export const buildAIHandoffSummary = (results: TestResult[]): string => {
  const failed = results.filter((r) => r.status === "fail");
  const passed = results.filter((r) => r.status === "pass");
  const skipped = results.filter((r) => r.status === "skipped" || r.status === "unsupported");

  const lines: string[] = [
    "I just ran the FixBudi self-diagnostic on my phone. Here are the results:",
  ];
  if (failed.length) {
    lines.push("");
    lines.push("Failed tests:");
    failed.forEach((r) => lines.push(`- ${r.label}${r.detail ? ` — ${r.detail}` : ""}${r.note ? ` (note: ${r.note})` : ""}`));
  }
  if (passed.length) {
    lines.push("");
    lines.push(`Passed: ${passed.map((r) => r.label).join(", ")}.`);
  }
  if (skipped.length) {
    lines.push(`Skipped/unsupported: ${skipped.map((r) => r.label).join(", ")}.`);
  }
  lines.push("");
  lines.push("Please help me figure out what is wrong and what I should do next.");
  return lines.join("\n");
};

export const summarizeCounts = (results: TestResult[]) => ({
  pass: results.filter((r) => r.status === "pass").length,
  fail: results.filter((r) => r.status === "fail").length,
  skipped: results.filter((r) => r.status === "skipped" || r.status === "unsupported").length,
  total: results.length,
});
