import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TestResult } from "@/lib/selftest/types";

interface Props {
  onComplete: (result: Pick<TestResult, "status" | "detail">) => void;
  onSkip: () => void;
}

type Facing = "user" | "environment";

export const CameraTest = ({ onComplete, onSkip }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>("environment");
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [tested, setTested] = useState<{ user: boolean; environment: boolean }>({ user: false, environment: false });

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = async (f: Facing) => {
    stop();
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: f } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setFacing(f);
      setActive(true);
    } catch (e: any) {
      setError(e?.message || "Camera access denied");
      setActive(false);
    }
  };

  useEffect(() => () => stop(), []);

  const finish = (status: "pass" | "fail") => {
    stop();
    onComplete({
      status,
      detail: status === "pass"
        ? `Cameras tested: ${tested.environment ? "rear " : ""}${tested.user ? "front" : ""}`.trim()
        : "User reported camera issue (blurry, no image, or cracked lens)",
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Test your front and rear cameras. Look for cracked lens, smudges, blur, or no image at all.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant={facing === "environment" && active ? "default" : "outline"} onClick={() => { start("environment"); setTested((t) => ({ ...t, environment: true })); }}>
          Test rear camera
        </Button>
        <Button variant={facing === "user" && active ? "default" : "outline"} onClick={() => { start("user"); setTested((t) => ({ ...t, user: true })); }}>
          Test front camera
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="rounded-lg overflow-hidden bg-muted aspect-video">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!tested.user && !tested.environment}
          onClick={() => finish("pass")}
        >
          Cameras work
        </Button>
        <Button variant="destructive" onClick={() => finish("fail")}>Camera problem</Button>
        <Button variant="ghost" onClick={() => { stop(); onSkip(); }}>Skip</Button>
      </div>
    </div>
  );
};
