import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { language, difficulty } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const bugCount = difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : 5;
    const complexity = difficulty === "easy" ? "simple (basic loops, conditionals, functions)" : difficulty === "medium" ? "moderate (lists, dictionaries, string manipulation, simple algorithms)" : "complex (recursion, OOP, file handling, advanced algorithms)";

    const systemPrompt = `You are a code challenge generator for a debugging competition. Generate buggy code that students must fix.

RULES:
- Generate a small, self-contained ${language} program
- The program should be ${complexity}
- Introduce exactly ${bugCount} bugs (mix of syntax errors, logical errors, off-by-one errors, wrong operators, missing statements)
- Each bug should be fixable independently
- The program should be 15-40 lines long
- Include a clear description of what the program SHOULD do

You MUST respond using the generate_challenge tool.`;

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
          { role: "user", content: `Generate a ${difficulty} ${language} debugging challenge with exactly ${bugCount} bugs.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_challenge",
              description: "Return the debugging challenge data",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Short title for the challenge" },
                  description: { type: "string", description: "Clear description of what the program should do when working correctly" },
                  buggyCode: { type: "string", description: "The buggy code that students need to fix" },
                  correctCode: { type: "string", description: "The correct working version of the code" },
                  bugs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        line: { type: "number", description: "Approximate line number of the bug" },
                        description: { type: "string", description: "Description of the bug" },
                        type: { type: "string", enum: ["syntax", "logical", "runtime"] },
                      },
                      required: ["line", "description", "type"],
                      additionalProperties: false,
                    },
                  },
                  testCases: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        input: { type: "string", description: "Input for the test case" },
                        expectedOutput: { type: "string", description: "Expected output" },
                      },
                      required: ["input", "expectedOutput"],
                      additionalProperties: false,
                    },
                  },
                  hints: {
                    type: "array",
                    items: { type: "string" },
                    description: "Optional hints for each bug",
                  },
                },
                required: ["title", "description", "buggyCode", "correctCode", "bugs", "testCases"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_challenge" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
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

    const challenge = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(challenge), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-buggy-code error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
