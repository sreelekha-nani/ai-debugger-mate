import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";

interface ProctoringState {
  webcamStream: MediaStream | null;
  webcamActive: boolean;
  isFullscreen: boolean;
  warnings: { type: string; time: number }[];
  warningCount: number;
  disqualified: boolean;
}

interface UseProctoringOptions {
  enabled: boolean;
  maxWarnings?: number;
  onDisqualify?: () => void;
  onWarning?: (type: string, count: number) => void;
}

export function useProctoring({ enabled, maxWarnings = 3, onDisqualify, onWarning }: UseProctoringOptions) {
  const [state, setState] = useState<ProctoringState>({
    webcamStream: null,
    webcamActive: false,
    isFullscreen: false,
    warnings: [],
    warningCount: 0,
    disqualified: false,
  });
  const snapshotIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const addWarning = useCallback((type: string) => {
    setState((prev) => {
      if (prev.disqualified) return prev;
      const newWarnings = [...prev.warnings, { type, time: Date.now() }];
      const newCount = prev.warningCount + 1;
      const disqualified = newCount >= maxWarnings;

      toast({
        title: disqualified ? "🚫 Disqualified" : `⚠️ Warning ${newCount}/${maxWarnings}`,
        description: disqualified
          ? "You have been disqualified for excessive violations."
          : `${type}. ${maxWarnings - newCount} warning(s) remaining.`,
        variant: "destructive",
      });

      onWarning?.(type, newCount);
      if (disqualified) onDisqualify?.();

      return { ...prev, warnings: newWarnings, warningCount: newCount, disqualified };
    });
  }, [maxWarnings, onDisqualify, onWarning]);

  // Webcam
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setState((prev) => ({ ...prev, webcamStream: stream, webcamActive: true }));
      return stream;
    } catch {
      toast({
        title: "Camera Required",
        description: "Please allow camera access to participate.",
        variant: "destructive",
      });
      return null;
    }
  }, []);

  const stopWebcam = useCallback(() => {
    setState((prev) => {
      prev.webcamStream?.getTracks().forEach((t) => t.stop());
      return { ...prev, webcamStream: null, webcamActive: false };
    });
  }, []);

  // Fullscreen
  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setState((prev) => ({ ...prev, isFullscreen: true }));
    } catch {
      toast({
        title: "Fullscreen Required",
        description: "Please allow fullscreen mode.",
        variant: "destructive",
      });
    }
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      const isFs = !!document.fullscreenElement;
      setState((prev) => ({ ...prev, isFullscreen: isFs }));
      if (!isFs) addWarning("Exited fullscreen mode");
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [enabled, addWarning]);

  // Tab switch detection
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      if (document.hidden) addWarning("Tab switch detected");
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [enabled, addWarning]);

  // Right-click disable
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      toast({ title: "Right-click disabled", description: "Right-click is not allowed during the competition.", variant: "destructive" });
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, [enabled]);

  // Random snapshots (every 30-60s)
  useEffect(() => {
    if (!enabled || !state.webcamActive) return;
    snapshotIntervalRef.current = setInterval(() => {
      // Snapshot capture - in production would send to server
      console.log("[Proctor] Snapshot captured at", new Date().toISOString());
    }, 30000 + Math.random() * 30000);
    return () => {
      if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
    };
  }, [enabled, state.webcamActive]);

  // Cleanup
  useEffect(() => {
    return () => {
      state.webcamStream?.getTracks().forEach((t) => t.stop());
      if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
    };
  }, []);

  return {
    ...state,
    startWebcam,
    stopWebcam,
    enterFullscreen,
    addWarning,
    videoRef,
  };
}
