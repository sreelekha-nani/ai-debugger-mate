import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bug, Zap, Trophy, Timer, Shield, Code2, ChevronDown, BookOpen, Scale, Users, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { saveSession, generateId, type CompetitionSession } from "@/lib/competition-store";

const Index = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
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
      language: "python",
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
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm border-primary/30 text-primary animate-slide-down">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI-Powered Debugging Challenge
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
            Race against time to debug AI-generated Python programs. Every challenge is unique, every second counts. Prove your debugging skills in this competitive coding arena.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-scale-in" style={{ animationDelay: "0.3s" }}>
            <Button
              size="lg"
              onClick={() => scrollToSection("join")}
              className="h-14 px-8 text-lg font-bold glow-primary"
            >
              Start Competition <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => scrollToSection("about")}
              className="h-14 px-8 text-lg"
            >
              Learn More <ChevronDown className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {[
              { icon: Zap, label: "AI-Generated", desc: "Unique problems every time" },
              { icon: Timer, label: "Timed Rounds", desc: "10-15 minute challenges" },
              { icon: Trophy, label: "Live Leaderboard", desc: "Real-time rankings" },
              { icon: Shield, label: "Anti-Cheat", desc: "Fair play guaranteed" },
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
              A competitive debugging platform where participants race to fix AI-generated buggy Python code under time pressure.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: "AI-Powered Challenges",
                desc: "Every participant receives a unique, AI-generated buggy program. No two challenges are the same — no memorization, just pure skill.",
              },
              {
                icon: Code2,
                title: "Professional Code Editor",
                desc: "Debug in a VS Code-like editor with syntax highlighting, line numbers, and a dark theme. Feel like a real competitive coder.",
              },
              {
                icon: Trophy,
                title: "Live Competition",
                desc: "Compete with your coding club in real-time. See live rankings, scores, and prove you're the ultimate bug buster.",
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
              { num: "01", title: "Enter Your Name", desc: "Provide your name and optionally a team name to get started." },
              { num: "02", title: "Choose Difficulty", desc: "Select Easy (2 bugs, 10 min), Medium (3 bugs, 12 min), or Hard (5 bugs, 15 min)." },
              { num: "03", title: "Debug the Code", desc: "Read the problem description, find the bugs in the Python code, and fix them in the editor." },
              { num: "04", title: "Submit Before Time Runs Out", desc: "Your code auto-submits when the timer expires. Submit early for a better score!" },
              { num: "05", title: "AI Evaluates Your Fix", desc: "Our AI analyzes your submission, checks test cases, and calculates your accuracy score." },
              { num: "06", title: "Climb the Leaderboard", desc: "Score is based on bugs fixed, accuracy, and time taken. Top 3 earn gold, silver, and bronze!" },
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
                <Shield className="w-5 h-5" /> Anti-Cheating Measures
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>External copy-paste is disabled in the editor</li>
                <li>Tab switching is tracked and flagged</li>
                <li>Every participant gets a unique AI-generated problem</li>
                <li>Timer auto-submits to prevent time manipulation</li>
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
              <p className="text-sm text-muted-foreground">Python Debugging Challenge</p>
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

              <div className="space-y-3">
                <Label>Difficulty Level</Label>
                <RadioGroup value={difficulty} onValueChange={setDifficulty} className="grid grid-cols-3 gap-3">
                  {[
                    { value: "easy", label: "Easy", desc: "2 bugs · 10 min", color: "text-success", border: "border-success/30" },
                    { value: "medium", label: "Medium", desc: "3 bugs · 12 min", color: "text-warning", border: "border-warning/30" },
                    { value: "hard", label: "Hard", desc: "5 bugs · 15 min", color: "text-destructive", border: "border-destructive/30" },
                  ].map((d) => (
                    <label
                      key={d.value}
                      className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        difficulty === d.value
                          ? `${d.border} bg-primary/5 shadow-md`
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <RadioGroupItem value={d.value} className="sr-only" />
                      <span className={`font-bold text-lg ${d.color}`}>{d.label}</span>
                      <span className="text-xs text-muted-foreground">{d.desc}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <Button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full h-13 text-base font-bold glow-primary"
                size="lg"
              >
                {isJoining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Generating Challenge...
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
          <p className="text-sm text-muted-foreground">AI-Powered Code Debugging Challenge · Built for Competitive Coders</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
