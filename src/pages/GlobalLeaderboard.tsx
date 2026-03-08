import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, ArrowLeft, Crown, Medal, Bug, Flame, Target, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  username: string;
  email: string;
  total_score: number;
  competitions_won: number;
  practice_score: number;
  current_streak: number;
  competitions_participated: number;
}

const GlobalLeaderboard = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);

    // Fetch profiles with streak data
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, email, current_streak");

    if (!profiles) { setLoading(false); return; }

    // Fetch all competition participation
    const { data: participants } = await supabase
      .from("participants")
      .select("user_id, score, competition_id, submitted")
      .eq("submitted", true);

    // Fetch practice submissions
    const { data: practice } = await supabase
      .from("practice_submissions")
      .select("user_id, score");

    // Aggregate competition data per user
    const compMap = new Map<string, { totalScore: number; compIds: Set<string>; wins: number }>();
    if (participants) {
      // Group by competition to find winners
      const compScores = new Map<string, { userId: string; score: number }[]>();
      for (const p of participants) {
        if (!p.user_id) continue;
        const existing = compMap.get(p.user_id) || { totalScore: 0, compIds: new Set(), wins: 0 };
        existing.totalScore += p.score || 0;
        existing.compIds.add(p.competition_id);
        compMap.set(p.user_id, existing);

        const compList = compScores.get(p.competition_id) || [];
        compList.push({ userId: p.user_id, score: p.score || 0 });
        compScores.set(p.competition_id, compList);
      }
      // Calculate wins
      for (const [, scores] of compScores) {
        scores.sort((a, b) => b.score - a.score);
        if (scores.length > 0 && scores[0].score > 0) {
          const winner = compMap.get(scores[0].userId);
          if (winner) winner.wins++;
        }
      }
    }

    // Aggregate practice data
    const practiceMap = new Map<string, number>();
    if (practice) {
      for (const p of practice) {
        practiceMap.set(p.user_id, (practiceMap.get(p.user_id) || 0) + (p.score || 0));
      }
    }

    // Build leaderboard
    const result: LeaderboardEntry[] = profiles.map((p) => {
      const comp = compMap.get(p.id);
      return {
        user_id: p.id,
        full_name: p.full_name,
        username: p.username,
        email: p.email,
        total_score: (comp?.totalScore || 0) + (practiceMap.get(p.id) || 0),
        competitions_won: comp?.wins || 0,
        practice_score: practiceMap.get(p.id) || 0,
        current_streak: p.current_streak || 0,
        competitions_participated: comp?.compIds.size || 0,
      };
    }).filter(e => e.total_score > 0);

    result.sort((a, b) => b.total_score - a.total_score);
    setEntries(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const podiumColors = [
    { bg: "bg-warning/10", border: "border-warning/40", text: "text-warning", icon: "🥇" },
    { bg: "bg-muted/30", border: "border-muted-foreground/30", text: "text-muted-foreground", icon: "🥈" },
    { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-500", icon: "🥉" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Trophy className="w-7 h-7 text-warning" /> Global Leaderboard
              </h1>
              <p className="text-muted-foreground text-sm">Combined rankings from competitions & practice</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        {entries.length === 0 && !loading ? (
          <Card className="max-w-md mx-auto border-border/50">
            <CardContent className="p-12 text-center space-y-4">
              <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <h2 className="text-xl font-bold">No Rankings Yet</h2>
              <p className="text-muted-foreground">Complete challenges to appear on the leaderboard!</p>
              <Button onClick={() => navigate("/practice")} className="glow-primary">Start Practice</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Podium */}
            {entries.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
                {[1, 0, 2].map((rank) => {
                  const p = entries[rank];
                  if (!p) return null;
                  const style = podiumColors[rank];
                  return (
                    <Card key={p.user_id} className={`text-center ${style.bg} ${style.border} border-2 ${rank === 0 ? "scale-110 -mt-6 shadow-xl" : ""} transition-all`}>
                      <CardContent className="pt-6 pb-4">
                        {rank === 0 && <Crown className="w-6 h-6 text-warning mx-auto mb-1" />}
                        <div className="text-4xl mb-2">{style.icon}</div>
                        <p className="font-bold truncate">{p.full_name}</p>
                        <p className="text-xs text-muted-foreground">@{p.username}</p>
                        <p className={`text-3xl font-black mt-2 ${style.text}`}>{p.total_score}</p>
                        <p className="text-xs text-muted-foreground">total points</p>
                        <div className="flex justify-center gap-3 mt-3 text-xs text-muted-foreground">
                          <span>🏆 {p.competitions_won} wins</span>
                          {p.current_streak > 0 && <span>🔥 {p.current_streak}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Table */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Medal className="w-4 h-4 text-primary" /> All Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Competitions</TableHead>
                      <TableHead className="text-center"><Trophy className="w-4 h-4 inline" /> Wins</TableHead>
                      <TableHead className="text-center"><Zap className="w-4 h-4 inline" /> Practice</TableHead>
                      <TableHead className="text-center"><Flame className="w-4 h-4 inline" /> Streak</TableHead>
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
                        <TableCell className="text-center font-mono">{p.competitions_participated}</TableCell>
                        <TableCell className="text-center font-mono">{p.competitions_won}</TableCell>
                        <TableCell className="text-center font-mono">{p.practice_score}</TableCell>
                        <TableCell className="text-center">
                          {p.current_streak > 0 ? (
                            <Badge variant="outline" className="text-xs border-warning/30 text-warning font-mono">
                              🔥 {p.current_streak}
                            </Badge>
                          ) : <span className="text-muted-foreground">—</span>}
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

export default GlobalLeaderboard;
