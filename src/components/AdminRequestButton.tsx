import { useState, useEffect } from "react";
import { Shield, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const AdminRequestButton = () => {
  const { user } = useAuth();
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [adminAccessEnabled, setAdminAccessEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchStatus = async () => {
      // Check platform settings
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("admin_access_enabled")
        .eq("id", "global")
        .single();
      if (settings) setAdminAccessEnabled((settings as any).admin_access_enabled);

      // Check existing request
      const { data } = await supabase
        .from("admin_requests")
        .select("status")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        setRequestStatus((data[0] as any).status);
      }
    };

    fetchStatus();
  }, [user]);

  if (!adminAccessEnabled) return null;

  const sendRequest = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("admin_requests").insert({
      user_id: user.id,
      status: "pending",
    } as any);

    if (error) {
      if (error.message.includes("duplicate")) {
        toast({ title: "Already requested", description: "You already have a pending request.", variant: "destructive" });
      } else {
        toast({ title: "Failed", description: error.message, variant: "destructive" });
      }
    } else {
      setRequestStatus("pending");
      toast({ title: "Request sent!", description: "The platform owner will review your request." });
    }
    setLoading(false);
  };

  if (requestStatus === "approved") {
    return (
      <Button variant="outline" size="sm" disabled className="text-success border-success/30">
        <CheckCircle2 className="w-4 h-4 mr-1" /> Admin Approved
      </Button>
    );
  }

  if (requestStatus === "pending") {
    return (
      <Button variant="outline" size="sm" disabled className="text-warning border-warning/30">
        <Clock className="w-4 h-4 mr-1" /> Request Pending
      </Button>
    );
  }

  if (requestStatus === "rejected") {
    return (
      <Button variant="outline" size="sm" disabled className="text-destructive border-destructive/30">
        <XCircle className="w-4 h-4 mr-1" /> Request Rejected
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={sendRequest} disabled={loading}>
      <Shield className="w-4 h-4 mr-1" /> Request Admin Access
    </Button>
  );
};

export default AdminRequestButton;
