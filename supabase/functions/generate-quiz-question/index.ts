import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert programming interviewer and competitive coding problem generator.

Your task is to generate a NEW and UNIQUE coding question every time.

The questions must be suitable for coding competitions and technical interview preparation.

Rules for generation:

1. The question must be different from previous ones.
2. Focus on debugging, output prediction, or logic understanding.
3. Randomly choose a programming language from: Python, Java, SQL.
4. Difficulty level: Easy to Medium (interview preparation level).
5. The question must include:
   - Problem Title
   - Programming Language
   - Problem Statement
   - Code Snippet (well formatted)
   - Question (what user must answer)
   - Correct Answer
   - Explanation
6. If it is an output prediction question:
   - Show the code
   - Ask: "What will be the output?"
7. If it is debugging:
   - Include a bug in the code
   - Ask the user to identify or fix it.
8. For SQL questions:
   - Provide a small table schema
   - Ask a query-related question.
9. Ensure questions test real interview concepts such as:
   - mutable default arguments
   - recursion
   - loops
   - data structures
   - SQL joins
   - aggregation
   - object-oriented concepts
   - edge cases
10. Avoid repeating similar logic patterns.

You MUST respond using the generate_question tool.`;

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
          { role: "user", content: `Generate a unique coding interview question. Pick a random language (Python, Java, or SQL) and a random question type (output prediction, debugging, or logic). Make it creative and different. Use seed: ${Date.now()}-${Math.random().toString(36).slice(2)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_question",
              description: "Return the quiz question data",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Problem title" },
                  language: { type: "string", enum: ["Python", "Java", "SQL"], description: "Programming language" },
                  difficulty: { type: "string", enum: ["Easy", "Medium"], description: "Difficulty level" },
                  type: { type: "string", enum: ["output_prediction", "debugging", "logic"], description: "Question type" },
                  problem_statement: { type: "string", description: "Clear problem statement" },
                  code: { type: "string", description: "Well-formatted code snippet" },
                  question: { type: "string", description: "The specific question to answer" },
                  options: {
                    type: "array",
                    items: { type: "string" },
                    description: "4 multiple choice options (include the correct answer)",
                  },
                  answer: { type: "string", description: "The correct answer" },
                  explanation: { type: "string", description: "Detailed explanation of the answer" },
                },
                required: ["title", "language", "difficulty", "type", "problem_statement", "code", "question", "options", "answer", "explanation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_question" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const question = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(question), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz-question error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
