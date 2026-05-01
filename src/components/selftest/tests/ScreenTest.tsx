import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TestResult } from "@/lib/selftest/types";

interface Props {
  onComplete: (result: Pick<TestResult, "status" | "detail">) => void;
  onSkip: () => void;
}

const COLORS = ["#ff0000", "#00ff00", "#0000ff", "#ffffff", "#000000"];

export const ScreenTest = ({ onComplete, onSkip }: Props) => {
  const [active, setActive] = useState(false);
  const [idx, setIdx] = useState(0);

  if (active) {
    const advance = () => {
      if (idx < COLORS.length - 1) setIdx(idx + 1);
      else setActive(false);
    };
    return (
      <div
        onClick={advance}
        className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
        style={{ backgroundColor: COLORS[idx] }}
      >
        <span
          className="text-sm font-medium px-3 py-1 rounded bg-black/40 text-white"
          style={{ mixBlendMode: "difference" }}
        >
          Tap anywhere · {idx + 1} / {COLORS.length}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        We'll fill the screen with solid colors (red, green, blue, white, black). Look for dead pixels, dark spots, lines, or color tint.
      </p>
      <Button onClick={() => { setIdx(0); setActive(true); }}>Start screen test</Button>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="outline" onClick={() => onComplete({ status: "pass", detail: "Screen displays all colors uniformly" })}>
          Screen looks fine
        </Button>
        <Button variant="destructive" onClick={() => onComplete({ status: "fail", detail: "User reported dead pixels / discoloration / lines" })}>
          Found a problem
        </Button>
        <Button variant="ghost" onClick={onSkip}>Skip</Button>
      </div>
    </div>
  );
};
