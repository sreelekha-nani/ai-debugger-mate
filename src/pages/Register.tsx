import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Bug, Eye, EyeOff, UserPlus, ArrowLeft, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    collegeName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const checkUsername = async (username: string) => {
    if (username.length < 3) { setUsernameAvailable(null); return; }
    setCheckingUsername(true);
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    setUsernameAvailable(!data);
    setCheckingUsername(false);
  };

  const passwordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = passwordStrength(form.password);
  const strengthLabel = ["Weak", "Fair", "Good", "Strong"][Math.max(0, strength - 1)] || "";
  const strengthColor = ["bg-destructive", "bg-warning", "bg-accent", "bg-success"][Math.max(0, strength - 1)] || "bg-muted";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fullName.trim() || !form.email.trim() || !form.username.trim() || !form.password) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (form.username.length < 3) {
      toast({ title: "Username too short", description: "Username must be at least 3 characters.", variant: "destructive" });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
      toast({ title: "Invalid username", description: "Username can only contain letters, numbers, and underscores.", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please confirm your password.", variant: "destructive" });
      return;
    }
    if (usernameAvailable === false) {
      toast({ title: "Username taken", description: "Please choose a different username.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await signUp(form.email.trim(), form.password, {
      full_name: form.fullName.trim(),
      username: form.username.trim().toLowerCase(),
      college_name: form.collegeName.trim() || undefined,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account Created!", description: "Welcome to Bug Busters!" });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/8 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-success/8 rounded-full blur-[120px]" />

      <Card className="relative max-w-md w-full border-primary/20 shadow-2xl animate-slide-up">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 glow-primary">
            <Bug className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-black">
            <span className="text-gradient-primary">Bug Busters</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Create your account</p>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                className="h-11 bg-secondary/50"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="h-11 bg-secondary/50"
                maxLength={255}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <div className="relative">
                <Input
                  id="username"
                  placeholder="Choose a username"
                  value={form.username}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                    updateField("username", val);
                    checkUsername(val);
                  }}
                  className="h-11 bg-secondary/50 pr-10"
                  maxLength={30}
                  autoComplete="username"
                />
                {form.username.length >= 3 && !checkingUsername && usernameAvailable !== null && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameAvailable ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <X className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {form.username.length >= 3 && usernameAvailable === false && (
                <p className="text-xs text-destructive">Username is already taken.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min 6 chars)"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className="h-11 bg-secondary/50 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : "bg-muted"}`} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{strengthLabel}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                className="h-11 bg-secondary/50"
                autoComplete="new-password"
              />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="college">College Name <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="college"
                placeholder="Enter your college name"
                value={form.collegeName}
                onChange={(e) => updateField("collegeName", e.target.value)}
                className="h-11 bg-secondary/50"
                maxLength={200}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 text-base font-bold glow-primary">
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" /> Create Account
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                <ArrowLeft className="w-3 h-3 inline" /> Sign In
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
