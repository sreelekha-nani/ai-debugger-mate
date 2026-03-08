import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Play, Square, Users, Clock, Download, RefreshCw, Trophy, Bug, AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_PASSWORD = "bugbusters2026";

const Admin = () => {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New competition form
  const [title, setTitle] = useState("Bug Busters Challenge");
  const [difficulty, setDifficulty] = useState("medium");
  const [duration, setDuration] = useState(900);
  const [scheduledStart, setScheduledStart] = useState("");

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      toast({ title: "Admin Access Granted", description: "Welcome to the admin dashboard." });
    } else {
      toast({ title: "Access Denied", description: "Incorrect password.", variant: "destructive" });
    }
  };

  const fetchData = useCallback(async () => {
    const [compRes, partRes] = await Promise.all([
      supabase.from("competitions").select("*").order("created_at", { ascending: false }),
      supabase.from("participants").select("*").order("joined_at", { ascending: false }),
    ]);
    if (compRes.data) setCompetitions(compRes.data);
    if (partRes.data) setParticipants(partRes.data);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetchData();
    const interval = setInterval(fetchData, 5000);

    // Realtime subscriptions
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "competitions" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, () => fetchData())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [authenticated, fetchData]);

  const createCompetition = async () => {
    setLoading(true);
    try {
      // Generate challenge for all participants
      const { data: challenge, error: genError } = await supabase.functions.invoke("generate-buggy-code", {
        body: { language: "python", difficulty },
      });
      if (genError) throw genError;
      if (challenge.error) throw new Error(challenge.error);

      const { error } = await supabase.from("competitions").insert({
        title,
        difficulty,
        duration,
        challenge_data: challenge,
        status: scheduledStart ? "scheduled" : "scheduled",
        scheduled_start: scheduledStart || null,
      });
      if (error) throw error;
      toast({ title: "Competition Created", description: "Challenge generated and competition is ready." });
      fetchData();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const startCompetition = async (id: string) => {
    const { error } = await supabase
      .from("competitions")
      .update({ status: "active", actual_start: new Date().toISOString() })
      .eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Competition Started!", description: "All participants can now begin." });
    fetchData();
  };

  const endCompetition = async (id: string) => {
    const { error } = await supabase
      .from("competitions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Competition Ended", description: "Results are now final." });
    fetchData();
  };

  const downloadResults = (competitionId: string) => {
    const compParticipants = participants
      .filter((p) => p.competition_id === competitionId)
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    const csv = [
      "Rank,Name,Team,Score,Bugs Fixed,Total Bugs,Accuracy,Time Spent (s),Warnings,Disqualified,Submitted At",
      ...compParticipants.map((p, i) =>
        `${i + 1},"${p.name}","${p.team}",${p.score},${p.bugs_fixed},${p.total_bugs},${p.accuracy}%,${p.time_spent},${p.warnings},${p.disqualified},${p.submitted_at || "N/A"}`
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bugbusters-results-${competitionId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full border-primary/20">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 glow-primary">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Admin Dashboard</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter admin password to continue</p>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter admin password"
                className="h-12"
              />
            </div>
            <Button onClick={handleLogin} className="w-full h-12 font-bold glow-primary">
              Access Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Trophy, label: "Competitions", value: competitions.length, color: "text-primary" },
            { icon: Play, label: "Active", value: competitions.filter((c) => c.status === "active").length, color: "text-success" },
            { icon: Users, label: "Participants", value: participants.length, color: "text-accent" },
            { icon: AlertTriangle, label: "Disqualified", value: participants.filter((p) => p.disqualified).length, color: "text-destructive" },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Competition */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bug className="w-4 h-4 text-primary" /> Create New Competition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (2 bugs)</SelectItem>
                    <SelectItem value="medium">Medium (3 bugs)</SelectItem>
                    <SelectItem value="hard">Hard (5 bugs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration (minutes)</Label>
                <Input type="number" value={duration / 60} onChange={(e) => setDuration(Number(e.target.value) * 60)} className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Scheduled Start</Label>
                <Input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} className="h-10" />
              </div>
            </div>
            <Button onClick={createCompetition} disabled={loading} className="glow-primary">
              {loading ? "Generating Challenge..." : "Create Competition"}
            </Button>
          </CardContent>
        </Card>

        {/* Competitions List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" /> Competitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {competitions.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No competitions yet. Create one above.</p>
            ) : (
              <div className="space-y-3">
                {competitions.map((comp) => {
                  const compParticipants = participants.filter((p) => p.competition_id === comp.id);
                  return (
                    <div key={comp.id} className="p-4 rounded-xl border border-border/50 bg-card/50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-bold flex items-center gap-2">
                            {comp.title}
                            <Badge
                              variant={comp.status === "active" ? "default" : comp.status === "ended" ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {comp.status === "active" && "🟢 "}
                              {comp.status.charAt(0).toUpperCase() + comp.status.slice(1)}
                            </Badge>
                          </h3>
                          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                            <span className="capitalize">{comp.difficulty}</span>
                            <span>·</span>
                            <span>{comp.duration / 60} min</span>
                            <span>·</span>
                            <span>{compParticipants.length} participants</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {comp.status === "scheduled" && (
                            <Button size="sm" onClick={() => startCompetition(comp.id)} className="bg-success hover:bg-success/90 text-success-foreground">
                              <Play className="w-3.5 h-3.5 mr-1" /> Start
                            </Button>
                          )}
                          {comp.status === "active" && (
                            <Button size="sm" variant="destructive" onClick={() => endCompetition(comp.id)}>
                              <Square className="w-3.5 h-3.5 mr-1" /> End
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => downloadResults(comp.id)}>
                            <Download className="w-3.5 h-3.5 mr-1" /> CSV
                          </Button>
                        </div>
                      </div>

                      {/* Participants table */}
                      {compParticipants.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/30">
                              <TableHead className="text-xs">Name</TableHead>
                              <TableHead className="text-xs">Team</TableHead>
                              <TableHead className="text-xs text-center">Status</TableHead>
                              <TableHead className="text-xs text-center">Score</TableHead>
                              <TableHead className="text-xs text-center">Warnings</TableHead>
                              <TableHead className="text-xs text-center">Camera</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {compParticipants.map((p) => (
                              <TableRow key={p.id} className="border-border/20">
                                <TableCell className="text-sm font-medium">{p.name}</TableCell>
                                <TableCell className="text-sm">{p.team}</TableCell>
                                <TableCell className="text-center">
                                  {p.disqualified ? (
                                    <Badge variant="destructive" className="text-xs">DQ</Badge>
                                  ) : p.submitted ? (
                                    <Badge className="text-xs bg-success text-success-foreground">Submitted</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">In Progress</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center font-mono text-sm">{p.score || 0}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={p.warnings >= 3 ? "destructive" : p.warnings > 0 ? "secondary" : "outline"} className="text-xs">
                                    {p.warnings}/3
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {p.webcam_active ? (
                                    <Eye className="w-4 h-4 text-success mx-auto" />
                                  ) : (
                                    <Eye className="w-4 h-4 text-destructive mx-auto" />
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
