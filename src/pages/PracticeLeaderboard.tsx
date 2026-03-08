import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, ArrowLeft, Clock, Bug, Target, Crown, Medal, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface PracticeEntry {
  user_id: string;
  total_score: number;
  total_bugs_fixed: number;
  total_challenges: number;
  avg_accuracy: number;
  username: string;
  full_name: string;
}

const PracticeLeaderboard = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PracticeEntry[]>([]);

  const fetchData = async () => {
    // Fetch all practice submissions with profile info
    const { data: submissions } = await supabase
      .from("practice_submissions")
      .select("user_id, score, bugs_fixed, accuracy")
      .order("submitted_at", { ascending: false });

    if (!submissions || submissions.length === 0) {
      setEntries([]);
      return;
    }

    // Aggregate by user
    const userMap = new Map<string, { totalScore: number; totalBugs: number; count: number; totalAccuracy: number }>();
    for (const s of submissions) {
      const existing = userMap.get(s.user_id) || { totalScore: 0, totalBugs: 0, count: 0, totalAccuracy: 0 };
      existing.totalScore += s.score || 0;
      existing.totalBugs += s.bugs_fixed || 0;
      existing.count += 1;
      existing.totalAccuracy += Number(s.accuracy) || 0;
      userMap.set(s.user_id, existing);
    }

    // Fetch profiles
    const userIds = Array.from(userMap.keys());
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const result: PracticeEntry[] = Array.from(userMap.entries()).map(([uid, stats]) => ({
      user_id: uid,
      total_score: stats.totalScore,
      total_bugs_fixed: stats.totalBugs,
      total_challenges: stats.count,
      avg_accuracy: Math.round(stats.totalAccuracy / stats.count),
      username: profileMap.get(uid)?.username || "Unknown",
      full_name: profileMap.get(uid)?.full_name || "Unknown",
    }));

    result.sort((a, b) => b.total_score - a.total_score);
    setEntries(result);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const podiumColors = [
    { bg: "bg-warning/10", border: "border-warning/40", text: "text-warning", icon: "🥇" },
    { bg: "bg-muted/30", border: "border-muted-foreground/30", text: "text-muted-foreground", icon: "🥈" },
    { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-500", icon: "🥉" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Trophy className="w-7 h-7 text-warning" /> Practice Leaderboard
              </h1>
              <p className="text-muted-foreground text-sm">All-time practice rankings</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        {entries.length === 0 ? (
          <Card className="max-w-md mx-auto border-border/50">
            <CardContent className="p-12 text-center space-y-4">
              <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <h2 className="text-xl font-bold">No Practice Submissions Yet</h2>
              <p className="text-muted-foreground">Be the first to complete a practice challenge!</p>
              <Button onClick={() => navigate("/practice")} className="glow-primary">Start Practice</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {entries.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
                {[1, 0, 2].map((rank) => {
                  const p = entries[rank];
                  if (!p) return null;
                  const style = podiumColors[rank];
                  return (
                    <Card key={p.user_id} className={`text-center ${style.bg} ${style.border} border-2 ${rank === 0 ? "scale-110 -mt-6 shadow-xl" : ""}`}>
                      <CardContent className="pt-6 pb-4">
                        {rank === 0 && <Crown className="w-6 h-6 text-warning mx-auto mb-1" />}
                        <div className="text-4xl mb-2">{style.icon}</div>
                        <p className="font-bold truncate">{p.full_name}</p>
                        <p className="text-xs text-muted-foreground">@{p.username}</p>
                        <p className={`text-3xl font-black mt-2 ${style.text}`}>{p.total_score}</p>
                        <p className="text-xs text-muted-foreground">total points</p>
                        <div className="flex justify-center gap-3 mt-3 text-xs text-muted-foreground">
                          <span>{p.total_challenges} solved</span>
                          <span>{p.avg_accuracy}% avg</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Medal className="w-4 h-4 text-primary" /> All Practitioners
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Challenges</TableHead>
                      <TableHead className="text-center"><Bug className="w-4 h-4 inline" /> Bugs</TableHead>
                      <TableHead className="text-center"><Target className="w-4 h-4 inline" /> Avg Accuracy</TableHead>
                      <TableHead className="text-right">Total Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((p, i) => (
                      <TableRow key={p.user_id} className={`border-border/30 ${i < 3 ? "bg-primary/5" : ""}`}>
                        <TableCell className="w-12 font-bold">
                          {i < 3 ? <span className="text-lg">{podiumColors[i].icon}</span> : <span className="text-muted-foreground font-mono">{i + 1}</span>}
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">{p.full_name}</p>
                          <p className="text-xs text-muted-foreground">@{p.username}</p>
                        </TableCell>
                        <TableCell className="text-center font-mono">{p.total_challenges}</TableCell>
                        <TableCell className="text-center font-mono">{p.total_bugs_fixed}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={p.avg_accuracy >= 80 ? "default" : p.avg_accuracy >= 50 ? "secondary" : "destructive"} className="text-xs font-mono">
                            {p.avg_accuracy}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary text-lg">{p.total_score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default PracticeLeaderboard;
