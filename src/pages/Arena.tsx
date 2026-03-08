import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bug, Clock, AlertTriangle, Send, Eye, Lightbulb, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { getSession, saveSession, addToLeaderboard, type CompetitionSession, type Challenge } from "@/lib/competition-store";
import { supabase } from "@/integrations/supabase/client";
import MonacoEditor from "@/components/MonacoEditor";

const Arena = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<CompetitionSession | null>(null);
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) { navigate("/"); return; }
    setSession(s);
    if (s.challenge) {
      setCode(s.challenge.buggyCode);
      setTimeLeft(s.startTime ? Math.max(0, s.duration - Math.floor((Date.now() - s.startTime) / 1000)) : s.duration);
      setLoading(false);
    } else {
      generateChallenge(s);
    }
  }, []);

  useEffect(() => {
    if (loading || !session || session.submitted) return;
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
  }, [loading, session?.submitted]);

  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        setTabWarnings((prev) => {
          const n = prev + 1;
          if (session) { session.tabSwitchCount = n; saveSession(session); }
          toast({ title: "⚠️ Tab Switch Detected", description: `Warning ${n}/3. Switching tabs may flag your submission.`, variant: "destructive" });
          return n;
        });
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [session]);

  const generateChallenge = async (s: CompetitionSession) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-buggy-code", {
        body: { language: s.language, difficulty: s.difficulty },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      const challenge: Challenge = data;
      s.challenge = challenge;
      s.startTime = Date.now();
      saveSession(s);
      setSession({ ...s });
      setCode(challenge.buggyCode);
      setTimeLeft(s.duration);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to generate challenge", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useCallback(async (auto = false) => {
    if (!session?.challenge || submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (auto) toast({ title: "⏰ Time's Up!", description: "Your code has been auto-submitted." });

    const timeSpent = session.duration - timeLeft;
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-submission", {
        body: {
          submittedCode: code,
          buggyCode: session.challenge.buggyCode,
          correctCode: session.challenge.correctCode,
          bugs: session.challenge.bugs,
          testCases: session.challenge.testCases,
          description: session.challenge.description,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const score = data.accuracy * 10 + data.bugsFixed * 20 - timeSpent * 0.1;
      addToLeaderboard({
        id: session.participantId,
        name: session.participantName,
        team: session.team,
        score: Math.max(0, Math.round(score)),
        bugsFixed: data.bugsFixed,
        totalBugs: data.totalBugs,
        accuracy: data.accuracy,
        timeSpent,
        submittedAt: Date.now(),
      });
      session.submitted = true;
      saveSession(session);
      navigate("/results", { state: { evaluation: data, timeSpent, challenge: session.challenge } });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Evaluation failed", description: e.message, variant: "destructive" });
      setSubmitting(false);
    }
  }, [session, code, timeLeft, submitting]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const timePercent = session ? (timeLeft / session.duration) * 100 : 100;
  const timeColor = timePercent > 50 ? "text-success" : timePercent > 20 ? "text-warning" : "text-destructive";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 animate-slide-up">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto glow-primary">
            <Bug className="w-10 h-10 text-primary animate-float" />
          </div>
          <h2 className="text-3xl font-bold">Generating Your Challenge...</h2>
          <p className="text-muted-foreground text-lg">AI is crafting a unique buggy program for you</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!session?.challenge) {
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
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4" /></Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Bug className="w-5 h-5 text-primary" /> {session.challenge.title}
              </h1>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="text-xs">🐍 Python</Badge>
                <Badge variant="outline" className="text-xs capitalize">{session.difficulty}</Badge>
                <Badge variant="outline" className="text-xs">{session.challenge.bugs.length} bugs</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {tabWarnings > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" /> {tabWarnings} warning{tabWarnings > 1 ? "s" : ""}
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
              <p className="text-sm text-muted-foreground leading-relaxed">{session.challenge.description}</p>
              <div className="mt-4 p-3 rounded-lg bg-terminal text-terminal-foreground font-mono text-xs">
                <p className="text-terminal-muted mb-1">// Expected behavior:</p>
                {session.challenge.testCases.slice(0, 2).map((tc, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-accent">Input:</span> {tc.input}<br />
                    <span className="text-success">Output:</span> {tc.expectedOutput}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {session.challenge.hints && session.challenge.hints.length > 0 && (
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <Button variant="ghost" size="sm" onClick={() => setShowHints(!showHints)} className="w-full justify-start text-muted-foreground">
                  <Lightbulb className="w-4 h-4 mr-2 text-warning" />
                  {showHints ? "Hide Hints" : "Show Hints"} (may reduce score)
                </Button>
                {showHints && (
                  <div className="mt-3 space-y-2">
                    {session.challenge.hints.map((hint, i) => (
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
                  <span className="text-sm font-mono text-muted-foreground">buggy_code.py</span>
                </div>
                <Badge variant="secondary" className="text-xs font-mono">Python</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-44px)]">
              <MonacoEditor
                value={code}
                onChange={setCode}
                language="python"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Arena;
