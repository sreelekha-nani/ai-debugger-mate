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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
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
      .select("id, actual_start, duration, scheduled_end, challenge_data")
      .eq("status", "active");

    const ended: string[] = [];
    const evaluated: string[] = [];

    for (const comp of active || []) {
      const start = new Date(comp.actual_start).getTime();
      const endTime = comp.scheduled_end 
        ? new Date(comp.scheduled_end).getTime()
        : start + comp.duration * 1000;
      
      if (Date.now() >= endTime) {
        // End the competition
        const { error: endError } = await supabase
          .from("competitions")
          .update({ status: "ended", ended_at: now })
          .eq("id", comp.id);
        
        if (!endError) {
          ended.push(comp.id);
          
          // Auto-evaluate all submitted participants
          if (lovableApiKey && comp.challenge_data) {
            const evaluatedCount = await evaluateCompetitionSubmissions(
              supabase,
              supabaseUrl,
              lovableApiKey,
              comp.id,
              comp.challenge_data
            );
            if (evaluatedCount > 0) evaluated.push(comp.id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ activated, ended, evaluated }), {
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

async function evaluateCompetitionSubmissions(
  supabase: any,
  supabaseUrl: string,
  lovableApiKey: string,
  competitionId: string,
  challengeData: any
): Promise<number> {
  try {
    // Get all submitted participants who haven't been evaluated yet (score = 0 or null)
    const { data: participants } = await supabase
      .from("participants")
      .select("id, code, time_spent")
      .eq("competition_id", competitionId)
      .eq("submitted", true)
      .eq("disqualified", false)
      .or("score.is.null,score.eq.0");

    if (!participants?.length) return 0;

    console.log(`Evaluating ${participants.length} submissions for competition ${competitionId}`);

    let evaluatedCount = 0;

    for (const participant of participants) {
      if (!participant.code) continue;

      try {
        // Call the evaluate-submission function
        const evalResponse = await fetch(`${supabaseUrl}/functions/v1/evaluate-submission`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            submittedCode: participant.code,
            buggyCode: challengeData.buggyCode,
            correctCode: challengeData.correctCode,
            bugs: challengeData.bugs,
            testCases: challengeData.testCases,
            description: challengeData.description,
          }),
        });

        if (!evalResponse.ok) {
          console.error(`Evaluation failed for participant ${participant.id}: ${evalResponse.status}`);
          continue;
        }

        const evaluation = await evalResponse.json();

        if (evaluation.error) {
          console.error(`Evaluation error for participant ${participant.id}: ${evaluation.error}`);
          continue;
        }

        // Calculate score: bugs_fixed * 20 + accuracy bonus - time penalty
        const bugsFixed = evaluation.bugsFixed || 0;
        const totalBugs = evaluation.totalBugs || challengeData.bugs?.length || 0;
        const accuracy = evaluation.accuracy || 0;
        const timeSpent = participant.time_spent || 0;

        // Score formula: base points for bugs fixed + accuracy bonus - time penalty
        const baseScore = bugsFixed * 100;
        const accuracyBonus = Math.round(accuracy * 0.5); // Up to 50 bonus points for accuracy
        const timePenalty = Math.min(Math.floor(timeSpent / 60), 30); // Max 30 point penalty
        const finalScore = Math.max(0, baseScore + accuracyBonus - timePenalty);

        // Update participant with evaluation results
        await supabase
          .from("participants")
          .update({
            score: finalScore,
            bugs_fixed: bugsFixed,
            total_bugs: totalBugs,
            accuracy: accuracy,
          })
          .eq("id", participant.id);

        evaluatedCount++;
        console.log(`Evaluated participant ${participant.id}: score=${finalScore}, bugs=${bugsFixed}/${totalBugs}, accuracy=${accuracy}%`);
      } catch (evalErr) {
        console.error(`Error evaluating participant ${participant.id}:`, evalErr);
      }
    }

    return evaluatedCount;
  } catch (err) {
    console.error("Error in evaluateCompetitionSubmissions:", err);
    return 0;
  }
}
