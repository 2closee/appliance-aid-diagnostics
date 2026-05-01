export type TestStatus = "pending" | "running" | "pass" | "fail" | "skipped" | "unsupported" | "inconclusive";

export type TestId =
  | "battery"
  | "screen"
  | "touch"
  | "camera"
  | "microphone"
  | "speaker"
  | "vibration";

export interface TestResult {
  id: TestId;
  label: string;
  status: TestStatus;
  detail?: string;
  note?: string;
}

export const INITIAL_RESULTS: TestResult[] = [
  { id: "battery", label: "Battery & Charging", status: "pending" },
  { id: "screen", label: "Screen / Display", status: "pending" },
  { id: "touch", label: "Touchscreen", status: "pending" },
  { id: "camera", label: "Cameras", status: "pending" },
  { id: "microphone", label: "Microphone", status: "pending" },
  { id: "speaker", label: "Speakers", status: "pending" },
  { id: "vibration", label: "Vibration / Haptics", status: "pending" },
];
