import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, language = "python", input = "" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!code || code.trim().length === 0) {
      return new Response(JSON.stringify({ output: "", error: "No code provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langNames: Record<string, string> = {
      python: "Python",
      java: "Java",
      c: "C",
      cpp: "C++",
    };

    const langName = langNames[language] || "Python";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a ${langName} code executor simulator. Execute the given code mentally and return ONLY the exact output the program would produce. Rules:
- Return ONLY the program output, nothing else
- If the code has errors (syntax, runtime, logical), return the error message exactly as the ${langName} interpreter/compiler would show it
- If the code produces no output, return "(No output)"
- If input is provided, use it as stdin
- Do NOT explain, comment, or add any text beyond what the program would output
- For infinite loops, return "Error: Execution timed out (possible infinite loop)"
- Be precise with whitespace and newlines`,
          },
          {
            role: "user",
            content: `Execute this ${langName} code${input ? ` with input: ${input}` : ""}:\n\n\`\`\`${language}\n${code}\n\`\`\``,
          },
        ],
        max_tokens: 1024,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`Execution service error: ${response.status}`);
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || "(No output)";

    return new Response(JSON.stringify({ output, error: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("run-code error:", e);
    return new Response(
      JSON.stringify({ output: "", error: e instanceof Error ? e.message : "Execution failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
