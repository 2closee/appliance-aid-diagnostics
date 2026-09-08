import { Button } from "@/components/ui/button";
import { Vibrate, Info } from "lucide-react";
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
        <div className="flex items-start gap-2 rounded-lg border p-3">
          <Info className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Not available on this phone's browser.</span> iPhones don't let
            a web page vibrate the phone. This isn't a fault — do the quick manual check below instead.
          </p>
        </div>

        <p className="text-sm">
          Manual check: switch your phone to vibrate/silent, then call it from another phone or type on the keyboard with
          haptics on. Do you feel any vibration at all?
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              onComplete({
                status: "pass",
                detail: "Vibration API unavailable in browser; user manually confirmed the phone does vibrate",
              })
            }
          >
            Yes, I feel it
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              onComplete({
                status: "fail",
                detail: "Vibration API unavailable in browser; user manually confirmed NO vibration at all",
              })
            }
          >
            No vibration at all
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              onComplete({ status: "unsupported", detail: "Vibration API unavailable; user did not run the manual check" })
            }
          >
            Not sure / skip check
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        First make sure your phone is <span className="font-medium">not</span> on silent-with-vibration-off — that alone
        makes a healthy motor feel dead. Then hold your phone in your hand and tap the button; you should feel a short
        pattern.
      </p>
      <Button onClick={buzz}>
        <Vibrate className="mr-2 h-4 w-4" /> Vibrate now
      </Button>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onComplete({ status: "pass", detail: "Vibration motor felt clearly" })}>I felt it</Button>
        <Button
          variant="destructive"
          onClick={() => onComplete({ status: "fail", detail: "User did not feel vibration (vibration mode confirmed on)" })}
        >
          Nothing happened
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </div>
  );
};
