import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bug, Clock, Send, Eye, Lightbulb, Zap, RotateCcw, Trophy, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MonacoEditor from "@/components/MonacoEditor";

interface Challenge {
  title: string;
  description: string;
  buggyCode: string;
  correctCode: string;
  bugs: { line: number; description: string; type: string }[];
  testCases: { input: string; expectedOutput: string }[];
  hints?: string[];
}

const PRACTICE_DURATION = 600;

const LANGUAGES = [
  { value: "python", label: "🐍 Python", monaco: "python", ext: "py" },
  { value: "java", label: "☕ Java", monaco: "java", ext: "java" },
  { value: "c", label: "⚙️ C", monaco: "c", ext: "c" },
  { value: "cpp", label: "🔧 C++", monaco: "cpp", ext: "cpp" },
];

const Practice = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState("medium");
  const [language, setLanguage] = useState("python");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(PRACTICE_DURATION);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [previousTitles, setPreviousTitles] = useState<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load previous titles to avoid repeats
  useEffect(() => {
    if (!user) return;
    supabase
      .from("practice_submissions")
      .select("challenge_title")
      .eq("user_id", user.id)
      .not("challenge_title", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setPreviousTitles(data.map((d: any) => d.challenge_title).filter(Boolean));
      });
  }, [user]);

  const generateChallenge = async () => {
    setLoading(true);
    setResult(null);
    setShowHints(false);
    try {
      const { data, error } = await supabase.functions.invoke("generate-buggy-code", {
        body: { language, difficulty, previousTitles },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setChallenge(data as Challenge);
      setCode(data.buggyCode);
      setTimeLeft(PRACTICE_DURATION);
      setStarted(true);
    } catch (e: any) {
      toast({ title: "Failed to generate", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Timer
  useEffect(() => {
    if (!started || result) return;
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
  }, [started, result]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (!challenge || submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (auto) toast({ title: "⏰ Time's Up!", description: "Your code has been auto-submitted." });

    const timeSpent = PRACTICE_DURATION - timeLeft;
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

      // Save to practice_submissions
      if (user) {
        await supabase.from("practice_submissions").insert({
          user_id: user.id,
          difficulty,
          score,
          bugs_fixed: data.bugsFixed,
          total_bugs: data.totalBugs,
          accuracy: data.accuracy,
          time_spent: timeSpent,
          language,
          challenge_title: challenge.title,
        });
        setPreviousTitles((prev) => [challenge.title, ...prev].slice(0, 20));
      }

      setResult({ ...data, score, timeSpent });
    } catch (e: any) {
      toast({ title: "Evaluation failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [challenge, code, timeLeft, submitting, user, difficulty]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const timePercent = (timeLeft / PRACTICE_DURATION) * 100;
  const timeColor = timePercent > 50 ? "text-success" : timePercent > 20 ? "text-warning" : "text-destructive";

  const resetPractice = () => {
    setChallenge(null);
    setCode("");
    setStarted(false);
    setResult(null);
    setTimeLeft(PRACTICE_DURATION);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Pre-start screen
  if (!started) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Bug className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-lg">Practice Arena</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-16 max-w-lg">
          <Card className="border-primary/20">
            <CardContent className="pt-8 pb-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 glow-primary">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Practice Mode</h1>
                <p className="text-muted-foreground">Sharpen your debugging skills with random challenges. No proctoring required.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty Level</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">🟢 Easy (2 bugs)</SelectItem>
                    <SelectItem value="medium">🟡 Medium (3 bugs)</SelectItem>
                    <SelectItem value="hard">🔴 Hard (5 bugs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-sm text-muted-foreground space-y-1">
                <p>⏱ 10 minute time limit</p>
                <p>🐍 Python debugging challenge</p>
                <p>📊 Results visible on practice leaderboard</p>
              </div>

              <Button onClick={generateChallenge} disabled={loading} className="w-full h-12 text-base font-bold glow-primary">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Generating Challenge...
                  </>
                ) : (
                  <>Start Practice <Zap className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Results screen
  if (result) {
    const grade = result.accuracy >= 90 ? "A+" : result.accuracy >= 75 ? "A" : result.accuracy >= 60 ? "B" : result.accuracy >= 40 ? "C" : "D";
    const gradeColor = result.accuracy >= 75 ? "text-success" : result.accuracy >= 50 ? "text-warning" : "text-destructive";

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="text-center mb-10">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-card border-2 border-primary/30 mb-4`}>
              <span className={`text-4xl font-black ${gradeColor}`}>{grade}</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Practice Complete!</h1>
            <p className="text-muted-foreground">{result.feedback}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Bug, label: "Bugs Fixed", value: `${result.bugsFixed}/${result.totalBugs}`, color: "text-primary" },
              { icon: Trophy, label: "Score", value: result.score, color: "text-warning" },
              { icon: Clock, label: "Time", value: formatTime(result.timeSpent), color: "text-accent" },
              { label: "Accuracy", value: `${result.accuracy}%`, color: "text-success", icon: Zap },
            ].map(({ icon: Icon, label, value, color }) => (
              <Card key={label} className="border-border/50">
                <CardContent className="pt-5 pb-4 text-center">
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-3">
            <Button onClick={resetPractice} variant="outline" className="flex-1 h-12">
              <RotateCcw className="w-4 h-4 mr-2" /> Try Again
            </Button>
            <Button onClick={() => navigate("/practice-leaderboard")} className="flex-1 h-12 glow-primary">
              <Trophy className="w-4 h-4 mr-2" /> Leaderboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!challenge) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Bug className="w-5 h-5 text-primary" /> {challenge.title}
                <Badge variant="outline" className="text-xs">Practice</Badge>
              </h1>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="text-xs">🐍 Python</Badge>
                <Badge variant="outline" className="text-xs capitalize">{difficulty}</Badge>
                <Badge variant="outline" className="text-xs">{challenge.bugs.length} bugs</Badge>
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-2 font-mono text-2xl font-bold ${timeColor}`}>
            <Clock className="w-5 h-5" /> {formatTime(timeLeft)}
          </div>
        </div>
        <Progress value={timePercent} className="h-1 rounded-none" />
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
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
                  {showHints ? "Hide Hints" : "Show Hints"}
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
                  <span className="text-sm font-mono text-muted-foreground">practice.py</span>
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

export default Practice;
