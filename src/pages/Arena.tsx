import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bug, Clock, AlertTriangle, Send, Eye, Lightbulb, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MonacoEditor from "@/components/MonacoEditor";
import WebcamMonitor from "@/components/WebcamMonitor";
import ProctoringSetup from "@/components/ProctoringSetup";
import { useProctoring } from "@/hooks/useProctoring";

interface Challenge {
  title: string;
  description: string;
  buggyCode: string;
  correctCode: string;
  bugs: { line: number; description: string; type: string }[];
  testCases: { input: string; expectedOutput: string }[];
  hints?: string[];
}

const Arena = () => {
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<any>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [proctoringReady, setProctoringReady] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDisqualify = useCallback(async () => {
    const pid = sessionStorage.getItem("participant_id");
    if (pid) {
      await supabase.from("participants").update({ disqualified: true }).eq("id", pid);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    toast({ title: "🚫 Disqualified", description: "You have been removed from the competition.", variant: "destructive" });
    setTimeout(() => navigate("/"), 3000);
  }, [navigate]);

  const handleWarningUpdate = useCallback(async (type: string, count: number) => {
    const pid = sessionStorage.getItem("participant_id");
    if (pid) {
      await supabase.from("participants").update({
        warnings: count,
        warning_details: [{ type, time: new Date().toISOString() }],
      }).eq("id", pid);
    }
  }, []);

  const proctoring = useProctoring({
    enabled: proctoringReady,
    maxWarnings: 3,
    onDisqualify: handleDisqualify,
    onWarning: handleWarningUpdate,
  });

  // Load competition and challenge
  useEffect(() => {
    const pid = sessionStorage.getItem("participant_id");
    const cid = sessionStorage.getItem("competition_id");
    if (!pid || !cid) { navigate("/"); return; }
    setParticipantId(pid);

    const loadCompetition = async () => {
      const { data: comp } = await supabase
        .from("competitions")
        .select("*")
        .eq("id", cid)
        .single();

      if (!comp || comp.status !== "active") {
        toast({ title: "Competition not active", description: "This competition is not currently running.", variant: "destructive" });
        navigate("/");
        return;
      }

      setCompetition(comp);
      const ch = comp.challenge_data as Challenge;
      setChallenge(ch);
      setCode(ch.buggyCode);

      // Calculate time left based on actual_start
      const elapsed = Math.floor((Date.now() - new Date(comp.actual_start).getTime()) / 1000);
      const remaining = Math.max(0, comp.duration - elapsed);
      setTimeLeft(remaining);
      setLoading(false);
    };

    loadCompetition();
  }, [navigate]);

  // Listen for competition end
  useEffect(() => {
    if (!competition) return;
    const channel = supabase
      .channel("comp-status-arena")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "competitions", filter: `id=eq.${competition.id}` }, (payload) => {
        if (payload.new.status === "ended") {
          handleSubmit(true);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [competition]);

  // Timer
  useEffect(() => {
    if (loading || !proctoringReady || !challenge) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, proctoringReady, challenge]);

  // Update webcam status in DB
  useEffect(() => {
    if (participantId && proctoringReady) {
      supabase.from("participants").update({ webcam_active: proctoring.webcamActive }).eq("id", participantId);
    }
  }, [proctoring.webcamActive, participantId, proctoringReady]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (!challenge || submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (auto) toast({ title: "⏰ Time's Up!", description: "Your code has been auto-submitted." });

    const timeSpent = competition ? competition.duration - timeLeft : 0;
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-submission", {
        body: {
          submittedCode: code,
          buggyCode: challenge.buggyCode,
          correctCode: challenge.correctCode,
          bugs: challenge.bugs,
          testCases: challenge.testCases,
          description: challenge.description,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const score = Math.max(0, Math.round(data.accuracy * 10 + data.bugsFixed * 20 - timeSpent * 0.1));

      // Update participant in DB
      if (participantId) {
        await supabase.from("participants").update({
          submitted: true,
          code,
          score,
          bugs_fixed: data.bugsFixed,
          total_bugs: data.totalBugs,
          accuracy: data.accuracy,
          time_spent: timeSpent,
          submitted_at: new Date().toISOString(),
        }).eq("id", participantId);
      }

      // Exit fullscreen
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      proctoring.stopWebcam();

      navigate("/results", { state: { evaluation: data, timeSpent, challenge } });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Evaluation failed", description: e.message, variant: "destructive" });
      setSubmitting(false);
    }
  }, [challenge, code, timeLeft, submitting, competition, participantId, proctoring, navigate]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const timePercent = competition ? (timeLeft / competition.duration) * 100 : 100;
  const timeColor = timePercent > 50 ? "text-success" : timePercent > 20 ? "text-warning" : "text-destructive";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 animate-slide-up">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto glow-primary">
            <Bug className="w-10 h-10 text-primary animate-float" />
          </div>
          <h2 className="text-3xl font-bold">Loading Challenge...</h2>
          <p className="text-muted-foreground text-lg">Preparing your debugging environment</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      </div>
    );
  }

  // Proctoring setup screen
  if (!proctoringReady) {
    return (
      <ProctoringSetup
        onReady={() => setProctoringReady(true)}
        onStartWebcam={proctoring.startWebcam}
        onEnterFullscreen={proctoring.enterFullscreen}
        webcamActive={proctoring.webcamActive}
        isFullscreen={proctoring.isFullscreen}
      />
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Challenge Failed to Load</h2>
            <Button onClick={() => navigate("/")}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header Bar */}
      <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Bug className="w-5 h-5 text-primary" /> {challenge.title}
              </h1>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="text-xs">🐍 Python</Badge>
                <Badge variant="outline" className="text-xs capitalize">{competition?.difficulty}</Badge>
                <Badge variant="outline" className="text-xs">{challenge.bugs.length} bugs</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Webcam monitor */}
            <WebcamMonitor stream={proctoring.webcamStream} active={proctoring.webcamActive} />

            {/* Warnings */}
            {proctoring.warningCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                <ShieldAlert className="w-3 h-3 mr-1" /> {proctoring.warningCount}/3
              </Badge>
            )}
            <div className={`flex items-center gap-2 font-mono text-2xl font-bold ${timeColor}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
        <Progress value={timePercent} className="h-1 rounded-none" />
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left Panel */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-accent" /> Problem Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{challenge.description}</p>
              <div className="mt-4 p-3 rounded-lg bg-terminal text-terminal-foreground font-mono text-xs">
                <p className="text-terminal-muted mb-1">// Expected behavior:</p>
                {challenge.testCases.slice(0, 2).map((tc, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-accent">Input:</span> {tc.input}<br />
                    <span className="text-success">Output:</span> {tc.expectedOutput}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {challenge.hints && challenge.hints.length > 0 && (
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <Button variant="ghost" size="sm" onClick={() => setShowHints(!showHints)} className="w-full justify-start text-muted-foreground">
                  <Lightbulb className="w-4 h-4 mr-2 text-warning" />
                  {showHints ? "Hide Hints" : "Show Hints"} (may reduce score)
                </Button>
                {showHints && (
                  <div className="mt-3 space-y-2">
                    {challenge.hints.map((hint, i) => (
                      <p key={i} className="text-xs text-muted-foreground pl-4 border-l-2 border-warning/50">{hint}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="w-full h-12 text-base font-bold glow-primary"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? "Evaluating..." : "Submit Solution"}
          </Button>
        </div>

        {/* Code Editor */}
        <div className="lg:col-span-2 min-h-[500px]">
          <Card className="h-full border-primary/20 overflow-hidden">
            <CardHeader className="py-2 px-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-destructive/70" />
                    <div className="w-3 h-3 rounded-full bg-warning/70" />
                    <div className="w-3 h-3 rounded-full bg-success/70" />
                  </div>
                  <span className="text-sm font-mono text-muted-foreground">challenge.py</span>
                </div>
                <Badge variant="secondary" className="text-xs font-mono">Python</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-44px)]">
              <MonacoEditor value={code} onChange={setCode} language="python" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Arena;
