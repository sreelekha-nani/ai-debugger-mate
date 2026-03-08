import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, ArrowLeft, Clock, Bug, Target, Crown, Medal } from "lucide-react";
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

  const podiumColors = [
    { bg: "bg-warning/10", border: "border-warning/40", text: "text-warning", icon: "🥇", label: "Gold" },
    { bg: "bg-muted/30", border: "border-muted-foreground/30", text: "text-muted-foreground", icon: "🥈", label: "Silver" },
    { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-500", icon: "🥉", label: "Bronze" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="w-7 h-7 text-warning" /> Leaderboard
            </h1>
            <p className="text-muted-foreground text-sm">Live competition rankings · Auto-refreshes every 5s</p>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <Card className="max-w-md mx-auto border-border/50">
            <CardContent className="p-12 text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                <Trophy className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h2 className="text-xl font-bold">No Submissions Yet</h2>
              <p className="text-muted-foreground">Be the first to complete a debugging challenge!</p>
              <Button onClick={() => navigate("/")} className="glow-primary">Start Challenge</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top 3 podium */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
                {[1, 0, 2].map((rank) => {
                  const p = leaderboard[rank];
                  if (!p) return null;
                  const style = podiumColors[rank];
                  return (
                    <Card
                      key={p.id}
                      className={`text-center ${style.bg} ${style.border} border-2 transition-all duration-300 ${
                        rank === 0 ? "scale-110 -mt-6 shadow-xl" : ""
                      }`}
                    >
                      <CardContent className="pt-6 pb-4">
                        {rank === 0 && <Crown className="w-6 h-6 text-warning mx-auto mb-1" />}
                        <div className="text-4xl mb-2">{style.icon}</div>
                        <p className="font-bold truncate">{p.name}</p>
                        <Badge variant="outline" className="text-xs mt-1 mb-3">{p.team}</Badge>
                        <p className={`text-3xl font-black ${style.text}`}>{p.score}</p>
                        <p className="text-xs text-muted-foreground">points</p>
                        <div className="flex justify-center gap-3 mt-3 text-xs text-muted-foreground">
                          <span>{p.bugsFixed}/{p.totalBugs} bugs</span>
                          <span>{p.accuracy}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Full table */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Medal className="w-4 h-4 text-primary" /> All Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="w-12">Rank</TableHead>
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
                      <TableRow
                        key={p.id}
                        className={`border-border/30 ${i < 3 ? "bg-primary/5" : ""}`}
                      >
                        <TableCell className="w-12 font-bold">
                          {i < 3 ? (
                            <span className="text-lg">{podiumColors[i].icon}</span>
                          ) : (
                            <span className="text-muted-foreground font-mono">{i + 1}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">{p.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{p.team}</Badge></TableCell>
                        <TableCell className="text-center font-mono">{p.bugsFixed}/{p.totalBugs}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={p.accuracy >= 80 ? "default" : p.accuracy >= 50 ? "secondary" : "destructive"}
                            className="text-xs font-mono"
                          >
                            {p.accuracy}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">{formatTime(p.timeSpent)}</TableCell>
                        <TableCell className="text-right font-bold text-primary text-lg">{p.score}</TableCell>
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
