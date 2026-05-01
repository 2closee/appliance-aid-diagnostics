import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Battery, BatteryCharging } from "lucide-react";
import { TestResult } from "@/lib/selftest/types";

interface Props {
  onComplete: (result: Pick<TestResult, "status" | "detail">) => void;
  onSkip: () => void;
}

export const BatteryTest = ({ onComplete, onSkip }: Props) => {
  const [info, setInfo] = useState<{ level: number; charging: boolean } | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const nav = navigator as any;
    if (!nav.getBattery) {
      setUnsupported(true);
      return;
    }
    nav.getBattery().then((b: any) => {
      setInfo({ level: Math.round(b.level * 100), charging: b.charging });
    }).catch(() => setUnsupported(true));
  }, []);

  if (unsupported) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Your browser does not expose battery information (this is normal on iPhone / Safari).
        </p>
        <Button variant="outline" onClick={() => onComplete({ status: "unsupported", detail: "Battery API not available on this browser" })}>
          Continue
        </Button>
      </div>
    );
  }

  if (!info) return <p className="text-muted-foreground">Reading battery…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-2xl font-semibold">
        {info.charging ? <BatteryCharging className="h-8 w-8 text-primary" /> : <Battery className="h-8 w-8" />}
        {info.level}% {info.charging ? "(charging)" : "(on battery)"}
      </div>
      <p className="text-sm text-muted-foreground">
        Does this match what your phone shows? Try plugging in / unplugging your charger to confirm charging is detected.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onComplete({ status: "pass", detail: `Battery ${info.level}%, charging=${info.charging}` })}>
          Looks correct
        </Button>
        <Button variant="destructive" onClick={() => onComplete({ status: "fail", detail: `Battery shows ${info.level}% but user reports mismatch` })}>
          Something's wrong
        </Button>
        <Button variant="ghost" onClick={onSkip}>Skip</Button>
      </div>
    </div>
  );
};
