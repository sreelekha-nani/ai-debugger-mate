import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bug, Zap, Trophy, Timer, Shield, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { saveSession, generateId, type CompetitionSession } from "@/lib/competition-store";

const Index = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [language, setLanguage] = useState("python");
  const [difficulty, setDifficulty] = useState("medium");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter your name to join.", variant: "destructive" });
      return;
    }

    setIsJoining(true);
    const session: CompetitionSession = {
      participantId: generateId(),
      participantName: name.trim(),
      team: team.trim() || "Solo",
      language,
      difficulty,
      challenge: null,
      startTime: null,
      duration: difficulty === "easy" ? 600 : difficulty === "medium" ? 720 : 900,
      submitted: false,
      tabSwitchCount: 0,
    };
    saveSession(session);
    navigate("/arena");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-terminal via-background to-terminal/50 opacity-90" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6 animate-slide-up">
            <Bug className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered Debugging Challenge</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4 animate-slide-up">
            <span className="text-foreground">Debug</span>
            <span className="text-primary">Arena</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-slide-up">
            Race against time to fix AI-generated buggy code. Every challenge is unique.
            Compete with your coding club for the top spot.
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-16">
            {[
              { icon: Zap, label: "AI-Generated", desc: "Unique problems" },
              { icon: Timer, label: "Timed Rounds", desc: "10-15 minutes" },
              { icon: Trophy, label: "Leaderboard", desc: "Live rankings" },
              { icon: Shield, label: "Anti-Cheat", desc: "Fair play" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-4 rounded-lg bg-card/50 border border-border/50 backdrop-blur-sm">
                <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="font-semibold text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Join Form */}
      <div className="container mx-auto px-4 -mt-8 pb-20">
        <Card className="max-w-lg mx-auto shadow-xl border-primary/20 animate-slide-up">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Code2 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Join the Challenge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input id="name" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">Team Name</Label>
              <Input id="team" placeholder="Optional team name" value={team} onChange={(e) => setTeam(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="python">🐍 Python</SelectItem>
                  <SelectItem value="cpp">⚡ C++</SelectItem>
                  <SelectItem value="java">☕ Java</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Difficulty</Label>
              <RadioGroup value={difficulty} onValueChange={setDifficulty} className="grid grid-cols-3 gap-3">
                {[
                  { value: "easy", label: "Easy", desc: "2 bugs · 10 min", color: "text-success" },
                  { value: "medium", label: "Medium", desc: "3 bugs · 12 min", color: "text-warning" },
                  { value: "hard", label: "Hard", desc: "5 bugs · 15 min", color: "text-destructive" },
                ].map((d) => (
                  <label
                    key={d.value}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      difficulty === d.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <RadioGroupItem value={d.value} className="sr-only" />
                    <span className={`font-semibold ${d.color}`}>{d.label}</span>
                    <span className="text-xs text-muted-foreground">{d.desc}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <Button onClick={handleJoin} disabled={isJoining} className="w-full h-12 text-base font-semibold animate-pulse-glow">
              {isJoining ? "Preparing Challenge..." : "Enter the Arena →"}
            </Button>
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")} className="text-muted-foreground">
                <Trophy className="w-4 h-4 mr-1" /> View Leaderboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
