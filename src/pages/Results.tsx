import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Trophy, Bug, Clock, Target, ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { clearSession } from "@/lib/competition-store";

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { evaluation, timeSpent, challenge } = (location.state as any) || {};

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md border-border/50">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">No results to show.</p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;
  const grade = evaluation.accuracy >= 90 ? "A+" : evaluation.accuracy >= 75 ? "A" : evaluation.accuracy >= 60 ? "B" : evaluation.accuracy >= 40 ? "C" : "D";
  const gradeColor = evaluation.accuracy >= 75 ? "text-success" : evaluation.accuracy >= 50 ? "text-warning" : "text-destructive";
  const gradeGlow = evaluation.accuracy >= 75 ? "glow-success" : "";

  const handlePlayAgain = () => {
    clearSession();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Grade Hero */}
        <div className="text-center mb-10 animate-scale-in">
          {evaluation.accuracy >= 90 && (
            <Sparkles className="w-8 h-8 text-warning mx-auto mb-2 animate-float" />
          )}
          <div className={`inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-card border-2 border-primary/30 mb-4 ${gradeGlow}`}>
            <span className={`text-5xl font-black ${gradeColor}`}>{grade}</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Challenge Complete!</h1>
          <p className="text-muted-foreground text-lg">{evaluation.feedback}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-slide-up">
          {[
            { icon: Bug, label: "Bugs Fixed", value: `${evaluation.bugsFixed}/${evaluation.totalBugs}`, color: "text-primary" },
            { icon: Target, label: "Accuracy", value: `${evaluation.accuracy}%`, color: "text-accent" },
            { icon: Clock, label: "Time", value: formatTime(timeSpent), color: "text-warning" },
            { icon: Trophy, label: "Tests", value: `${evaluation.testsPassed}/${evaluation.totalTests}`, color: "text-success" },
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

        {/* Accuracy bar */}
        <Card className="mb-8 border-border/50">
          <CardContent className="pt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Overall Accuracy</span>
              <span className="font-bold">{evaluation.accuracy}%</span>
            </div>
            <Progress value={evaluation.accuracy} className="h-3" />
          </CardContent>
        </Card>

        {/* Bug Details */}
        <Card className="mb-8 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bug className="w-4 h-4 text-primary" /> Bug-by-Bug Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {evaluation.bugDetails?.map((bd: any, i: number) => (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-xl ${bd.fixed ? "bg-success/5 border border-success/20" : "bg-destructive/5 border border-destructive/20"}`}>
                {bd.fixed ? <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Bug #{bd.bugIndex + 1}</span>
                    <Badge variant={bd.fixed ? "default" : "destructive"} className="text-xs">
                      {bd.fixed ? "Fixed ✓" : "Not Fixed ✗"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{bd.comment}</p>
                  {challenge?.bugs?.[bd.bugIndex] && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      Line ~{challenge.bugs[bd.bugIndex].line}: {challenge.bugs[bd.bugIndex].description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 animate-slide-up">
          <Button onClick={handlePlayAgain} variant="outline" className="flex-1 h-12">
            <RotateCcw className="w-4 h-4 mr-2" /> Try Again
          </Button>
          <Button onClick={() => navigate("/leaderboard")} className="flex-1 h-12 glow-primary">
            <Trophy className="w-4 h-4 mr-2" /> Leaderboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
