import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Trophy, Bug, Clock, Target, ArrowRight, RotateCcw } from "lucide-react";
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
        <Card className="max-w-md">
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

  const handlePlayAgain = () => {
    clearSession();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Grade */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-card border-4 border-primary/30 mb-4">
            <span className={`text-4xl font-bold ${gradeColor}`}>{grade}</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Challenge Complete!</h1>
          <p className="text-muted-foreground">{evaluation.feedback}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Bug, label: "Bugs Fixed", value: `${evaluation.bugsFixed}/${evaluation.totalBugs}`, color: "text-primary" },
            { icon: Target, label: "Accuracy", value: `${evaluation.accuracy}%`, color: "text-accent" },
            { icon: Clock, label: "Time", value: formatTime(timeSpent), color: "text-warning" },
            { icon: Trophy, label: "Tests", value: `${evaluation.testsPassed}/${evaluation.totalTests}`, color: "text-success" },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4 text-center">
                <Icon className={`w-6 h-6 mx-auto mb-1 ${color}`} />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Accuracy bar */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Overall Accuracy</span>
              <span className="font-bold">{evaluation.accuracy}%</span>
            </div>
            <Progress value={evaluation.accuracy} className="h-3" />
          </CardContent>
        </Card>

        {/* Bug Details */}
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bug-by-Bug Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {evaluation.bugDetails?.map((bd: any, i: number) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${bd.fixed ? "bg-success/5 border border-success/20" : "bg-destructive/5 border border-destructive/20"}`}>
                {bd.fixed ? <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Bug #{bd.bugIndex + 1}</span>
                    <Badge variant={bd.fixed ? "default" : "destructive"} className="text-xs">
                      {bd.fixed ? "Fixed" : "Not Fixed"}
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
        <div className="flex gap-3">
          <Button onClick={handlePlayAgain} variant="outline" className="flex-1 h-12">
            <RotateCcw className="w-4 h-4 mr-2" /> Try Again
          </Button>
          <Button onClick={() => navigate("/leaderboard")} className="flex-1 h-12">
            <Trophy className="w-4 h-4 mr-2" /> Leaderboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
