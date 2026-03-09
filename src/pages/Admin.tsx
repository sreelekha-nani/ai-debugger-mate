import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, Play, Square, Users, Clock, Download, RefreshCw, Trophy, Bug,
  AlertTriangle, Eye, Pencil, Trash2, Plus, Calendar, X, ChevronDown, ChevronUp, Link2, Copy,
  Share2, ExternalLink, UserCheck, Monitor, Crown
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import OwnerPanel from "@/components/OwnerPanel";

interface CompetitionForm {
  title: string;
  description: string;
  difficulty: string;
  duration: number;
  scheduledStart: string;
  scheduledEnd: string;
  maxParticipants: string;
}

const defaultForm: CompetitionForm = {
  title: "Bug Busters Challenge",
  description: "Fix all the bugs in the given Python program within the time limit.",
  difficulty: "medium",
  duration: 900,
  scheduledStart: "",
  scheduledEnd: "",
  maxParticipants: "",
};

const Admin = () => {
  const navigate = useNavigate();
  const { isOwner } = useAdmin();
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [resultsCompId, setResultsCompId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CompetitionForm>({ ...defaultForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [expandedComp, setExpandedComp] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState({ url: "", title: "", slug: "" });

  const fetchData = useCallback(async () => {
    const [compRes, partRes, profRes] = await Promise.all([
      supabase.from("competitions").select("*").order("created_at", { ascending: false }),
      supabase.from("participants").select("*").order("joined_at", { ascending: false }),
      supabase.from("profiles").select("id, email, full_name"),
    ]);
    if (compRes.data) setCompetitions(compRes.data);
    if (partRes.data) setParticipants(partRes.data);
    if (profRes.data) setProfiles(profRes.data);
  }, []);

  const checkCompetitions = useCallback(async () => {
    try { await supabase.functions.invoke("check-competitions"); } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    checkCompetitions();
    const interval = setInterval(() => { fetchData(); checkCompetitions(); }, 10000);

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "competitions" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, () => fetchData())
      .subscribe();

    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [fetchData, checkCompetitions]);

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

      const maxP = form.maxParticipants ? parseInt(form.maxParticipants) : null;

      const { data: comp, error } = await supabase.from("competitions").insert({
        title: form.title.trim(),
        description: form.description.trim(),
        difficulty: form.difficulty,
        duration: form.duration,
        challenge_data: challenge,
        status: "scheduled",
        scheduled_start: form.scheduledStart || null,
        scheduled_end: form.scheduledEnd || null,
        max_participants: maxP,
      }).select().single();
      if (error) throw error;

      const compUrl = `${window.location.origin}/contest/${comp.slug}`;
      setGeneratedLink({ url: compUrl, title: comp.title, slug: comp.slug });
      setLinkDialogOpen(true);
      setForm({ ...defaultForm });
      fetchData();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/contest/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link Copied!", description: url });
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
      maxParticipants: comp.max_participants ? String(comp.max_participants) : "",
    });
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const maxP = form.maxParticipants ? parseInt(form.maxParticipants) : null;
    const { error } = await supabase.from("competitions").update({
      title: form.title.trim(),
      description: form.description.trim(),
      difficulty: form.difficulty,
      duration: form.duration,
      scheduled_start: form.scheduledStart || null,
      scheduled_end: form.scheduledEnd || null,
      max_participants: maxP,
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
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Competition Deleted" }); fetchData(); }
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  const startCompetition = async (id: string) => {
    const { error } = await supabase.from("competitions")
      .update({ status: "active", actual_start: new Date().toISOString() }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Competition Started!" });
    fetchData();
  };

  const endCompetition = async (id: string) => {
    const { error } = await supabase.from("competitions")
      .update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Competition Ended" });
    fetchData();
  };

  const getEmail = (userId: string | null) => {
    if (!userId) return "N/A";
    const profile = profiles.find((p) => p.id === userId);
    return profile?.email || "N/A";
  };

  const downloadResults = (competitionId: string, format: "csv" | "excel" = "csv") => {
    const compParticipants = participants
      .filter((p) => p.competition_id === competitionId)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    const headers = "Rank,Name,Email,Bugs Fixed,Total Bugs,Accuracy,Time Spent (s),Score,Warnings,Disqualified,Submitted At";
    const rows = compParticipants.map((p, i) =>
      `${i + 1},"${p.name}","${getEmail(p.user_id)}",${p.bugs_fixed || 0},${p.total_bugs || 0},${p.accuracy || 0}%,${p.time_spent || 0},${p.score || 0},${p.warnings},${p.disqualified},${p.submitted_at || "N/A"}`
    );
    const content = [headers, ...rows].join("\n");

    if (format === "excel") {
      // TSV format opens natively in Excel
      const tsvContent = content.replace(/,/g, "\t").replace(/"/g, "");
      const blob = new Blob(["\uFEFF" + tsvContent], { type: "application/vnd.ms-excel;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bugbusters-results-${competitionId.slice(0, 8)}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([content], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bugbusters-results-${competitionId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast({ title: `Results downloaded as ${format.toUpperCase()}` });
  };

  const formatDateTime = (iso: string | null) => iso ? new Date(iso).toLocaleString() : "—";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOwner ? <Crown className="w-6 h-6 text-warning" /> : <Shield className="w-6 h-6 text-primary" />}
            <h1 className="text-lg font-bold">{isOwner ? "Owner Dashboard" : "Admin Dashboard"}</h1>
            {isOwner && <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">👑 Owner</Badge>}
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
        {isOwner && (
          <Tabs defaultValue="competitions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="competitions">🏆 Competitions</TabsTrigger>
              <TabsTrigger value="owner">👑 Owner Panel</TabsTrigger>
            </TabsList>
            <TabsContent value="owner">
              <OwnerPanel />
            </TabsContent>
          </Tabs>
        )}
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

        {/* Competition Management Section */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Competition Management — Create & Generate Link
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
                    <SelectItem value="easy">🟢 Easy — Syntax & simple errors (1–2 bugs)</SelectItem>
                    <SelectItem value="medium">🟡 Moderate — Logic & loop errors (2–3 bugs)</SelectItem>
                    <SelectItem value="hard">🔴 Hard — Complex multi-bug challenges (3–5 bugs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={2} className="resize-none" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Duration (minutes)</Label>
                <Input type="number" value={form.duration / 60} onChange={(e) => updateForm("duration", Number(e.target.value) * 60)} className="h-10" min={5} max={120} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Max Participants</Label>
                <Input type="number" value={form.maxParticipants} onChange={(e) => updateForm("maxParticipants", e.target.value)} className="h-10" min={1} placeholder="Unlimited" />
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
                    Generating Challenge & Link...
                  </>
                ) : (
                  <><Plus className="w-4 h-4 mr-1" /> Create Competition & Generate Link</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                A unique shareable contest link will be generated automatically.
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
                <p className="text-muted-foreground">No competitions yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {competitions.map((comp) => {
                  const compParticipants = participants.filter((p) => p.competition_id === comp.id);
                  const submitted = compParticipants.filter((p) => p.submitted).length;
                  const disqualified = compParticipants.filter((p) => p.disqualified).length;
                  const activeParts = compParticipants.filter((p) => !p.submitted && !p.disqualified).length;
                  const isExpanded = expandedComp === comp.id;

                  return (
                    <div key={comp.id} className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base truncate">{comp.title}</h3>
                              <Badge
                                variant={comp.status === "active" ? "default" : comp.status === "ended" ? "secondary" : "outline"}
                                className={`text-xs shrink-0 ${comp.status === "active" ? "bg-success text-success-foreground" : ""}`}
                              >
                                {comp.status === "active" && "🟢 "}
                                {comp.status === "scheduled" && "⏳ "}
                                {comp.status === "ended" && "✅ "}
                                {comp.status.charAt(0).toUpperCase() + comp.status.slice(1)}
                              </Badge>
                            </div>
                            {comp.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{comp.description}</p>}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                              <span className="capitalize">📊 {comp.difficulty}</span>
                              <span>⏱ {comp.duration / 60} min</span>
                              <span>👥 {compParticipants.length}{comp.max_participants ? `/${comp.max_participants}` : ""} joined</span>
                              {comp.status === "active" && <span className="text-success">🖥 {activeParts} active</span>}
                              <span>✅ {submitted} submitted</span>
                              {disqualified > 0 && <span className="text-destructive">🚫 {disqualified} DQ</span>}
                              {comp.scheduled_start && <span>📅 {formatDateTime(comp.scheduled_start)}</span>}
                            </div>
                            {/* Shareable Competition link */}
                            {comp.slug && (
                              <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                                <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                <code className="text-xs text-primary truncate">
                                  {window.location.origin}/contest/{comp.slug}
                                </code>
                                <Button variant="ghost" size="sm" className="h-6 px-2 shrink-0" onClick={() => copyLink(comp.slug)}>
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 px-2 shrink-0" onClick={() => {
                                  setGeneratedLink({
                                    url: `${window.location.origin}/contest/${comp.slug}`,
                                    title: comp.title,
                                    slug: comp.slug,
                                  });
                                  setLinkDialogOpen(true);
                                }}>
                                  <Share2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
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
                            {comp.status === "ended" && comp.slug && (
                              <Button size="sm" variant="outline" onClick={() => navigate(`/competition/${comp.slug}/results`)} className="border-primary/30 text-primary">
                                <Trophy className="w-3.5 h-3.5 mr-1" /> Results
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => downloadResults(comp.id, "csv")}>
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

                      {/* Expanded: Live monitoring + participants + leaderboard */}
                      {isExpanded && (
                        <div className="border-t border-border/30 bg-secondary/10">
                          {/* Live monitoring summary */}
                          {comp.status === "active" && (
                            <div className="p-4 border-b border-border/20 bg-success/5">
                              <div className="flex items-center gap-2 mb-3">
                                <Monitor className="w-4 h-4 text-success" />
                                <span className="text-sm font-bold">Live Monitoring</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-2 rounded-lg bg-card border border-border/30 text-center">
                                  <p className="text-lg font-bold">{compParticipants.length}</p>
                                  <p className="text-[10px] text-muted-foreground">Joined</p>
                                </div>
                                <div className="p-2 rounded-lg bg-card border border-border/30 text-center">
                                  <p className="text-lg font-bold text-success">{activeParts}</p>
                                  <p className="text-[10px] text-muted-foreground">Active Now</p>
                                </div>
                                <div className="p-2 rounded-lg bg-card border border-border/30 text-center">
                                  <p className="text-lg font-bold text-primary">{submitted}</p>
                                  <p className="text-[10px] text-muted-foreground">Submitted</p>
                                </div>
                                <div className="p-2 rounded-lg bg-card border border-border/30 text-center">
                                  <p className="text-lg font-bold">{compParticipants.filter(p => p.webcam_active).length}</p>
                                  <p className="text-[10px] text-muted-foreground">Camera On</p>
                                </div>
                              </div>
                            </div>
                          )}

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

        {/* Competition Results Section */}
        {(() => {
          const endedComps = competitions.filter((c) => c.status === "ended");
          if (endedComps.length === 0) return null;
          return (
            <Card className="border-accent/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-accent" /> Competition Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {endedComps.map((comp) => (
                    <Button
                      key={comp.id}
                      size="sm"
                      variant={resultsCompId === comp.id ? "default" : "outline"}
                      onClick={() => setResultsCompId(resultsCompId === comp.id ? null : comp.id)}
                    >
                      {comp.title}
                    </Button>
                  ))}
                </div>

                {resultsCompId && (() => {
                  const comp = competitions.find((c) => c.id === resultsCompId);
                  const compParticipants = participants
                    .filter((p) => p.competition_id === resultsCompId)
                    .sort((a, b) => (b.score || 0) - (a.score || 0));

                  if (!comp) return null;
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="font-bold text-lg">{comp.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            Ended: {formatDateTime(comp.ended_at)} · {compParticipants.length} participants
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => downloadResults(resultsCompId, "csv")}>
                            <Download className="w-3.5 h-3.5 mr-1" /> CSV
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => downloadResults(resultsCompId, "excel")}>
                            <Download className="w-3.5 h-3.5 mr-1" /> Excel
                          </Button>
                        </div>
                      </div>

                      {compParticipants.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">No participants in this competition.</div>
                      ) : (
                        <div className="rounded-xl border border-border/50 overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead className="text-xs w-12">Rank</TableHead>
                                <TableHead className="text-xs">Name</TableHead>
                                <TableHead className="text-xs">Email</TableHead>
                                <TableHead className="text-xs text-center">Bugs Fixed</TableHead>
                                <TableHead className="text-xs text-center">Time Taken</TableHead>
                                <TableHead className="text-xs text-center">Score</TableHead>
                                <TableHead className="text-xs text-center">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {compParticipants.map((p, i) => (
                                <TableRow key={p.id} className={`border-border/20 ${i < 3 ? "bg-primary/5" : ""}`}>
                                  <TableCell className="font-mono font-bold text-sm">
                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                                  </TableCell>
                                  <TableCell className="font-medium text-sm">{p.name}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{getEmail(p.user_id)}</TableCell>
                                  <TableCell className="text-center font-mono text-sm">{p.bugs_fixed || 0}/{p.total_bugs || 0}</TableCell>
                                  <TableCell className="text-center font-mono text-sm">
                                    {p.time_spent ? `${Math.floor(p.time_spent / 60)}m ${p.time_spent % 60}s` : "—"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="default" className="font-mono font-bold">{p.score || 0}</Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {p.disqualified ? (
                                      <Badge variant="destructive" className="text-xs">Disqualified</Badge>
                                    ) : (
                                      <Badge className="text-xs bg-success text-success-foreground">Completed</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          );
        })()}
      </div>


      {/* Generated Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" /> Competition Link Generated!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-3">
                <Link2 className="w-7 h-7 text-success" />
              </div>
              <p className="font-bold text-lg">{generatedLink.title}</p>
              <p className="text-xs text-muted-foreground mt-1">Share this link with participants to join</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 border border-border flex items-center gap-2">
              <code className="text-sm text-primary flex-1 truncate">{generatedLink.url}</code>
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => {
                navigator.clipboard.writeText(generatedLink.url);
                toast({ title: "Copied!" });
              }}>
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="w-full" onClick={() => {
                navigator.clipboard.writeText(generatedLink.url);
                toast({ title: "Copied!" });
              }}>
                <Copy className="w-4 h-4 mr-1" /> Copy Link
              </Button>
              <Button variant="outline" className="w-full" onClick={() => window.open(generatedLink.url, "_blank")}>
                <ExternalLink className="w-4 h-4 mr-1" /> Preview
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Participants must log in before they can join. Camera and fullscreen will be required.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setLinkDialogOpen(false)} className="w-full">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v) => updateForm("difficulty", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">🟢 Easy</SelectItem>
                    <SelectItem value="medium">🟡 Moderate</SelectItem>
                    <SelectItem value="hard">🔴 Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" value={form.duration / 60} onChange={(e) => updateForm("duration", Number(e.target.value) * 60)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Participants</Label>
                <Input type="number" value={form.maxParticipants} onChange={(e) => updateForm("maxParticipants", e.target.value)} className="h-10" placeholder="Unlimited" />
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

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Delete Competition
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the competition and all associated data.
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
