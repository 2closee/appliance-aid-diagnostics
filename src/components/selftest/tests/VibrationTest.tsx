import { Button } from "@/components/ui/button";
import { Vibrate } from "lucide-react";
import { TestResult } from "@/lib/selftest/types";

interface Props {
  onComplete: (result: Pick<TestResult, "status" | "detail">) => void;
  onSkip: () => void;
}

export const VibrationTest = ({ onComplete, onSkip }: Props) => {
  const supported = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

  const buzz = () => navigator.vibrate?.([200, 100, 200, 100, 400]);

  if (!supported) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Your browser doesn't support the Vibration API (common on iPhone). You can manually test by getting a notification or call.
        </p>
        <Button variant="outline" onClick={() => onComplete({ status: "unsupported", detail: "Vibration API unavailable" })}>
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Hold your phone in your hand and tap the button. You should feel a short pattern of vibrations. (Make sure silent / vibration mode is enabled.)
      </p>
      <Button onClick={buzz}>
        <Vibrate className="mr-2 h-4 w-4" /> Vibrate now
      </Button>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onComplete({ status: "pass", detail: "Vibration motor felt clearly" })}>
          I felt it
        </Button>
        <Button variant="destructive" onClick={() => onComplete({ status: "fail", detail: "User did not feel vibration" })}>
          Nothing happened
        </Button>
        <Button variant="ghost" onClick={onSkip}>Skip</Button>
      </div>
    </div>
  );
};
