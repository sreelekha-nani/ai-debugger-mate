import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setIsOwner(false);
      setLoading(false);
      return;
    }

    const checkRoles = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      const roles = (data || []).map((r: any) => r.role);
      setIsOwner(roles.includes("owner"));
      setIsAdmin(roles.includes("admin") || roles.includes("owner"));
      setLoading(false);
    };

    checkRoles();
  }, [user]);

  return { isAdmin, isOwner, loading };
}
