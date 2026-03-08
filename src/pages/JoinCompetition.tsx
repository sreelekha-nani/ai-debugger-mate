import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bug, Zap, Lock, Timer, Camera, Maximize, CheckCircle2, Users, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const JoinCompetition = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [competition, setCompetition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  // Proctoring steps
  const [cameraGranted, setCameraGranted] = useState(false);
  const [fullscreenReady, setFullscreenReady] = useState(false);
  const [cameraRequesting, setCameraRequesting] = useState(false);

  useEffect(() => {
    if (!slug) { setError("Invalid competition link."); setLoading(false); return; }

    const fetchComp = async () => {
      const { data, error: fetchErr } = await supabase
        .from("competitions")
        .select("*")
        .eq("slug", slug)
        .single();

      if (fetchErr || !data) {
        setError("Competition not found. Please check the link.");
      } else {
        setCompetition(data);
        // Count participants
        const { count } = await supabase
          .from("participants")
          .select("id", { count: "exact", head: true })
          .eq("competition_id", data.id);
        setParticipantCount(count || 0);
      }
      setLoading(false);
    };

    fetchComp();

    const channel = supabase
      .channel(`comp-join-${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "competitions" }, (payload: any) => {
        if (payload.new?.slug === slug) setCompetition(payload.new);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "participants" }, () => {
        setParticipantCount((c) => c + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [slug]);

  const requestCamera = async () => {
    setCameraRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop()); // stop immediately, Arena will re-request
      setCameraGranted(true);
      toast({ title: "Camera access granted ✓" });
    } catch {
      toast({ title: "Camera required", description: "Please allow camera access to participate.", variant: "destructive" });
    } finally {
      setCameraRequesting(false);
    }
  };

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreenReady(true);
      toast({ title: "Fullscreen enabled ✓" });
      // Exit immediately—Arena will re-enter
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch {
      toast({ title: "Fullscreen required", description: "Please allow fullscreen mode.", variant: "destructive" });
    }
  };

  const handleJoin = async () => {
    if (!user || !competition) return;

    // Check max participants
    if (competition.max_participants && participantCount >= competition.max_participants) {
      toast({ title: "Competition full", description: "Maximum participants reached.", variant: "destructive" });
      return;
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from("participants")
      .select("id")
      .eq("competition_id", competition.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      sessionStorage.setItem("participant_id", existing.id);
      sessionStorage.setItem("competition_id", competition.id);
      navigate("/arena");
      return;
    }

    setJoining(true);
    try {
      const { data, error } = await supabase.from("participants").insert({
        competition_id: competition.id,
        name: profile?.full_name || "Participant",
        team: profile?.college_name || "Solo",
        user_id: user.id,
      }).select().single();

      if (error) throw error;

      sessionStorage.setItem("participant_id", data.id);
      sessionStorage.setItem("competition_id", competition.id);
      navigate("/arena");
    } catch (e: any) {
      if (e.message?.includes("participants_user_competition_unique")) {
        toast({ title: "Already joined", description: "You can only join once per competition.", variant: "destructive" });
      } else {
        toast({ title: "Failed to join", description: e.message, variant: "destructive" });
      }
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Bug className="w-8 h-8 text-primary animate-float" />
          </div>
          <p className="text-muted-foreground">Loading competition...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/20">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <Lock className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">{error}</h2>
            <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = competition?.status === "active";
  const isScheduled = competition?.status === "scheduled";
  const isEnded = competition?.status === "ended";
  const allStepsComplete = cameraGranted && fullscreenReady;
  const stepsComplete = (cameraGranted ? 1 : 0) + (fullscreenReady ? 1 : 0);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-primary/20 shadow-2xl">
        <CardContent className="pt-8 pb-6 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 glow-primary">
              <Bug className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{competition.title}</h1>
            {competition.description && (
              <p className="text-sm text-muted-foreground mt-2">{competition.description}</p>
            )}
          </div>

          {/* Info badges */}
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">{competition.difficulty}</Badge>
            <Badge variant="outline">⏱ {competition.duration / 60} min</Badge>
            <Badge variant="outline">
              <Users className="w-3 h-3 mr-1" />
              {participantCount}{competition.max_participants ? `/${competition.max_participants}` : ""} joined
            </Badge>
            <Badge
              variant={isActive ? "default" : isEnded ? "secondary" : "outline"}
              className={isActive ? "bg-success text-success-foreground" : ""}
            >
              {isActive && "🟢 LIVE"}
              {isScheduled && "⏳ Upcoming"}
              {isEnded && "✅ Ended"}
            </Badge>
          </div>

          {/* Logged in as */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
            <ShieldCheck className="w-4 h-4 text-success shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || profile?.email}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">Logged In</Badge>
          </div>

          {/* Active: Proctoring Steps */}
          {isActive && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Pre-Exam Setup</p>
                <span className="text-xs text-muted-foreground">{stepsComplete}/2 complete</span>
              </div>
              <Progress value={(stepsComplete / 2) * 100} className="h-1.5" />

              {/* Step 1: Camera */}
              <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${cameraGranted ? "border-success/30 bg-success/5" : "border-border/50"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cameraGranted ? "bg-success/20" : "bg-muted"}`}>
                  {cameraGranted ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Camera className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Camera Permission</p>
                  <p className="text-xs text-muted-foreground">Required for proctoring</p>
                </div>
                {!cameraGranted && (
                  <Button size="sm" variant="outline" onClick={requestCamera} disabled={cameraRequesting}>
                    {cameraRequesting ? "Requesting..." : "Allow"}
                  </Button>
                )}
              </div>

              {/* Step 2: Fullscreen */}
              <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${fullscreenReady ? "border-success/30 bg-success/5" : "border-border/50"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${fullscreenReady ? "bg-success/20" : "bg-muted"}`}>
                  {fullscreenReady ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Maximize className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Fullscreen Mode</p>
                  <p className="text-xs text-muted-foreground">Required during competition</p>
                </div>
                {!fullscreenReady && (
                  <Button size="sm" variant="outline" onClick={requestFullscreen}>
                    Enable
                  </Button>
                )}
              </div>

              <Button
                onClick={handleJoin}
                disabled={joining || !allStepsComplete}
                className="w-full h-12 text-base font-bold glow-primary"
              >
                {joining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Joining...
                  </>
                ) : !allStepsComplete ? (
                  "Complete all steps to join"
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" /> Enter Competition
                  </>
                )}
              </Button>
            </div>
          )}

          {isScheduled && (
            <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 text-center">
              <Timer className="w-6 h-6 text-warning mx-auto mb-2" />
              <p className="font-medium text-warning">Competition hasn't started yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                {competition.scheduled_start
                  ? `Starts at ${new Date(competition.scheduled_start).toLocaleString()}`
                  : "Waiting for admin to start"}
              </p>
            </div>
          )}

          {isEnded && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="font-medium text-muted-foreground">This competition has ended.</p>
            </div>
          )}

          <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinCompetition;
