import { useState, useEffect } from "react";
import { Crown, Shield, UserCog, RefreshCw, Search, ChevronDown, ChevronUp, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  username: string;
  role: string | null;
}

const OwnerPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"full_name" | "email" | "role">("full_name");
  const [sortAsc, setSortAsc] = useState(true);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantLoading, setGrantLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, username");

    // Fetch all roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

    const usersWithRoles: UserWithRole[] = (profiles || []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name || "Unknown",
      email: p.email || "N/A",
      username: p.username || "unknown",
      role: roleMap.get(p.id) || null,
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("owner-panel-users")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const changeRole = async (targetUser: UserWithRole, newRole: string) => {
    // Protect owner from role changes
    if (targetUser.role === "owner") {
      toast({ title: "Cannot modify owner", description: "The owner role cannot be changed.", variant: "destructive" });
      return;
    }

    if (newRole === "user") {
      // Remove admin role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", targetUser.id)
        .eq("role", "admin");
      
      if (error) {
        toast({ title: "Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Role updated", description: `${targetUser.full_name} is now a regular user.` });
        fetchData();
      }
    } else if (newRole === "admin") {
      // Check if already has a role
      const { data: existing } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUser.id);

      if (existing && existing.length > 0) {
        toast({ title: "Already has role", description: `${targetUser.full_name} already has a role.`, variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: targetUser.id, role: "admin" });

      if (error) {
        toast({ title: "Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Role updated", description: `${targetUser.full_name} is now an admin.` });
        fetchData();
      }
    }
  };

  // Filter and sort users
  const filteredUsers = users
    .filter((u) => {
      const q = searchQuery.toLowerCase();
      return u.full_name.toLowerCase().includes(q) ||
             u.email.toLowerCase().includes(q) ||
             u.username.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let aVal = "", bVal = "";
      if (sortField === "full_name") {
        aVal = a.full_name.toLowerCase();
        bVal = b.full_name.toLowerCase();
      } else if (sortField === "email") {
        aVal = a.email.toLowerCase();
        bVal = b.email.toLowerCase();
      } else if (sortField === "role") {
        aVal = a.role || "user";
        bVal = b.role || "user";
      }
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

  const toggleSort = (field: "full_name" | "email" | "role") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const SortIcon = ({ field }: { field: "full_name" | "email" | "role" }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3 ml-1 inline" /> : <ChevronDown className="w-3 h-3 ml-1 inline" />;
  };

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    owners: users.filter((u) => u.role === "owner").length,
    regularUsers: users.filter((u) => !u.role).length,
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
              <p className="text-sm text-muted-foreground">Full platform control & user management</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <UserCog className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-warning" />
              <div>
                <p className="text-2xl font-bold">{stats.owners}</p>
                <p className="text-xs text-muted-foreground">Owner</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-accent" />
              <div>
                <p className="text-2xl font-bold">{stats.admins}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <UserCog className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.regularUsers}</p>
                <p className="text-xs text-muted-foreground">Regular Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="w-4 h-4 text-primary" /> User Management
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchQuery ? "No users found matching your search." : "No users registered yet."}
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 bg-secondary/30">
                    <TableHead 
                      className="text-xs cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort("full_name")}
                    >
                      Name <SortIcon field="full_name" />
                    </TableHead>
                    <TableHead 
                      className="text-xs cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort("email")}
                    >
                      Email <SortIcon field="email" />
                    </TableHead>
                    <TableHead 
                      className="text-xs text-center cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort("role")}
                    >
                      Current Role <SortIcon field="role" />
                    </TableHead>
                    <TableHead className="text-xs text-right">Change Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id} className="border-border/30">
                      <TableCell>
                        <div>
                          <p className="font-semibold">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">@{u.username}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="text-center">
                        {u.role === "owner" ? (
                          <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
                            👑 Owner
                          </Badge>
                        ) : u.role === "admin" ? (
                          <Badge className="bg-accent/20 text-accent border-accent/30 text-xs">
                            🛡️ Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            User
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {u.role === "owner" ? (
                          <span className="text-xs text-muted-foreground italic">Protected</span>
                        ) : u.id === user?.id ? (
                          <span className="text-xs text-muted-foreground italic">You</span>
                        ) : (
                          <Select
                            value={u.role || "user"}
                            onValueChange={(newRole) => changeRole(u, newRole)}
                          >
                            <SelectTrigger className="h-8 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            💡 Only the platform owner can manage user roles. The owner role cannot be changed or removed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerPanel;
