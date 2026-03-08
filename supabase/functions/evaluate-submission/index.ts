import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { submittedCode, buggyCode, correctCode, bugs, testCases, description } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert code evaluator for a debugging competition. Analyze the student's submission and determine how well they fixed the bugs.

CONTEXT:
- Original buggy code was provided to the student
- The correct solution exists for reference
- There were ${bugs.length} bugs to fix
- Program description: ${description}

BUGS TO FIX:
${bugs.map((b: any, i: number) => `${i + 1}. Line ~${b.line}: ${b.description} (${b.type})`).join("\n")}

TEST CASES:
${testCases.map((t: any, i: number) => `${i + 1}. Input: ${t.input} → Expected: ${t.expectedOutput}`).join("\n")}

Evaluate the submission carefully. You MUST respond using the evaluate_submission tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `BUGGY CODE:\n\`\`\`\n${buggyCode}\n\`\`\`\n\nCORRECT CODE:\n\`\`\`\n${correctCode}\n\`\`\`\n\nSTUDENT SUBMISSION:\n\`\`\`\n${submittedCode}\n\`\`\`\n\nEvaluate the submission.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "evaluate_submission",
              description: "Return the evaluation results",
              parameters: {
                type: "object",
                properties: {
                  bugsFixed: { type: "number", description: "Number of bugs correctly fixed" },
                  totalBugs: { type: "number", description: "Total number of bugs" },
                  accuracy: { type: "number", description: "Percentage accuracy 0-100" },
                  testsPassed: { type: "number", description: "Number of test cases that would pass" },
                  totalTests: { type: "number", description: "Total test cases" },
                  feedback: { type: "string", description: "Brief feedback on the submission" },
                  bugDetails: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        bugIndex: { type: "number" },
                        fixed: { type: "boolean" },
                        comment: { type: "string" },
                      },
                      required: ["bugIndex", "fixed", "comment"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["bugsFixed", "totalBugs", "accuracy", "testsPassed", "totalTests", "feedback", "bugDetails"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "evaluate_submission" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const evaluation = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-submission error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
