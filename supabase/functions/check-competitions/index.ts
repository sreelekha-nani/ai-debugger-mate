import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find scheduled competitions whose start time has passed
    const now = new Date().toISOString();
    const { data: scheduled, error } = await supabase
      .from("competitions")
      .select("id, scheduled_start")
      .eq("status", "scheduled")
      .not("scheduled_start", "is", null)
      .lte("scheduled_start", now);

    if (error) throw error;

    const activated: string[] = [];
    for (const comp of scheduled || []) {
      const { error: updateError } = await supabase
        .from("competitions")
        .update({ status: "active", actual_start: now })
        .eq("id", comp.id);
      if (!updateError) activated.push(comp.id);
    }

    // Also check for active competitions that have exceeded their duration + actual_start
    const { data: active } = await supabase
      .from("competitions")
      .select("id, actual_start, duration, scheduled_end")
      .eq("status", "active");

    const ended: string[] = [];
    for (const comp of active || []) {
      const start = new Date(comp.actual_start).getTime();
      const endTime = comp.scheduled_end 
        ? new Date(comp.scheduled_end).getTime()
        : start + comp.duration * 1000;
      
      if (Date.now() >= endTime) {
        const { error: endError } = await supabase
          .from("competitions")
          .update({ status: "ended", ended_at: now })
          .eq("id", comp.id);
        if (!endError) ended.push(comp.id);
      }
    }

    return new Response(JSON.stringify({ activated, ended }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-competitions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
