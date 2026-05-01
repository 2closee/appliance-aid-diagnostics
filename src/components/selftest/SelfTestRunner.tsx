import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { INITIAL_RESULTS, TestResult } from "@/lib/selftest/types";
import { buildAIHandoffSummary } from "@/lib/selftest/handoff";
import { BatteryTest } from "./tests/BatteryTest";
import { ScreenTest } from "./tests/ScreenTest";
import { TouchTest } from "./tests/TouchTest";
import { CameraTest } from "./tests/CameraTest";
import { MicrophoneTest } from "./tests/MicrophoneTest";
import { SpeakerTest } from "./tests/SpeakerTest";
import { VibrationTest } from "./tests/VibrationTest";
import { ResultsSummary } from "./ResultsSummary";

interface Props {
  /** When true, embeds without the intro card (for use inside /diagnostic). */
  embedded?: boolean;
  onFinished?: (summary: string, results: TestResult[]) => void;
}

export const SelfTestRunner = ({ embedded, onFinished }: Props) => {
  const navigate = useNavigate();
  const [started, setStarted] = useState(embedded ? true : false);
  const [results, setResults] = useState<TestResult[]>(INITIAL_RESULTS);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const current = results[step];
  const progress = (step / results.length) * 100;

  const advance = (status: TestResult["status"], detail?: string) => {
    setResults((prev) => prev.map((r, i) => (i === step ? { ...r, status, detail } : r)));
    if (step + 1 >= results.length) {
      setDone(true);
    } else {
      setStep(step + 1);
    }
  };

  const handleTalkToAI = () => {
    const summary = buildAIHandoffSummary(results);
    if (onFinished) {
      onFinished(summary, results);
      return;
    }
    sessionStorage.setItem("fixbudi_selftest_summary", summary);
    navigate("/diagnostic?source=selftest");
  };

  const restart = () => {
    setResults(INITIAL_RESULTS);
    setStep(0);
    setDone(false);
    setStarted(embedded ? true : false);
  };

  if (!started) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick phone self-diagnostic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We'll run 7 short tests (~3 minutes) directly in your browser: battery, screen, touch, cameras, microphone, speakers and vibration.
            Nothing is uploaded — results stay on your device until you choose to share them with our AI.
          </p>
          <p className="text-xs text-muted-foreground">
            Note: a browser can't inspect motherboard or chip-level faults. For deeper hardware analysis, our AI assistant or a partner repair center can help after this scan.
          </p>
          <Button size="lg" onClick={() => setStarted(true)}>Start diagnostic</Button>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <ResultsSummary
        results={results}
        onTalkToAI={handleTalkToAI}
        onFindCenter={() => navigate("/repair-centers")}
        onRestart={restart}
      />
    );
  }

  const renderTest = () => {
    const onComplete = ({ status, detail }: { status: TestResult["status"]; detail?: string }) =>
      advance(status, detail);
    const onSkip = () => advance("skipped", "User skipped this test");

    switch (current.id) {
      case "battery": return <BatteryTest onComplete={onComplete} onSkip={onSkip} />;
      case "screen": return <ScreenTest onComplete={onComplete} onSkip={onSkip} />;
      case "touch": return <TouchTest onComplete={onComplete} onSkip={onSkip} />;
      case "camera": return <CameraTest onComplete={onComplete} onSkip={onSkip} />;
      case "microphone": return <MicrophoneTest onComplete={onComplete} onSkip={onSkip} />;
      case "speaker": return <SpeakerTest onComplete={onComplete} onSkip={onSkip} />;
      case "vibration": return <VibrationTest onComplete={onComplete} onSkip={onSkip} />;
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Step {step + 1} of {results.length}: {current.label}
          </CardTitle>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </CardHeader>
      <CardContent>{renderTest()}</CardContent>
    </Card>
  );
};
