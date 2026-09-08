import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mic, Square, Play } from "lucide-react";
import { TestResult } from "@/lib/selftest/types";

interface Props {
  onComplete: (result: Pick<TestResult, "status" | "detail">) => void;
  onSkip: () => void;
}

const CANDIDATE_TYPES = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

const pickMimeType = (): string | undefined => {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  return CANDIDATE_TYPES.find((t) => {
    try {
      return MediaRecorder.isTypeSupported(t);
    } catch {
      return false;
    }
  });
};

const friendlyError = (e: any): string => {
  const name = e?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Microphone permission was blocked. Allow microphone access for this site in your browser settings, then try again.";
  if (name === "NotReadableError" || name === "AbortError")
    return "Your microphone is busy — another app or call may be using it. Close it and try again.";
  if (name === "NotFoundError") return "No microphone was found on this device.";
  return e?.message || "We couldn't start recording on this browser.";
};

export const MicrophoneTest = ({ onComplete, onSkip }: Props) => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState<number | null>(null);
  const [attempted, setAttempted] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const peakRef = useRef(0);

  const cleanupAudio = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  };

  useEffect(() => cleanupAudio, []);

  const start = async () => {
    setError(null);
    setAudioUrl(null);
    setPeak(null);
    setLevel(0);
    peakRef.current = 0;
    setAttempted(true);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e: any) {
      setError(friendlyError(e));
      return;
    }

    // Live loudness meter — this is the objective signal, independent of playback support.
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();
      ctxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const sample = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const pct = Math.min(100, Math.round(rms * 320));
        setLevel(pct);
        if (pct > peakRef.current) peakRef.current = pct;
        rafRef.current = requestAnimationFrame(sample);
      };
      sample();
    } catch {
      // Meter unavailable — recording can still proceed.
    }

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      try {
        recorder = new MediaRecorder(stream);
      } catch (e: any) {
        setError(
          "This browser can't record audio, but we still measured your microphone level below — speak and watch the bar move."
        );
        setTimeout(() => {
          stream.getTracks().forEach((t) => t.stop());
          cleanupAudio();
          setRecording(false);
          setPeak(peakRef.current);
        }, 3000);
        setRecording(true);
        return;
      }
    }

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || "audio/webm";
      if (chunksRef.current.length) {
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size > 0) setAudioUrl(URL.createObjectURL(blob));
      }
      stream.getTracks().forEach((t) => t.stop());
      cleanupAudio();
      setPeak(peakRef.current);
    };

    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
    setTimeout(() => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      setRecording(false);
    }, 3000);
  };

  const detectedSound = (peak ?? 0) >= 8;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        We'll listen for 3 seconds — say something out loud, like your name. Watch the level bar: if it never moves while
        you speak, your microphone isn't picking up sound.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button onClick={start} disabled={recording}>
          {recording ? (
            <>
              <Square className="mr-2 h-4 w-4" /> Listening 3s…
            </>
          ) : (
            <>
              <Mic className="mr-2 h-4 w-4" /> {attempted ? "Test again" : "Start 3-second test"}
            </>
          )}
        </Button>
      </div>

      {(recording || peak !== null) && (
        <div className="space-y-1">
          <Progress value={recording ? level : peak ?? 0} />
          <p className="text-xs text-muted-foreground">
            {recording
              ? "Speak now…"
              : detectedSound
              ? `Sound detected (peak level ${peak}%).`
              : `Almost no sound detected (peak level ${peak}%). Check that nothing is covering the mic.`}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {audioUrl ? (
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-muted-foreground" />
          <audio src={audioUrl} controls className="w-full" />
        </div>
      ) : (
        peak !== null &&
        !error && (
          <p className="text-xs text-muted-foreground">
            Playback isn't available on this browser — use the level bar above to judge the microphone.
          </p>
        )
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={peak === null}
          onClick={() =>
            onComplete({
              status: "pass",
              detail: `Microphone picked up sound (peak level ${peak}%${audioUrl ? ", playback OK" : ", playback unavailable on this browser"})`,
            })
          }
        >
          My voice was picked up
        </Button>
        <Button
          variant="destructive"
          onClick={() =>
            onComplete({
              status: "fail",
              detail:
                peak === null
                  ? `Microphone test could not run${error ? ` — ${error}` : ""}`
                  : `Microphone silent or muffled (peak level ${peak}%)`,
            })
          }
        >
          Silent / muffled
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </div>
  );
};
