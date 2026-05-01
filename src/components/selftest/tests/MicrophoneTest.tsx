import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play } from "lucide-react";
import { TestResult } from "@/lib/selftest/types";

interface Props {
  onComplete: (result: Pick<TestResult, "status" | "detail">) => void;
  onSkip: () => void;
}

export const MicrophoneTest = ({ onComplete, onSkip }: Props) => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    setError(null);
    setAudioUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setTimeout(() => {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
          setRecording(false);
        }
      }, 3000);
    } catch (e: any) {
      setError(e?.message || "Microphone access denied");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        We'll record 3 seconds of audio, then play it back. Say something — like your name. If playback is silent or muffled, the mic may have an issue.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={start} disabled={recording}>
          {recording ? <><Square className="mr-2 h-4 w-4" /> Recording 3s…</> : <><Mic className="mr-2 h-4 w-4" /> Record 3 seconds</>}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {audioUrl && (
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-muted-foreground" />
          <audio src={audioUrl} controls className="w-full" />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!audioUrl} onClick={() => onComplete({ status: "pass", detail: "Microphone recorded and played back clearly" })}>
          I can hear myself clearly
        </Button>
        <Button variant="destructive" onClick={() => onComplete({ status: "fail", detail: "Microphone recording silent or muffled" })}>
          Silent / muffled
        </Button>
        <Button variant="ghost" onClick={onSkip}>Skip</Button>
      </div>
    </div>
  );
};
