import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bug, Trophy, Clock, Play, LogOut, User, Award, Timer, Zap, ChevronRight, Calendar, CheckCircle2, Code2, Shield, Flame, Crown, Globe, Plus, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import AdminRequestButton from "@/components/AdminRequestButton";

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const { isAdmin, isOwner } = useAdmin();
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [previousResults, setPreviousResults] = useState<any[]>([]);
  const [practiceStats, setPracticeStats] = useState({ count: 0, totalScore: 0, avgAccuracy: 0 });
  const [streakData, setStreakData] = useState({ current: 0, longest: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const { data: comps } = await supabase
        .from("competitions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      setCompetitions(comps || []);

      try { await supabase.functions.invoke("check-competitions"); } catch {}

      if (user) {
        const { data: results } = await supabase
          .from("participants")
          .select("*, competitions(title, difficulty)")
          .eq("user_id", user.id)
          .eq("submitted", true)
          .order("submitted_at", { ascending: false })
          .limit(10);
        setPreviousResults(results || []);

        // Fetch practice stats
        const { data: practice } = await supabase
          .from("practice_submissions")
          .select("score, accuracy")
          .eq("user_id", user.id);
        if (practice && practice.length > 0) {
          setPracticeStats({
            count: practice.length,
            totalScore: practice.reduce((a, r) => a + (r.score || 0), 0),
            avgAccuracy: Math.round(practice.reduce((a, r) => a + (Number(r.accuracy) || 0), 0) / practice.length),
          });
        }

        // Fetch streak data from profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("current_streak, longest_streak")
          .eq("id", user.id)
          .single();
        if (profileData) {
          setStreakData({
            current: (profileData as any).current_streak || 0,
            longest: (profileData as any).longest_streak || 0,
          });
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);

    const channel = supabase
      .channel("dashboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "competitions" }, () => fetchData())
      .subscribe();

    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [user]);

  const activeComps = competitions.filter((c) => c.status === "active");
  const scheduledComps = competitions.filter((c) => c.status === "scheduled");
  const finishedComps = competitions.filter((c) => c.status === "ended");

  const handleJoinCompetition = async (comp: any) => {
    if (!user) return;

    const { data: existing } = await supabase
      .from("participants")
      .select("id")
      .eq("competition_id", comp.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      sessionStorage.setItem("participant_id", existing.id);
      sessionStorage.setItem("competition_id", comp.id);
      navigate("/arena");
      return;
    }

    const { data, error } = await supabase.from("participants").insert({
      competition_id: comp.id,
      name: profile?.full_name || "Participant",
      team: profile?.college_name || "Solo",
      user_id: user.id,
    }).select().single();

    if (error) {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
      return;
    }

    sessionStorage.setItem("participant_id", data.id);
    sessionStorage.setItem("competition_id", comp.id);
    navigate("/arena");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  const CompetitionCountdown = ({ comp }: { comp: any }) => {
    const [countdown, setCountdown] = useState("");
    useEffect(() => {
      if (!comp.scheduled_start) return;
      const tick = () => {
        const diff = new Date(comp.scheduled_start).getTime() - Date.now();
        if (diff <= 0) { setCountdown("Starting soon..."); return; }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCountdown(`${h > 0 ? h + "h " : ""}${m}m ${s}s`);
      };
      tick();
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }, [comp.scheduled_start]);
    return <span className="font-mono font-bold text-warning">{countdown}</span>;
  };

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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/practice")}>
              <Code2 className="w-4 h-4 mr-1" /> Practice
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/practice-leaderboard")}>
              <Trophy className="w-4 h-4 mr-1" /> Practice LB
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/global-leaderboard")}>
              <Globe className="w-4 h-4 mr-1" /> Global LB
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className={isOwner ? "border-warning/40 text-warning hover:bg-warning/10" : ""}>
                {isOwner ? <Crown className="w-4 h-4 mr-1" /> : <Shield className="w-4 h-4 mr-1" />}
                Admin Panel
              </Button>
            )}
            {!isAdmin && <AdminRequestButton />}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Welcome */}
        <Card className={`bg-gradient-to-br from-card ${isOwner ? "to-warning/5 border-warning/30" : "to-primary/5 border-primary/20"}`}>
          <CardContent className="pt-8 pb-6 px-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOwner ? "bg-warning/20" : "bg-primary/20"}`}>
                  {isOwner ? <Crown className="w-6 h-6 text-warning" /> : <User className="w-6 h-6 text-primary" />}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">
                    Welcome, <span className="text-gradient-primary">{profile?.full_name || "Participant"}</span>!
                  </h1>
                  <p className="text-sm text-muted-foreground">@{profile?.username} {profile?.college_name && `· ${profile.college_name}`}</p>
                  {isOwner && (
                    <Badge className="mt-1.5 bg-warning/20 text-warning border-warning/30 text-xs">
                      👑 Platform Owner – {profile?.full_name}
                    </Badge>
                  )}
                  {isAdmin && !isOwner && (
                    <Badge className="mt-1.5 bg-primary/20 text-primary border-primary/30 text-xs">
                      🛡️ Admin
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {streakData.current > 0 && (
                  <Badge variant="outline" className="text-xs border-warning/30 text-warning">
                    🔥 {streakData.current} day streak
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs border-success/30 text-success">
                  <div className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse" /> Online
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className={`grid grid-cols-1 gap-4 ${isAdmin ? "md:grid-cols-6" : "md:grid-cols-5"}`}>
          {isAdmin && (
            <Card className="border-primary/30 hover:border-primary/50 transition-all cursor-pointer group bg-gradient-to-br from-card to-primary/5" onClick={() => navigate("/admin")}>
              <CardContent className="pt-6 pb-5 text-center">
                <Plus className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold">Create Competition</h3>
                <p className="text-xs text-muted-foreground mt-1">Set up a new contest</p>
              </CardContent>
            </Card>
          )}
          <Card className="border-primary/20 hover:border-primary/40 transition-all cursor-pointer group" onClick={() => navigate("/practice")}>
            <CardContent className="pt-6 pb-5 text-center">
              <Code2 className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold">Practice Arena</h3>
              <p className="text-xs text-muted-foreground mt-1">Solve debugging challenges</p>
            </CardContent>
          </Card>
          <Card className="border-accent/20 hover:border-accent/40 transition-all cursor-pointer group" onClick={() => navigate("/global-leaderboard")}>
            <CardContent className="pt-6 pb-5 text-center">
              <Globe className="w-8 h-8 text-accent mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold">Global Leaderboard</h3>
              <p className="text-xs text-muted-foreground mt-1">Combined rankings</p>
            </CardContent>
          </Card>
          <Card className="border-warning/20 hover:border-warning/40 transition-all cursor-pointer group" onClick={() => navigate("/practice-leaderboard")}>
            <CardContent className="pt-6 pb-5 text-center">
              <Trophy className="w-8 h-8 text-warning mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold">Practice Leaderboard</h3>
              <p className="text-xs text-muted-foreground mt-1">Practice rankings</p>
            </CardContent>
          </Card>
          <Card className="border-success/20 hover:border-success/40 transition-all cursor-pointer group">
            <CardContent className="pt-6 pb-5 text-center">
              <Zap className="w-8 h-8 text-success mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold">Join Competition</h3>
              <p className="text-xs text-muted-foreground mt-1">Use a contest link</p>
            </CardContent>
          </Card>
        </div>

        {/* Live Competitions */}
        {activeComps.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Live Competitions
            </h2>
            {activeComps.map((comp) => (
              <Card key={comp.id} className="border-2 border-success/40 bg-success/5">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-success text-success-foreground text-xs">🟢 LIVE</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{comp.difficulty}</Badge>
                      </div>
                      <h3 className="font-bold text-lg">{comp.title}</h3>
                      {comp.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{comp.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">⏱ {comp.duration / 60} minutes</p>
                    </div>
                    <Button onClick={() => handleJoinCompetition(comp)} className="h-11 font-bold glow-primary">
                      <Zap className="w-4 h-4 mr-2" /> Join Now <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Upcoming */}
        {scheduledComps.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-warning" /> Upcoming Competitions
            </h2>
            {scheduledComps.map((comp) => (
              <Card key={comp.id} className="border-warning/20">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs border-warning/30 text-warning">⏳ Upcoming</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{comp.difficulty}</Badge>
                      </div>
                      <h3 className="font-bold">{comp.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">⏱ {comp.duration / 60} min · 📅 {comp.scheduled_start ? new Date(comp.scheduled_start).toLocaleString() : "TBD"}</p>
                    </div>
                    <div className="text-right">
                      {comp.scheduled_start && (
                        <div className="p-3 rounded-lg bg-warning/5 border border-warning/20 text-center">
                          <Timer className="w-4 h-4 text-warning mx-auto mb-1" />
                          <CompetitionCountdown comp={comp} />
                          <p className="text-[10px] text-muted-foreground">until start</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeComps.length === 0 && scheduledComps.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">No Active or Upcoming Competitions</p>
              <p className="text-xs text-muted-foreground mt-1">Try the Practice Arena or check back later!</p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" /> Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-primary/5 text-center">
                  <p className="text-2xl font-bold text-primary">{previousResults.length}</p>
                  <p className="text-xs text-muted-foreground">Competitions</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/5 text-center">
                  <p className="text-2xl font-bold text-accent">{practiceStats.count}</p>
                  <p className="text-xs text-muted-foreground">Practice Solved</p>
                </div>
                <div className="p-3 rounded-lg bg-success/5 text-center">
                  <p className="text-2xl font-bold text-success">{practiceStats.avgAccuracy || 0}%</p>
                  <p className="text-xs text-muted-foreground">Avg Accuracy</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/5 text-center">
                  <p className="text-2xl font-bold text-warning">{practiceStats.totalScore}</p>
                  <p className="text-xs text-muted-foreground">Total Score</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/5 text-center">
                  <p className="text-2xl font-bold text-destructive">🔥 {streakData.current}</p>
                  <p className="text-xs text-muted-foreground">Current Streak</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <p className="text-2xl font-bold text-foreground">🏆 {streakData.longest}</p>
                  <p className="text-xs text-muted-foreground">Longest Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" /> Finished ({finishedComps.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {finishedComps.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {finishedComps.slice(0, 5).map((comp) => (
                    <div key={comp.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 border border-border/20">
                      <div>
                        <p className="text-sm font-medium">{comp.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{comp.difficulty} · {comp.duration / 60} min</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">Finished</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No finished competitions</p>
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
                <Clock className="w-4 h-4 text-muted-foreground" /> Your Previous Results
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
