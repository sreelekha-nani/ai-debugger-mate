import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bug, Zap, Lock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      }
      setLoading(false);
    };

    fetchComp();

    // Realtime for status changes
    const channel = supabase
      .channel(`comp-join-${slug}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "competitions" }, (payload) => {
        if (payload.new.slug === slug) setCompetition(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [slug]);

  const handleJoin = async () => {
    if (!user || !competition) return;

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-primary/20 shadow-2xl">
        <CardContent className="pt-8 pb-6 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 glow-primary">
              <Bug className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{competition.title}</h1>
            {competition.description && (
              <p className="text-sm text-muted-foreground mt-2">{competition.description}</p>
            )}
          </div>

          <div className="flex justify-center gap-2">
            <Badge variant="outline" className="capitalize">{competition.difficulty}</Badge>
            <Badge variant="outline">⏱ {competition.duration / 60} min</Badge>
            <Badge
              variant={isActive ? "default" : isEnded ? "secondary" : "outline"}
              className={isActive ? "bg-success text-success-foreground" : ""}
            >
              {isActive && "🟢 LIVE"}
              {isScheduled && "⏳ Upcoming"}
              {isEnded && "✅ Ended"}
            </Badge>
          </div>

          {isActive && (
            <Button onClick={handleJoin} disabled={joining} className="w-full h-12 text-base font-bold glow-primary">
              {joining ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Joining...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" /> Enter Competition
                </>
              )}
            </Button>
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
