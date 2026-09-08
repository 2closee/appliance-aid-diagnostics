import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Battery, BatteryCharging, Info } from "lucide-react";
import { TestResult } from "@/lib/selftest/types";

interface Props {
  onComplete: (result: Pick<TestResult, "status" | "detail">) => void;
  onSkip: () => void;
}

export const BatteryTest = ({ onComplete, onSkip }: Props) => {
  const [info, setInfo] = useState<{ level: number; charging: boolean } | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [drainsFast, setDrainsFast] = useState<boolean | null>(null);
  const [heatOrCharging, setHeatOrCharging] = useState<boolean | null>(null);

  useEffect(() => {
    const nav = navigator as any;
    if (!nav.getBattery) {
      setUnsupported(true);
      return;
    }
    nav.getBattery()
      .then((b: any) => {
        setInfo({ level: Math.round(b.level * 100), charging: b.charging });
      })
      .catch(() => setUnsupported(true));
  }, []);

  if (unsupported) {
    const answered = drainsFast !== null && heatOrCharging !== null;
    const Choice = ({
      value,
      set,
      label,
    }: {
      value: boolean | null;
      set: (v: boolean) => void;
      label: string;
    }) => (
      <div className="space-y-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex gap-2">
          <Button size="sm" variant={value === true ? "default" : "outline"} onClick={() => set(true)}>
            Yes
          </Button>
          <Button size="sm" variant={value === false ? "default" : "outline"} onClick={() => set(false)}>
            No
          </Button>
        </div>
      </div>
    );

    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border p-3">
          <Info className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Not available on this phone's browser.</span> iPhones (and any
            browser on iOS) don't share battery level or charging status with a web page. This isn't a fault — answer the
            two quick questions below instead and we'll pass your answers to the assistant.
          </p>
        </div>

        <Choice value={drainsFast} set={setDrainsFast} label="Does your battery drain unusually fast?" />
        <Choice
          value={heatOrCharging}
          set={setHeatOrCharging}
          label="Does the phone get hot, or stop/refuse to charge sometimes?"
        />

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!answered}
            onClick={() =>
              onComplete({
                status: drainsFast || heatOrCharging ? "inconclusive" : "unsupported",
                detail: `Battery data not exposed by this browser. User reports: fast drain=${drainsFast ? "yes" : "no"}, heat/charging problems=${heatOrCharging ? "yes" : "no"}`,
              })
            }
          >
            Continue
          </Button>
          <Button variant="ghost" onClick={onSkip}>
            Skip
          </Button>
        </div>
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
        <Button
          variant="destructive"
          onClick={() => onComplete({ status: "fail", detail: `Battery shows ${info.level}% but user reports mismatch` })}
        >
          Something's wrong
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </div>
  );
};
