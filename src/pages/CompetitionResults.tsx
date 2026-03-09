import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trophy, Bug, Clock, Target, Users, Medal, ArrowLeft, Download, Crown, Award, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Participant {
  id: string;
  name: string;
  team: string | null;
  score: number | null;
  bugs_fixed: number | null;
  total_bugs: number | null;
  accuracy: number | null;
  time_spent: number | null;
  submitted: boolean;
  disqualified: boolean;
  user_id: string | null;
}

interface Competition {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  duration: number;
  status: string;
  ended_at: string | null;
  actual_start: string | null;
}

const CompetitionResults = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      // Fetch competition by slug
      const { data: comp } = await supabase
        .from("competitions")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!comp) {
        setLoading(false);
        return;
      }

      setCompetition(comp);

      // Fetch participants sorted by score (desc), then by time_spent (asc)
      const { data: parts } = await supabase
        .from("participants")
        .select("*")
        .eq("competition_id", comp.id)
        .eq("submitted", true)
        .eq("disqualified", false)
        .order("score", { ascending: false })
        .order("time_spent", { ascending: true });

      if (parts) {
        setParticipants(parts);
        
        // Find current user's rank
        if (user) {
          const idx = parts.findIndex((p) => p.user_id === user.id);
          if (idx !== -1) setUserRank(idx + 1);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [slug, user]);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-muted-foreground font-mono">{rank}</span>;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
    if (rank === 2) return "bg-gray-300/20 text-gray-600 border-gray-400/30";
    if (rank === 3) return "bg-amber-500/20 text-amber-700 border-amber-500/30";
    return "";
  };

  const downloadResults = () => {
    if (!competition) return;
    const headers = "Rank,Name,Team,Score,Bugs Fixed,Accuracy,Time Spent";
    const rows = participants.map((p, i) =>
      `${i + 1},"${p.name}","${p.team || "Solo"}",${p.score || 0},${p.bugs_fixed || 0}/${p.total_bugs || 0},${p.accuracy || 0}%,${formatTime(p.time_spent)}`
    );
    const content = [headers, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${competition.title.replace(/\s+/g, "-")}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Bug className="w-12 h-12 text-primary mx-auto animate-bounce" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Competition not found.</p>
            <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (competition.status !== "ended") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Clock className="w-12 h-12 text-warning mx-auto animate-pulse" />
            <h2 className="text-xl font-bold">Competition In Progress</h2>
            <p className="text-muted-foreground">Results will be available once the competition ends.</p>
            <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Stats
  const topScore = participants[0]?.score || 0;
  const avgScore = participants.length
    ? Math.round(participants.reduce((sum, p) => sum + (p.score || 0), 0) / participants.length)
    : 0;
  const avgAccuracy = participants.length
    ? Math.round(participants.reduce((sum, p) => sum + (p.accuracy || 0), 0) / participants.length)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Trophy className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold">{competition.title}</h1>
              <p className="text-xs text-muted-foreground">Final Results</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={downloadResults}>
            <Download className="w-4 h-4 mr-1" /> Download Results
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* User Rank Card (if participated) */}
        {userRank && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    {getRankIcon(userRank)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Rank</p>
                    <p className="text-3xl font-bold">#{userRank}</p>
                    <p className="text-xs text-muted-foreground">out of {participants.length} participants</p>
                  </div>
                </div>
                {userRank <= 3 && (
                  <Badge className={`text-lg px-4 py-2 ${getRankBadge(userRank)}`}>
                    {userRank === 1 ? "🥇 Champion" : userRank === 2 ? "🥈 Runner-up" : "🥉 3rd Place"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "Participants", value: participants.length, color: "text-primary" },
            { icon: Trophy, label: "Top Score", value: topScore, color: "text-warning" },
            { icon: Star, label: "Avg Score", value: avgScore, color: "text-accent" },
            { icon: Target, label: "Avg Accuracy", value: `${avgAccuracy}%`, color: "text-success" },
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

        {/* Podium (Top 3) */}
        {participants.length >= 3 && (
          <Card className="border-border/50 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-warning" /> Podium
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-center gap-4 py-6">
                {/* 2nd Place */}
                <div className="text-center">
                  <div className="w-20 h-24 bg-gray-200/20 rounded-t-xl flex items-center justify-center border-2 border-gray-400/30">
                    <Medal className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="bg-gray-200/10 p-3 rounded-b-xl border-x-2 border-b-2 border-gray-400/30">
                    <p className="font-bold text-sm truncate max-w-[80px]">{participants[1]?.name}</p>
                    <p className="text-xs text-muted-foreground">{participants[1]?.score || 0} pts</p>
                  </div>
                </div>
                {/* 1st Place */}
                <div className="text-center -mt-8">
                  <div className="w-24 h-32 bg-yellow-500/20 rounded-t-xl flex items-center justify-center border-2 border-yellow-500/30">
                    <Crown className="w-10 h-10 text-yellow-500" />
                  </div>
                  <div className="bg-yellow-500/10 p-3 rounded-b-xl border-x-2 border-b-2 border-yellow-500/30">
                    <p className="font-bold truncate max-w-[96px]">{participants[0]?.name}</p>
                    <p className="text-sm text-warning font-bold">{participants[0]?.score || 0} pts</p>
                  </div>
                </div>
                {/* 3rd Place */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-amber-500/20 rounded-t-xl flex items-center justify-center border-2 border-amber-500/30">
                    <Award className="w-7 h-7 text-amber-600" />
                  </div>
                  <div className="bg-amber-500/10 p-3 rounded-b-xl border-x-2 border-b-2 border-amber-500/30">
                    <p className="font-bold text-sm truncate max-w-[80px]">{participants[2]?.name}</p>
                    <p className="text-xs text-muted-foreground">{participants[2]?.score || 0} pts</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Leaderboard */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Full Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No submissions for this competition.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="text-xs w-16">Rank</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Team</TableHead>
                    <TableHead className="text-xs text-center">Score</TableHead>
                    <TableHead className="text-xs text-center">Bugs Fixed</TableHead>
                    <TableHead className="text-xs text-center">Accuracy</TableHead>
                    <TableHead className="text-xs text-center">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((p, i) => {
                    const isCurrentUser = p.user_id === user?.id;
                    return (
                      <TableRow
                        key={p.id}
                        className={`border-border/20 ${isCurrentUser ? "bg-primary/5" : ""}`}
                      >
                        <TableCell className="font-bold">
                          <div className="flex items-center gap-2">
                            {getRankIcon(i + 1)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {p.name}
                          {isCurrentUser && (
                            <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.team || "Solo"}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-lg">{p.score || 0}</span>
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {p.bugs_fixed || 0}/{p.total_bugs || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={(p.accuracy || 0) >= 80 ? "default" : (p.accuracy || 0) >= 50 ? "secondary" : "destructive"}
                            className="font-mono"
                          >
                            {p.accuracy || 0}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground">
                          {formatTime(p.time_spent)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompetitionResults;
