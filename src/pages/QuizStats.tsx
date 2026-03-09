import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, ArrowLeft, BarChart3, Target, Flame, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface QuizSubmission {
  id: string;
  language: string;
  question_type: string;
  difficulty: string;
  is_correct: boolean;
  submitted_at: string;
}

const LANG_COLORS: Record<string, string> = {
  Python: "hsl(199, 89%, 48%)",
  Java: "hsl(38, 92%, 50%)",
  SQL: "hsl(217, 91%, 50%)",
};

const DIFF_COLORS: Record<string, string> = {
  Easy: "hsl(142, 76%, 46%)",
  Medium: "hsl(38, 92%, 50%)",
  Hard: "hsl(0, 72%, 55%)",
};

const TYPE_LABELS: Record<string, string> = {
  output_prediction: "Output Prediction",
  debugging: "Debugging",
  logic: "Logic",
};

const QuizStats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("quiz_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(500);
      setSubmissions((data as QuizSubmission[]) || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const overall = useMemo(() => {
    const total = submissions.length;
    const correct = submissions.filter((s) => s.is_correct).length;
    return { total, correct, accuracy: total ? Math.round((correct / total) * 100) : 0 };
  }, [submissions]);

  const byLanguage = useMemo(() => {
    const map: Record<string, { total: number; correct: number }> = {};
    submissions.forEach((s) => {
      if (!map[s.language]) map[s.language] = { total: 0, correct: 0 };
      map[s.language].total++;
      if (s.is_correct) map[s.language].correct++;
    });
    return Object.entries(map).map(([lang, v]) => ({
      name: lang,
      total: v.total,
      correct: v.correct,
      accuracy: Math.round((v.correct / v.total) * 100),
    }));
  }, [submissions]);

  const byDifficulty = useMemo(() => {
    const map: Record<string, { total: number; correct: number }> = {};
    submissions.forEach((s) => {
      if (!map[s.difficulty]) map[s.difficulty] = { total: 0, correct: 0 };
      map[s.difficulty].total++;
      if (s.is_correct) map[s.difficulty].correct++;
    });
    const order = ["Easy", "Medium", "Hard"];
    return order
      .filter((d) => map[d])
      .map((d) => ({
        name: d,
        total: map[d].total,
        correct: map[d].correct,
        accuracy: Math.round((map[d].correct / map[d].total) * 100),
      }));
  }, [submissions]);

  const byType = useMemo(() => {
    const map: Record<string, { total: number; correct: number }> = {};
    submissions.forEach((s) => {
      if (!map[s.question_type]) map[s.question_type] = { total: 0, correct: 0 };
      map[s.question_type].total++;
      if (s.is_correct) map[s.question_type].correct++;
    });
    return Object.entries(map).map(([type, v]) => ({
      name: TYPE_LABELS[type] || type,
      total: v.total,
      correct: v.correct,
      accuracy: Math.round((v.correct / v.total) * 100),
    }));
  }, [submissions]);

  const streakInfo = useMemo(() => {
    let current = 0;
    let longest = 0;
    let streak = 0;
    for (const s of submissions) {
      if (s.is_correct) {
        streak++;
        if (streak > longest) longest = streak;
      } else {
        streak = 0;
      }
    }
    // current streak from most recent
    for (const s of submissions) {
      if (s.is_correct) current++;
      else break;
    }
    return { current, longest };
  }, [submissions]);

  const pieData = byLanguage.map((l) => ({ name: l.name, value: l.total }));

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/quiz")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-accent" />
          </div>
          <span className="font-bold text-lg">Quiz Stats</span>
          <Badge variant="outline" className="text-xs">{overall.total} answered</Badge>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : submissions.length === 0 ? (
          <Card className="border-accent/20">
            <CardContent className="py-16 text-center space-y-4">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">No quiz history yet. Start answering questions!</p>
              <Button onClick={() => navigate("/quiz")}>Go to Quiz</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-primary/20">
                <CardContent className="pt-4 pb-3 text-center">
                  <BarChart3 className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{overall.total}</p>
                  <p className="text-xs text-muted-foreground">Total Answered</p>
                </CardContent>
              </Card>
              <Card className="border-success/20">
                <CardContent className="pt-4 pb-3 text-center">
                  <Target className="w-5 h-5 text-success mx-auto mb-1" />
                  <p className="text-2xl font-bold text-success">{overall.accuracy}%</p>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                </CardContent>
              </Card>
              <Card className="border-warning/20">
                <CardContent className="pt-4 pb-3 text-center">
                  <Flame className="w-5 h-5 text-warning mx-auto mb-1" />
                  <p className="text-2xl font-bold text-warning">{streakInfo.current}</p>
                  <p className="text-xs text-muted-foreground">Current Streak</p>
                </CardContent>
              </Card>
              <Card className="border-accent/20">
                <CardContent className="pt-4 pb-3 text-center">
                  <Trophy className="w-5 h-5 text-accent mx-auto mb-1" />
                  <p className="text-2xl font-bold text-accent">{streakInfo.longest}</p>
                  <p className="text-xs text-muted-foreground">Best Streak</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="language" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="language">By Language</TabsTrigger>
                <TabsTrigger value="difficulty">By Difficulty</TabsTrigger>
                <TabsTrigger value="type">By Type</TabsTrigger>
              </TabsList>

              {/* By Language */}
              <TabsContent value="language" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Questions by Language</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                            {pieData.map((entry, i) => (
                              <Cell key={i} fill={LANG_COLORS[entry.name] || `hsl(${i * 90}, 60%, 50%)`} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Accuracy by Language</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={byLanguage}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 88%)" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(v: number) => `${v}%`} />
                          <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                            {byLanguage.map((entry, i) => (
                              <Cell key={i} fill={LANG_COLORS[entry.name] || `hsl(${i * 90}, 60%, 50%)`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                <BreakdownTable data={byLanguage} colorMap={LANG_COLORS} />
              </TabsContent>

              {/* By Difficulty */}
              <TabsContent value="difficulty" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Performance by Difficulty</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={byDifficulty}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 88%)" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="correct" name="Correct" stackId="a" fill="hsl(142, 76%, 46%)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="total" name="Total" fill="hsl(222, 15%, 88%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <BreakdownTable data={byDifficulty} colorMap={DIFF_COLORS} />
              </TabsContent>

              {/* By Type */}
              <TabsContent value="type" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Performance by Question Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={byType} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 88%)" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: number) => `${v}%`} />
                        <Bar dataKey="accuracy" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <BreakdownTable data={byType} colorMap={{}} />
              </TabsContent>
            </Tabs>

            {/* Recent History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Recent History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left px-4 py-2 font-medium">#</th>
                        <th className="text-left px-4 py-2 font-medium">Language</th>
                        <th className="text-left px-4 py-2 font-medium">Difficulty</th>
                        <th className="text-left px-4 py-2 font-medium">Type</th>
                        <th className="text-left px-4 py-2 font-medium">Result</th>
                        <th className="text-left px-4 py-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.slice(0, 30).map((s, i) => (
                        <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2">
                            <Badge variant="outline" className="text-xs">{s.language}</Badge>
                          </td>
                          <td className="px-4 py-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                s.difficulty === "Easy" ? "text-success border-success/30" :
                                s.difficulty === "Hard" ? "text-destructive border-destructive/30" :
                                "text-warning border-warning/30"
                              }`}
                            >
                              {s.difficulty}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{TYPE_LABELS[s.question_type] || s.question_type}</td>
                          <td className="px-4 py-2">
                            {s.is_correct ? (
                              <Badge className="bg-success/10 text-success border-success/30 text-xs">✓ Correct</Badge>
                            ) : (
                              <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-xs">✗ Wrong</Badge>
                            )}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">
                            {new Date(s.submitted_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

/* Reusable breakdown table */
const BreakdownTable = ({ data, colorMap }: { data: { name: string; total: number; correct: number; accuracy: number }[]; colorMap: Record<string, string> }) => (
  <Card>
    <CardContent className="p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="text-left px-4 py-2 font-medium">Category</th>
            <th className="text-center px-4 py-2 font-medium">Total</th>
            <th className="text-center px-4 py-2 font-medium">Correct</th>
            <th className="text-center px-4 py-2 font-medium">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.name} className="border-b border-border/50">
              <td className="px-4 py-2 font-medium">{row.name}</td>
              <td className="px-4 py-2 text-center">{row.total}</td>
              <td className="px-4 py-2 text-center text-success">{row.correct}</td>
              <td className="px-4 py-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${row.accuracy}%`, backgroundColor: colorMap[row.name] || "hsl(199, 89%, 48%)" }}
                    />
                  </div>
                  <span className="text-xs font-mono">{row.accuracy}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent>
  </Card>
);

export default QuizStats;
