import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bug, Zap, Trophy, Timer, Shield, Code2, ChevronDown, BookOpen, Scale, Users, Sparkles, ArrowRight, Camera, Maximize, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [activeComp, setActiveComp] = useState<any>(null);
  const [scheduledComp, setScheduledComp] = useState<any>(null);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const fetchCompetitions = async () => {
      const { data } = await supabase
        .from("competitions")
        .select("*")
        .in("status", ["active", "scheduled"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        if (data[0].status === "active") setActiveComp(data[0]);
        else setScheduledComp(data[0]);
      }
    };
    fetchCompetitions();

    // Realtime updates
    const channel = supabase
      .channel("competition-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "competitions" }, () => fetchCompetitions())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Countdown to scheduled start
  useEffect(() => {
    if (!scheduledComp?.scheduled_start) return;
    const interval = setInterval(() => {
      const diff = new Date(scheduledComp.scheduled_start).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("Starting...");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h > 0 ? h + "h " : ""}${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [scheduledComp]);

  const handleJoin = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter your name to join.", variant: "destructive" });
      return;
    }
    if (!activeComp) {
      toast({ title: "No active competition", description: "Wait for the admin to start a competition.", variant: "destructive" });
      return;
    }

    setIsJoining(true);
    try {
      const { data, error } = await supabase.from("participants").insert({
        competition_id: activeComp.id,
        name: name.trim(),
        team: team.trim() || "Solo",
      }).select().single();

      if (error) throw error;

      // Store participant info in sessionStorage
      sessionStorage.setItem("participant_id", data.id);
      sessionStorage.setItem("competition_id", activeComp.id);
      navigate("/arena");
    } catch (e: any) {
      toast({ title: "Failed to join", description: e.message, variant: "destructive" });
      setIsJoining(false);
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bug className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg">Bug Busters</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => scrollToSection("about")} className="hover:text-foreground transition-colors">About</button>
            <button onClick={() => scrollToSection("rules")} className="hover:text-foreground transition-colors">Rules</button>
            <button onClick={() => scrollToSection("join")} className="hover:text-foreground transition-colors">Join</button>
            <Button variant="outline" size="sm" onClick={() => navigate("/leaderboard")}>
              <Trophy className="w-4 h-4 mr-1" /> Leaderboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <Shield className="w-4 h-4 mr-1" /> Admin
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-success/5 rounded-full blur-[160px]" />
        </div>

        <div className="relative container mx-auto px-4 text-center max-w-4xl">
          {/* Competition Status Banner */}
          {activeComp && (
            <div className="mb-6 p-4 rounded-xl bg-success/10 border border-success/30 animate-slide-down">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="font-bold text-success">Competition is LIVE!</span>
                <span className="text-muted-foreground text-sm">— {activeComp.title}</span>
              </div>
            </div>
          )}
          {scheduledComp && !activeComp && (
            <div className="mb-6 p-4 rounded-xl bg-warning/10 border border-warning/30 animate-slide-down">
              <div className="flex items-center justify-center gap-2">
                <Timer className="w-4 h-4 text-warning" />
                <span className="font-bold text-warning">Starting in: {countdown}</span>
                <span className="text-muted-foreground text-sm">— {scheduledComp.title}</span>
              </div>
            </div>
          )}

          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm border-primary/30 text-primary animate-slide-down">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Competitive Debugging Challenge
          </Badge>

          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight mb-4 animate-slide-up">
            <span className="text-gradient-primary">Bug Busters</span>
          </h1>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground/80 mb-2 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Code Debugging Challenge
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground font-medium mb-8 animate-slide-up" style={{ animationDelay: "0.15s" }}>
            Fix Bugs. Beat the Clock. 🐛⏱️
          </p>

          <p className="text-muted-foreground max-w-2xl mx-auto mb-10 text-lg animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Race against time to debug Python programs. All participants receive the same challenge. Prove your debugging skills in this competitive coding arena.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-scale-in" style={{ animationDelay: "0.3s" }}>
            <Button size="lg" onClick={() => scrollToSection("join")} className="h-14 px-8 text-lg font-bold glow-primary">
              Join Competition <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => scrollToSection("about")} className="h-14 px-8 text-lg">
              Learn More <ChevronDown className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {[
              { icon: Zap, label: "Same Challenge", desc: "Fair for everyone" },
              { icon: Timer, label: "Global Timer", desc: "Synced countdown" },
              { icon: Camera, label: "Proctored", desc: "Camera monitored" },
              { icon: Maximize, label: "Fullscreen", desc: "Lockdown mode" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-4 rounded-xl bg-card/60 border border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
                <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 relative">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-accent/30 text-accent">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" /> About
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">What is Bug Busters?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A competitive debugging platform where participants race to fix buggy Python code under time pressure.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Proctored Environment",
                desc: "Camera monitoring, fullscreen enforcement, and anti-cheat systems ensure a fair competition for all participants.",
              },
              {
                icon: Code2,
                title: "Professional Code Editor",
                desc: "Debug in a VS Code-like editor with syntax highlighting, line numbers, and a dark theme.",
              },
              {
                icon: Trophy,
                title: "Live Competition",
                desc: "Compete with your coding club in real-time. All participants solve the same challenge simultaneously.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="bg-card/60 border-border/50 hover:border-primary/30 transition-all duration-300 group">
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:glow-primary transition-all duration-300">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Rules Section */}
      <section id="rules" className="py-24 relative bg-card/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-warning/30 text-warning">
              <Scale className="w-3.5 h-3.5 mr-1.5" /> Rules
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Competition Rules</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { num: "01", title: "Enable Camera", desc: "Your webcam must be active before the competition starts. Camera is monitored throughout." },
              { num: "02", title: "Enter Fullscreen", desc: "The competition runs in fullscreen lockdown mode. Exiting triggers a warning." },
              { num: "03", title: "Same Challenge for All", desc: "Every participant receives the exact same debugging problem for fairness." },
              { num: "04", title: "Debug the Code", desc: "Find and fix all bugs in the Python program using the code editor." },
              { num: "05", title: "Submit Before Time Runs Out", desc: "Your code auto-submits when the timer expires. Submit early for a better score!" },
              { num: "06", title: "3 Warnings = Disqualification", desc: "Tab switches, fullscreen exits, or camera disable each trigger a warning." },
            ].map(({ num, title, desc }) => (
              <div key={num} className="flex gap-4 p-5 rounded-xl bg-card/60 border border-border/50">
                <span className="text-3xl font-black text-primary/30 shrink-0">{num}</span>
                <div>
                  <h3 className="font-bold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Card className="mt-8 border-destructive/20 bg-destructive/5">
            <CardContent className="py-5 px-6">
              <h3 className="font-bold text-destructive flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5" /> Anti-Cheating Measures
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Webcam monitoring with random snapshot capture</li>
                <li>Fullscreen enforcement — exiting triggers a warning</li>
                <li>Tab switching is tracked and flagged</li>
                <li>External copy-paste and right-click are disabled</li>
                <li>Timer auto-submits to prevent time manipulation</li>
                <li>3 warnings result in automatic disqualification</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Join Section */}
      <section id="join" className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-success/30 text-success">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Join
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Join the Competition</h2>
            <p className="text-muted-foreground text-lg">Enter your details and start debugging!</p>
          </div>

          <Card className="max-w-lg mx-auto border-primary/20 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 glow-primary">
                <Bug className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Bug Busters Arena</CardTitle>
              <p className="text-sm text-muted-foreground">
                {activeComp ? `🟢 ${activeComp.title} — ${activeComp.difficulty} difficulty` : "Waiting for competition to start..."}
              </p>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team">Team Name</Label>
                <Input
                  id="team"
                  placeholder="Optional team name"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  className="h-12 bg-secondary/50"
                />
              </div>

              {!activeComp && (
                <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 text-center">
                  <Timer className="w-6 h-6 text-warning mx-auto mb-2" />
                  <p className="text-sm font-medium text-warning">No Active Competition</p>
                  <p className="text-xs text-muted-foreground">Wait for the admin to start a competition.</p>
                </div>
              )}

              <Button
                onClick={handleJoin}
                disabled={isJoining || !activeComp}
                className="w-full h-13 text-base font-bold glow-primary"
                size="lg"
              >
                {isJoining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Joining...
                  </>
                ) : (
                  <>
                    Enter the Arena <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Bug className="w-4 h-4 text-primary" />
            <span className="font-bold">Bug Busters</span>
          </div>
          <p className="text-sm text-muted-foreground">Code Debugging Challenge Platform · Built for Competitive Coders</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
