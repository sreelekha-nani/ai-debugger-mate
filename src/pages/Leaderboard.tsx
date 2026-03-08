import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, ArrowLeft, Clock, Bug, Target, Crown, Medal, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface ParticipantRow {
  id: string;
  name: string;
  team: string;
  score: number;
  bugs_fixed: number;
  total_bugs: number;
  accuracy: number;
  time_spent: number;
  submitted: boolean;
  disqualified: boolean;
  competition_id: string;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [activeCompId, setActiveCompId] = useState<string | null>(null);

  const fetchData = async () => {
    // Get latest active or ended competition
    const { data: comps } = await supabase
      .from("competitions")
      .select("id")
      .in("status", ["active", "ended"])
      .order("created_at", { ascending: false })
      .limit(1);

    const compId = comps?.[0]?.id;
    setActiveCompId(compId || null);

    if (compId) {
      const { data } = await supabase
        .from("participants")
        .select("*")
        .eq("competition_id", compId)
        .eq("submitted", true)
        .eq("disqualified", false)
        .order("score", { ascending: false });
      setParticipants((data as ParticipantRow[]) || []);
    }
  };

  useEffect(() => {
    fetchData();

    // Realtime
    const channel = supabase
      .channel("leaderboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, () => fetchData())
      .subscribe();

    const interval = setInterval(fetchData, 10000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Trophy className="w-7 h-7 text-warning" /> Leaderboard
              </h1>
              <p className="text-muted-foreground text-sm">Live competition rankings · Real-time updates</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        {participants.length === 0 ? (
          <Card className="max-w-md mx-auto border-border/50">
            <CardContent className="p-12 text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                <Trophy className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h2 className="text-xl font-bold">No Submissions Yet</h2>
              <p className="text-muted-foreground">Waiting for participants to submit their solutions.</p>
              <Button onClick={() => navigate("/")} className="glow-primary">Go Home</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top 3 podium */}
            {participants.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
                {[1, 0, 2].map((rank) => {
                  const p = participants[rank];
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
                          <span>{p.bugs_fixed}/{p.total_bugs} bugs</span>
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
                    {participants.map((p, i) => (
                      <TableRow key={p.id} className={`border-border/30 ${i < 3 ? "bg-primary/5" : ""}`}>
                        <TableCell className="w-12 font-bold">
                          {i < 3 ? (
                            <span className="text-lg">{podiumColors[i].icon}</span>
                          ) : (
                            <span className="text-muted-foreground font-mono">{i + 1}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">{p.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{p.team}</Badge></TableCell>
                        <TableCell className="text-center font-mono">{p.bugs_fixed}/{p.total_bugs}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={p.accuracy >= 80 ? "default" : p.accuracy >= 50 ? "secondary" : "destructive"}
                            className="text-xs font-mono"
                          >
                            {p.accuracy}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">{formatTime(p.time_spent)}</TableCell>
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
