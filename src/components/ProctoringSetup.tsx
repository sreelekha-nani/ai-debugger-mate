import { useState } from "react";
import { Camera, Maximize, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ProctoringSetupProps {
  onReady: () => void;
  onStartWebcam: () => Promise<MediaStream | null>;
  onEnterFullscreen: () => Promise<void>;
  webcamActive: boolean;
  isFullscreen: boolean;
}

const ProctoringSetup = ({ onReady, onStartWebcam, onEnterFullscreen, webcamActive, isFullscreen }: ProctoringSetupProps) => {
  const [step, setStep] = useState(0);

  const handleCameraStep = async () => {
    const stream = await onStartWebcam();
    if (stream) setStep(1);
  };

  const handleFullscreenStep = async () => {
    await onEnterFullscreen();
    setStep(2);
  };

  const steps = [
    {
      icon: Camera,
      title: "Enable Camera",
      desc: "Camera monitoring is required for fair competition.",
      action: handleCameraStep,
      actionLabel: "Enable Camera",
      done: webcamActive,
    },
    {
      icon: Maximize,
      title: "Enter Fullscreen",
      desc: "The competition runs in fullscreen mode to prevent distractions.",
      action: handleFullscreenStep,
      actionLabel: "Enter Fullscreen",
      done: isFullscreen,
    },
    {
      icon: ShieldCheck,
      title: "Ready to Start",
      desc: "All checks passed. You're ready to begin the debugging challenge.",
      action: onReady,
      actionLabel: "Start Competition",
      done: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-primary/20">
        <CardContent className="p-8 space-y-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 glow-primary">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Competition Setup</h2>
            <p className="text-sm text-muted-foreground mt-1">Complete these steps before the challenge begins</p>
          </div>

          <div className="space-y-3">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isCurrent = i === step;
              const isPast = i < step;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    isCurrent ? "border-primary/50 bg-primary/5" : isPast ? "border-success/30 bg-success/5" : "border-border/30 opacity-50"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isPast ? "bg-success/20" : isCurrent ? "bg-primary/20" : "bg-muted"
                  }`}>
                    {isPast ? (
                      <ShieldCheck className="w-5 h-5 text-success" />
                    ) : (
                      <Icon className={`w-5 h-5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                  {isCurrent && (
                    <Button size="sm" onClick={s.action} className="shrink-0">
                      {s.actionLabel}
                    </Button>
                  )}
                  {isPast && <span className="text-xs text-success font-medium">✓ Done</span>}
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-warning">Anti-Cheat Active</p>
                <p className="text-xs text-muted-foreground">Tab switching, exiting fullscreen, or disabling camera will trigger warnings. 3 warnings = disqualification.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProctoringSetup;
