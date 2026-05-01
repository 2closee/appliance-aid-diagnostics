import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import { TestResult } from "@/lib/selftest/types";

interface Props {
  onComplete: (result: Pick<TestResult, "status" | "detail">) => void;
  onSkip: () => void;
}

const FREQS = [220, 880, 3000];

export const SpeakerTest = ({ onComplete, onSkip }: Props) => {
  const ctxRef = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);

  const playTone = async (freq: number) => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") await ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    setPlaying(freq);
    osc.start();
    setTimeout(() => {
      osc.stop();
      setPlaying(null);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Turn your volume up. Tap each tone — you should hear a clear sound at low, medium and high pitch. Distortion or silence on any tone may indicate a blown speaker.
      </p>
      <div className="flex flex-wrap gap-2">
        {FREQS.map((f) => (
          <Button key={f} variant="outline" onClick={() => playTone(f)} disabled={playing !== null}>
            <Volume2 className="mr-2 h-4 w-4" />
            {f === 220 ? "Low" : f === 880 ? "Mid" : "High"} ({f} Hz)
            {playing === f && " · playing"}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onComplete({ status: "pass", detail: "All tones played clearly" })}>
          All tones sound clear
        </Button>
        <Button variant="destructive" onClick={() => onComplete({ status: "fail", detail: "User reported distortion or silence on speaker tones" })}>
          Distorted / silent
        </Button>
        <Button variant="ghost" onClick={onSkip}>Skip</Button>
      </div>
    </div>
  );
};
