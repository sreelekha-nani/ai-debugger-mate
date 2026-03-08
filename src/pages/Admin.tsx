import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, Play, Square, Users, Clock, Download, RefreshCw, Trophy, Bug,
  AlertTriangle, Eye, Pencil, Trash2, Plus, Calendar, FileText, X, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_PASSWORD = "bugbusters2026";

interface CompetitionForm {
  title: string;
  description: string;
  difficulty: string;
  duration: number;
  scheduledStart: string;
  scheduledEnd: string;
}

const defaultForm: CompetitionForm = {
  title: "Bug Busters Challenge",
  description: "Fix all the bugs in the given Python program within the time limit. Read the problem description carefully and use the code editor to make your corrections.",
  difficulty: "medium",
  duration: 900,
  scheduledStart: "",
  scheduledEnd: "",
};

const Admin = () => {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CompetitionForm>({ ...defaultForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [expandedComp, setExpandedComp] = useState<string | null>(null);

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

  // Also poll check-competitions to auto-start/end
  const checkCompetitions = useCallback(async () => {
    try {
      await supabase.functions.invoke("check-competitions");
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetchData();
    checkCompetitions();
    const interval = setInterval(() => { fetchData(); checkCompetitions(); }, 10000);

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "competitions" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, () => fetchData())
      .subscribe();

    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [authenticated, fetchData, checkCompetitions]);

  const updateForm = (field: keyof CompetitionForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const createCompetition = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: challenge, error: genError } = await supabase.functions.invoke("generate-buggy-code", {
        body: { language: "python", difficulty: form.difficulty },
      });
      if (genError) throw genError;
      if (challenge.error) throw new Error(challenge.error);

      const { error } = await supabase.from("competitions").insert({
        title: form.title.trim(),
        description: form.description.trim(),
        difficulty: form.difficulty,
        duration: form.duration,
        challenge_data: challenge,
        status: "scheduled",
        scheduled_start: form.scheduledStart || null,
        scheduled_end: form.scheduledEnd || null,
      });
      if (error) throw error;
      toast({ title: "Competition Created", description: "Challenge generated successfully." });
      setForm({ ...defaultForm });
      fetchData();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (comp: any) => {
    setEditingId(comp.id);
    setForm({
      title: comp.title,
      description: comp.description || "",
      difficulty: comp.difficulty,
      duration: comp.duration,
      scheduledStart: comp.scheduled_start ? new Date(comp.scheduled_start).toISOString().slice(0, 16) : "",
      scheduledEnd: comp.scheduled_end ? new Date(comp.scheduled_end).toISOString().slice(0, 16) : "",
    });
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("competitions").update({
      title: form.title.trim(),
      description: form.description.trim(),
      difficulty: form.difficulty,
      duration: form.duration,
      scheduled_start: form.scheduledStart || null,
      scheduled_end: form.scheduledEnd || null,
    }).eq("id", editingId);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Competition Updated" });
      setEditDialogOpen(false);
      setEditingId(null);
      setForm({ ...defaultForm });
      fetchData();
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const deleteCompetition = async () => {
    if (!deleteTargetId) return;
    const { error } = await supabase.from("competitions").delete().eq("id", deleteTargetId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Competition Deleted" });
      fetchData();
    }
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
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

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
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
            <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { fetchData(); checkCompetitions(); }}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: Trophy, label: "Total", value: competitions.length, color: "text-primary" },
            { icon: Calendar, label: "Scheduled", value: competitions.filter((c) => c.status === "scheduled").length, color: "text-warning" },
            { icon: Play, label: "Active", value: competitions.filter((c) => c.status === "active").length, color: "text-success" },
            { icon: Users, label: "Participants", value: participants.length, color: "text-accent" },
            { icon: AlertTriangle, label: "Disqualified", value: participants.filter((p) => p.disqualified).length, color: "text-destructive" },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="pt-4 pb-3">
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
              <Plus className="w-4 h-4 text-primary" /> Create New Competition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Competition Title *</Label>
                <Input value={form.title} onChange={(e) => updateForm("title", e.target.value)} placeholder="Bug Busters Challenge" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v) => updateForm("difficulty", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (2 bugs)</SelectItem>
                    <SelectItem value="medium">Medium (3 bugs)</SelectItem>
                    <SelectItem value="hard">Hard (5 bugs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="Describe the competition rules and objectives..."
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Duration (minutes)</Label>
                <Input type="number" value={form.duration / 60} onChange={(e) => updateForm("duration", Number(e.target.value) * 60)} className="h-10" min={5} max={120} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Start Date & Time</Label>
                <Input type="datetime-local" value={form.scheduledStart} onChange={(e) => updateForm("scheduledStart", e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">End Date & Time</Label>
                <Input type="datetime-local" value={form.scheduledEnd} onChange={(e) => updateForm("scheduledEnd", e.target.value)} className="h-10" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={createCompetition} disabled={loading} className="glow-primary">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Generating Challenge...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" /> Create Competition
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {form.scheduledStart ? `Auto-starts at ${new Date(form.scheduledStart).toLocaleString()}` : "Will need manual start"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Competitions List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" /> All Competitions ({competitions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {competitions.length === 0 ? (
              <div className="text-center py-12">
                <Bug className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No competitions yet. Create one above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {competitions.map((comp) => {
                  const compParticipants = participants.filter((p) => p.competition_id === comp.id);
                  const submitted = compParticipants.filter((p) => p.submitted).length;
                  const disqualified = compParticipants.filter((p) => p.disqualified).length;
                  const isExpanded = expandedComp === comp.id;

                  return (
                    <div key={comp.id} className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                      {/* Competition header */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base truncate">{comp.title}</h3>
                              <Badge
                                variant={comp.status === "active" ? "default" : comp.status === "ended" ? "secondary" : "outline"}
                                className={`text-xs shrink-0 ${
                                  comp.status === "active" ? "bg-success text-success-foreground" : ""
                                }`}
                              >
                                {comp.status === "active" && "🟢 "}
                                {comp.status === "scheduled" && "⏳ "}
                                {comp.status === "ended" && "✅ "}
                                {comp.status.charAt(0).toUpperCase() + comp.status.slice(1)}
                              </Badge>
                            </div>
                            {comp.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{comp.description}</p>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                              <span className="capitalize">📊 {comp.difficulty}</span>
                              <span>⏱ {comp.duration / 60} min</span>
                              <span>👥 {compParticipants.length} joined</span>
                              <span>✅ {submitted} submitted</span>
                              {disqualified > 0 && <span className="text-destructive">🚫 {disqualified} DQ</span>}
                              {comp.scheduled_start && <span>📅 {formatDateTime(comp.scheduled_start)}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {comp.status === "scheduled" && (
                              <>
                                <Button size="sm" onClick={() => startCompetition(comp.id)} className="bg-success hover:bg-success/90 text-success-foreground">
                                  <Play className="w-3.5 h-3.5 mr-1" /> Start
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openEditDialog(comp)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                            {comp.status === "active" && (
                              <Button size="sm" variant="destructive" onClick={() => endCompetition(comp.id)}>
                                <Square className="w-3.5 h-3.5 mr-1" /> End
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => downloadResults(comp.id)}>
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            {comp.status !== "active" && (
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirmDelete(comp.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setExpandedComp(isExpanded ? null : comp.id)}>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded participants table */}
                      {isExpanded && (
                        <div className="border-t border-border/30 bg-secondary/10">
                          {compParticipants.length === 0 ? (
                            <div className="p-6 text-center text-sm text-muted-foreground">No participants yet.</div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow className="border-border/30">
                                  <TableHead className="text-xs w-10">#</TableHead>
                                  <TableHead className="text-xs">Name</TableHead>
                                  <TableHead className="text-xs">Team</TableHead>
                                  <TableHead className="text-xs text-center">Status</TableHead>
                                  <TableHead className="text-xs text-center">Score</TableHead>
                                  <TableHead className="text-xs text-center">Bugs</TableHead>
                                  <TableHead className="text-xs text-center">Accuracy</TableHead>
                                  <TableHead className="text-xs text-center">Warnings</TableHead>
                                  <TableHead className="text-xs text-center">Camera</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {compParticipants
                                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                                  .map((p, i) => (
                                    <TableRow key={p.id} className="border-border/20">
                                      <TableCell className="text-xs font-mono text-muted-foreground">{i + 1}</TableCell>
                                      <TableCell className="text-sm font-medium">{p.name}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{p.team}</TableCell>
                                      <TableCell className="text-center">
                                        {p.disqualified ? (
                                          <Badge variant="destructive" className="text-xs">DQ</Badge>
                                        ) : p.submitted ? (
                                          <Badge className="text-xs bg-success text-success-foreground">Done</Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-xs">Active</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-center font-mono text-sm font-bold">{p.score || 0}</TableCell>
                                      <TableCell className="text-center font-mono text-xs">{p.bugs_fixed || 0}/{p.total_bugs || 0}</TableCell>
                                      <TableCell className="text-center">
                                        <Badge variant={Number(p.accuracy) >= 80 ? "default" : Number(p.accuracy) >= 50 ? "secondary" : "destructive"} className="text-xs font-mono">
                                          {p.accuracy || 0}%
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Badge variant={p.warnings >= 3 ? "destructive" : p.warnings > 0 ? "secondary" : "outline"} className="text-xs">
                                          {p.warnings}/3
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Eye className={`w-4 h-4 mx-auto ${p.webcam_active ? "text-success" : "text-destructive/50"}`} />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" /> Edit Competition
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input value={form.title} onChange={(e) => updateForm("title", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={2} className="resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v) => updateForm("difficulty", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" value={form.duration / 60} onChange={(e) => updateForm("duration", Number(e.target.value) * 60)} className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Start Time</Label>
                <Input type="datetime-local" value={form.scheduledStart} onChange={(e) => updateForm("scheduledStart", e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Time</Label>
                <Input type="datetime-local" value={form.scheduledEnd} onChange={(e) => updateForm("scheduledEnd", e.target.value)} className="h-10" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} className="glow-primary">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Delete Competition
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the competition and all associated participant data. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteCompetition}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
