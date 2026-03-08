import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bug, Trophy, Clock, Play, LogOut, User, Award, Timer, Zap, ChevronRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const [activeComp, setActiveComp] = useState<any>(null);
  const [scheduledComp, setScheduledComp] = useState<any>(null);
  const [previousResults, setPreviousResults] = useState<any[]>([]);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch competitions
      const { data: comps } = await supabase
        .from("competitions")
        .select("*")
        .in("status", ["active", "scheduled"])
        .order("created_at", { ascending: false })
        .limit(2);

      if (comps) {
        setActiveComp(comps.find((c) => c.status === "active") || null);
        setScheduledComp(comps.find((c) => c.status === "scheduled") || null);
      }

      // Fetch previous results
      if (user) {
        const { data: results } = await supabase
          .from("participants")
          .select("*, competitions(title, difficulty)")
          .eq("user_id", user.id)
          .eq("submitted", true)
          .order("submitted_at", { ascending: false })
          .limit(10);
        setPreviousResults(results || []);
      }
    };

    fetchData();

    const channel = supabase
      .channel("dashboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "competitions" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Countdown timer
  useEffect(() => {
    if (!scheduledComp?.scheduled_start) return;
    const interval = setInterval(() => {
      const diff = new Date(scheduledComp.scheduled_start).getTime() - Date.now();
      if (diff <= 0) { setCountdown("Starting soon..."); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h > 0 ? h + "h " : ""}${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [scheduledComp]);

  const handleJoinCompetition = async () => {
    if (!activeComp || !user) return;

    // Check if already participating
    const { data: existing } = await supabase
      .from("participants")
      .select("id")
      .eq("competition_id", activeComp.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      sessionStorage.setItem("participant_id", existing.id);
      sessionStorage.setItem("competition_id", activeComp.id);
      navigate("/arena");
      return;
    }

    const { data, error } = await supabase.from("participants").insert({
      competition_id: activeComp.id,
      name: profile?.full_name || "Participant",
      team: profile?.college_name || "Solo",
      user_id: user.id,
    }).select().single();

    if (error) {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
      return;
    }

    sessionStorage.setItem("participant_id", data.id);
    sessionStorage.setItem("competition_id", activeComp.id);
    navigate("/arena");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bug className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg">Bug Busters</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/leaderboard")}>
              <Trophy className="w-4 h-4 mr-1" /> Leaderboard
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Welcome Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardContent className="pt-8 pb-6 px-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">
                      Welcome, <span className="text-gradient-primary">{profile?.full_name || "Participant"}</span>!
                    </h1>
                    <p className="text-sm text-muted-foreground">@{profile?.username} {profile?.college_name && `· ${profile.college_name}`}</p>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs border-success/30 text-success">
                <div className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse" /> Online
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Competition Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Competition */}
          <Card className={`border-2 transition-all ${activeComp ? "border-success/40 bg-success/5" : "border-border/50"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="w-4 h-4 text-success" /> Competition Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeComp ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-success text-success-foreground text-xs">🟢 LIVE</Badge>
                    </div>
                    <h3 className="font-bold text-lg">{activeComp.title}</h3>
                    <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                      <span className="capitalize">{activeComp.difficulty}</span>
                      <span>·</span>
                      <span>{activeComp.duration / 60} minutes</span>
                    </div>
                  </div>
                  <Button onClick={handleJoinCompetition} className="w-full h-11 font-bold glow-primary">
                    <Zap className="w-4 h-4 mr-2" /> Join Competition <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : scheduledComp ? (
                <div className="space-y-3">
                  <div>
                    <Badge variant="outline" className="text-xs border-warning/30 text-warning mb-2">⏳ Upcoming</Badge>
                    <h3 className="font-bold">{scheduledComp.title}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{scheduledComp.difficulty} · {scheduledComp.duration / 60} min</p>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/5 border border-warning/20 text-center">
                    <Timer className="w-5 h-5 text-warning mx-auto mb-1" />
                    <p className="font-bold text-warning text-lg font-mono">{countdown}</p>
                    <p className="text-xs text-muted-foreground">until competition starts</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No competitions scheduled</p>
                  <p className="text-xs text-muted-foreground">Check back later!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" /> Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previousResults.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-primary/5 text-center">
                    <p className="text-2xl font-bold text-primary">{previousResults.length}</p>
                    <p className="text-xs text-muted-foreground">Competitions</p>
                  </div>
                  <div className="p-3 rounded-lg bg-success/5 text-center">
                    <p className="text-2xl font-bold text-success">
                      {Math.round(previousResults.reduce((a, r) => a + (r.accuracy || 0), 0) / previousResults.length)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Accuracy</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/5 text-center">
                    <p className="text-2xl font-bold text-accent">
                      {previousResults.reduce((a, r) => a + (r.bugs_fixed || 0), 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Bugs Fixed</p>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/5 text-center">
                    <p className="text-2xl font-bold text-warning">
                      {Math.max(...previousResults.map((r) => r.score || 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">Best Score</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No results yet</p>
                  <p className="text-xs text-muted-foreground">Join a competition to get started!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Previous Results */}
        {previousResults.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Previous Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {previousResults.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bug className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{(r.competitions as any)?.title || "Competition"}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {(r.competitions as any)?.difficulty} · {formatTime(r.time_spent || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{r.score} pts</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{r.bugs_fixed}/{r.total_bugs} bugs</span>
                        <span>{r.accuracy}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
