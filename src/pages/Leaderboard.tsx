import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, ArrowLeft, Medal, Clock, Bug, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getLeaderboard, type Participant } from "@/lib/competition-store";

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<Participant[]>([]);

  useEffect(() => {
    setLeaderboard(getLeaderboard());
    const interval = setInterval(() => setLeaderboard(getLeaderboard()), 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;
  const getRankIcon = (i: number) => {
    if (i === 0) return <Medal className="w-5 h-5 text-warning" />;
    if (i === 1) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (i === 2) return <Medal className="w-5 h-5 text-orange-600" />;
    return <span className="text-sm text-muted-foreground font-mono">{i + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="w-7 h-7 text-warning" /> Leaderboard
            </h1>
            <p className="text-muted-foreground text-sm">Live competition rankings</p>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-12 text-center space-y-4">
              <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto" />
              <h2 className="text-xl font-semibold">No Submissions Yet</h2>
              <p className="text-muted-foreground">Be the first to complete a debugging challenge!</p>
              <Button onClick={() => navigate("/")}>Start Challenge</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top 3 podium */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
                {[1, 0, 2].map((rank) => {
                  const p = leaderboard[rank];
                  if (!p) return null;
                  return (
                    <Card key={p.id} className={`text-center ${rank === 0 ? "border-warning/50 shadow-lg scale-105 -mt-4" : "border-border"}`}>
                      <CardContent className="pt-6 pb-4">
                        <div className="text-3xl mb-2">{rank === 0 ? "🥇" : rank === 1 ? "🥈" : "🥉"}</div>
                        <p className="font-bold text-sm truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.team}</p>
                        <p className="text-2xl font-bold text-primary mt-2">{p.score}</p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Full table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">All Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-center"><Bug className="w-4 h-4 inline" /> Bugs</TableHead>
                      <TableHead className="text-center"><Target className="w-4 h-4 inline" /> Accuracy</TableHead>
                      <TableHead className="text-center"><Clock className="w-4 h-4 inline" /> Time</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((p, i) => (
                      <TableRow key={p.id} className={i < 3 ? "bg-primary/5" : ""}>
                        <TableCell className="w-12">{getRankIcon(i)}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{p.team}</Badge></TableCell>
                        <TableCell className="text-center">{p.bugsFixed}/{p.totalBugs}</TableCell>
                        <TableCell className="text-center">{p.accuracy}%</TableCell>
                        <TableCell className="text-center font-mono text-sm">{formatTime(p.timeSpent)}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{p.score}</TableCell>
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

export default Leaderboard;
