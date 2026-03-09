import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bug, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    // If profile is already complete, redirect to dashboard
    if (profile?.username?.trim() && profile?.college_name?.trim()) {
      navigate("/dashboard", { replace: true });
    }
  }, [profile, navigate]);

  const checkUsername = async (nextUsername: string) => {
    if (nextUsername.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", nextUsername)
      .maybeSingle();
    setUsernameAvailable(!data);
    setCheckingUsername(false);
  };

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(sanitized);
    if (sanitized.length >= 3) {
      checkUsername(sanitized);
    } else {
      setUsernameAvailable(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || username.length < 3) {
      toast({
        title: "Invalid Username",
        description: "Username must be at least 3 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!collegeName.trim()) {
      toast({
        title: "Missing College Name",
        description: "Please enter your college or university name.",
        variant: "destructive",
      });
      return;
    }

    if (usernameAvailable === false) {
      toast({
        title: "Username Taken",
        description: "This username is already in use. Please choose another.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        college_name: collegeName.trim(),
      })
      .eq("id", profile?.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await refreshProfile();
      toast({
        title: "Profile Completed!",
        description: "Welcome to Bug Busters!",
      });
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/20">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Bug className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>
            Add your username and college name to finish your Google signup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                Username <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  placeholder="Choose a unique username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  required
                  minLength={3}
                  className={
                    usernameAvailable === false
                      ? "border-destructive pr-10"
                      : usernameAvailable === true
                      ? "border-primary pr-10"
                      : ""
                  }
                />
                {checkingUsername && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
                {!checkingUsername && usernameAvailable === true && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                )}
                {!checkingUsername && usernameAvailable === false && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and underscores only. Min 3 characters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="collegeName">
                College/University <span className="text-destructive">*</span>
              </Label>
              <Input
                id="collegeName"
                placeholder="Your institution name"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || usernameAvailable === false}>
              {loading ? "Saving..." : "Complete Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;
