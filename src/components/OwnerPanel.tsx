import { useState, useEffect } from "react";
import { Crown, Shield, UserCheck, UserX, ToggleLeft, ToggleRight, RefreshCw, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AdminRequest {
  id: string;
  user_id: string;
  status: string;
  requested_at: string;
  full_name?: string;
  email?: string;
  username?: string;
}

interface AdminUser {
  user_id: string;
  role: string;
  full_name?: string;
  email?: string;
  username?: string;
}

const OwnerPanel = () => {
  const { user } = useAuth();
  const [adminAccessEnabled, setAdminAccessEnabled] = useState(true);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchData = async () => {
    // Fetch platform settings
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("*")
      .eq("id", "global")
      .single();
    if (settings) setAdminAccessEnabled((settings as any).admin_access_enabled);

    // Fetch pending admin requests
    const { data: reqs } = await supabase
      .from("admin_requests")
      .select("*")
      .eq("status", "pending")
      .order("requested_at", { ascending: false });

    // Fetch profiles for request users
    const reqUserIds = (reqs || []).map((r: any) => r.user_id);
    let reqProfiles: any[] = [];
    if (reqUserIds.length > 0) {
      const { data } = await supabase.from("profiles").select("id, full_name, email, username").in("id", reqUserIds);
      reqProfiles = data || [];
    }
    const reqProfileMap = new Map(reqProfiles.map((p: any) => [p.id, p]));

    setRequests((reqs || []).map((r: any) => ({
      ...r,
      full_name: reqProfileMap.get(r.user_id)?.full_name || "Unknown",
      email: reqProfileMap.get(r.user_id)?.email || "N/A",
      username: reqProfileMap.get(r.user_id)?.username || "unknown",
    })));

    // Fetch all admins/owners
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");
    
    const roleUserIds = (roles || []).map((r: any) => r.user_id);
    let roleProfiles: any[] = [];
    if (roleUserIds.length > 0) {
      const { data } = await supabase.from("profiles").select("id, full_name, email, username").in("id", roleUserIds);
      roleProfiles = data || [];
    }
    const roleProfileMap = new Map(roleProfiles.map((p: any) => [p.id, p]));

    setAdmins((roles || []).map((r: any) => ({
      ...r,
      full_name: roleProfileMap.get(r.user_id)?.full_name || "Unknown",
      email: roleProfileMap.get(r.user_id)?.email || "N/A",
      username: roleProfileMap.get(r.user_id)?.username || "unknown",
    })));
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("owner-panel")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_requests" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleAdminAccess = async () => {
    const newVal = !adminAccessEnabled;
    const { error } = await supabase
      .from("platform_settings")
      .update({ admin_access_enabled: newVal, updated_at: new Date().toISOString(), updated_by: user?.id } as any)
      .eq("id", "global");
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } else {
      setAdminAccessEnabled(newVal);
      toast({ title: newVal ? "Admin access enabled" : "Admin access disabled" });
    }
  };

  const approveRequest = async (req: AdminRequest) => {
    setLoading(true);
    // Add admin role
    const { error: roleErr } = await supabase.from("user_roles").insert({
      user_id: req.user_id,
      role: "admin",
    } as any);
    if (roleErr) {
      toast({ title: "Failed", description: roleErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    // Update request status
    await supabase.from("admin_requests")
      .update({ status: "approved", resolved_at: new Date().toISOString(), resolved_by: user?.id } as any)
      .eq("id", req.id);
    toast({ title: "Approved", description: `${req.full_name} is now an admin.` });
    fetchData();
    setLoading(false);
  };

  const rejectRequest = async (req: AdminRequest) => {
    await supabase.from("admin_requests")
      .update({ status: "rejected", resolved_at: new Date().toISOString(), resolved_by: user?.id } as any)
      .eq("id", req.id);
    toast({ title: "Rejected", description: `Request from ${req.full_name} rejected.` });
    fetchData();
  };

  const removeAdmin = async (adminUser: AdminUser) => {
    if (adminUser.role === "owner") return;
    const { error } = await supabase.from("user_roles")
      .delete()
      .eq("user_id", adminUser.user_id)
      .eq("role", "admin");
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Admin removed", description: `${adminUser.full_name} is no longer admin.` });
      fetchData();
    }
  };

  const inviteAdmin = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    
    // Look up user by email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", inviteEmail.trim().toLowerCase())
      .single();

    if (!profile) {
      toast({ title: "User not found", description: "No registered user with that email.", variant: "destructive" });
      setInviteLoading(false);
      return;
    }

    // Check if already admin
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.id)
      .in("role", ["admin", "owner"] as any);

    if (existingRole && existingRole.length > 0) {
      toast({ title: "Already an admin", description: `${profile.full_name} already has a role.`, variant: "destructive" });
      setInviteLoading(false);
      return;
    }

    const { error } = await supabase.from("user_roles").insert({
      user_id: profile.id,
      role: "admin",
    } as any);

    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Admin added!", description: `${profile.full_name} is now an admin.` });
      setInviteEmail("");
      fetchData();
    }
    setInviteLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Owner Badge */}
      <Card className="border-warning/30 bg-gradient-to-br from-card to-warning/5">
        <CardContent className="pt-6 pb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
              <Crown className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                👑 Platform Owner
              </h2>
              <p className="text-sm text-muted-foreground">Full platform control & admin management</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Admin Access Toggle */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {adminAccessEnabled ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
            Admin Access Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50">
            <div>
              <Label className="font-bold">Allow Admin Access</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {adminAccessEnabled
                  ? "Users can request admin roles. Admins can create competitions."
                  : "Only you (owner) can conduct competitions. No new admin roles allowed."}
              </p>
            </div>
            <Switch checked={adminAccessEnabled} onCheckedChange={toggleAdminAccess} />
          </div>
        </CardContent>
      </Card>

      {/* Admin Requests */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" /> Admin Requests
            {requests.length > 0 && (
              <Badge variant="destructive" className="text-xs ml-1">{requests.length} pending</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No pending admin requests.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/30">
                  <div>
                    <p className="font-bold">{req.full_name}</p>
                    <p className="text-xs text-muted-foreground">@{req.username} · {req.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested: {new Date(req.requested_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => approveRequest(req)} disabled={loading}>
                      <UserCheck className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => rejectRequest(req)} disabled={loading}>
                      <UserX className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Admins */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" /> Current Roles ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs text-center">Role</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((a) => (
                <TableRow key={`${a.user_id}-${a.role}`} className="border-border/30">
                  <TableCell>
                    <p className="font-semibold">{a.full_name}</p>
                    <p className="text-xs text-muted-foreground">@{a.username}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.email}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={a.role === "owner" ? "default" : "secondary"} className="text-xs capitalize">
                      {a.role === "owner" ? "👑 Owner" : `🛡️ ${a.role}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {a.role !== "owner" && (
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive text-xs" onClick={() => removeAdmin(a)}>
                        Remove
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerPanel;
