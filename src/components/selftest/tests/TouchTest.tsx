import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TestResult } from "@/lib/selftest/types";

interface Props {
  onComplete: (result: Pick<TestResult, "status" | "detail">) => void;
  onSkip: () => void;
}

const ROWS = 5;
const COLS = 4;

export const TouchTest = ({ onComplete, onSkip }: Props) => {
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const total = ROWS * COLS;

  const allTapped = tapped.size === total;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tap every cell. If a cell won't light up after multiple taps, that area of your touchscreen may be dead.
      </p>
      <div
        className="grid gap-1 p-1 bg-muted rounded-lg select-none"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: total }).map((_, i) => {
          const isOn = tapped.has(i);
          return (
            <button
              key={i}
              onClick={() => setTapped((prev) => new Set(prev).add(i))}
              className={`aspect-square rounded transition-colors ${isOn ? "bg-primary" : "bg-background hover:bg-accent"}`}
            />
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{tapped.size} / {total} cells responded</p>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!allTapped}
          onClick={() => onComplete({ status: "pass", detail: "All touch grid cells responded" })}
        >
          All cells responded
        </Button>
        <Button
          variant="destructive"
          onClick={() => onComplete({ status: "fail", detail: `Only ${tapped.size}/${total} touch cells responded` })}
        >
          Some cells don't respond
        </Button>
        <Button variant="ghost" onClick={onSkip}>Skip</Button>
      </div>
    </div>
  );
};
