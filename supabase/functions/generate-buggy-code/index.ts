import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANGUAGE_CONFIG: Record<string, { name: string; complexity: Record<string, string> }> = {
  python: {
    name: "Python",
    complexity: {
      easy: "simple (basic loops, conditionals, functions, list operations)",
      medium: "moderate (lists, dictionaries, string manipulation, simple algorithms, list comprehensions)",
      hard: "complex (recursion, OOP, file handling, advanced algorithms, decorators, generators)",
    },
  },
  java: {
    name: "Java",
    complexity: {
      easy: "simple (basic loops, conditionals, methods, arrays)",
      medium: "moderate (ArrayLists, HashMaps, string manipulation, simple algorithms, interfaces)",
      hard: "complex (recursion, OOP inheritance, generics, streams, exception handling)",
    },
  },
  c: {
    name: "C",
    complexity: {
      easy: "simple (basic loops, conditionals, functions, arrays)",
      medium: "moderate (pointers, dynamic memory allocation, structs, string manipulation)",
      hard: "complex (pointer arithmetic, linked lists, file I/O, memory management, bitwise operations)",
    },
  },
  cpp: {
    name: "C++",
    complexity: {
      easy: "simple (basic loops, conditionals, functions, vectors)",
      medium: "moderate (STL containers, references, classes, string manipulation, iterators)",
      hard: "complex (templates, inheritance, smart pointers, operator overloading, RAII)",
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { language = "python", difficulty = "medium", previousTitles = [] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langKey = language.toLowerCase().replace("++", "pp");
    const langConfig = LANGUAGE_CONFIG[langKey] || LANGUAGE_CONFIG.python;
    const bugCount = difficulty === "easy" ? { min: 1, max: 2 } : difficulty === "medium" ? { min: 2, max: 3 } : { min: 3, max: 5 };
    const actualBugCount = bugCount.min + Math.floor(Math.random() * (bugCount.max - bugCount.min + 1));
    const complexity = langConfig.complexity[difficulty] || langConfig.complexity.medium;

    const difficultyGuidelines = difficulty === "easy"
      ? `EASY LEVEL GUIDELINES (Beginner-friendly):
- Bugs should be SIMPLE and OBVIOUS: missing brackets, wrong indentation, typos in variable names, missing colons, wrong quotes
- The program logic itself should be straightforward and correct — only introduce surface-level syntax mistakes
- A beginner should be able to spot each bug within 1-2 minutes
- Do NOT include tricky logic errors or algorithm bugs
- Keep the program under 20 lines
- Use simple concepts: print statements, basic if/else, simple for loops, basic arithmetic`
      : difficulty === "medium"
      ? `MODERATE LEVEL GUIDELINES (Intermediate):
- Bugs should require SOME THINKING: off-by-one errors in loops, wrong comparison operators (< vs <=), incorrect loop bounds, swapped conditions in if/else
- Include 1 syntax-level bug and the rest should be small logical mistakes
- The program should use loops, conditionals, and basic data structures
- Each bug should be solvable with careful reading — no deep algorithm knowledge needed
- Keep the program 15-30 lines
- Difficulty should feel like a typical coding interview warm-up question`
      : `HARD LEVEL GUIDELINES (Advanced):
- Bugs should be SUBTLE and require careful analysis: incorrect recursion base cases, wrong algorithm logic, edge case handling errors, incorrect data structure usage
- Include a mix of logical and algorithmic bugs — at least 2 should require understanding the algorithm
- The program should implement a recognizable algorithm or data structure operation
- Keep the program 25-40 lines
- Difficulty should feel like a medium-level coding interview question — challenging but NOT impossible
- Do NOT make it frustratingly hard — the goal is to test skill, not trick people`;

    const avoidList = previousTitles.length > 0
      ? `\n\nIMPORTANT: Do NOT generate challenges similar to these previously solved ones:\n${previousTitles.map((t: string) => `- "${t}"`).join("\n")}\nCreate something completely different in topic, algorithm, and structure.`
      : "";

    const systemPrompt = `You are a code challenge generator for a debugging competition. Generate buggy code that students must fix.

${difficultyGuidelines}

RULES:
- Generate a small, self-contained ${langConfig.name} program
- The program should be ${complexity}
- Introduce exactly ${actualBugCount} bugs
- Each bug should be fixable independently
- Include a clear description of what the program SHOULD do
- Use proper ${langConfig.name} idioms and conventions
${langKey === "c" || langKey === "cpp" ? "- Include necessary #include headers\n- Include a main() function" : ""}
${langKey === "java" ? "- Include a proper class with main method" : ""}
${avoidList}

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
          { role: "user", content: `Generate a ${difficulty} ${langConfig.name} debugging challenge with exactly ${bugCount} bugs. Be creative and unique. Seed: ${Date.now()}-${Math.random().toString(36).slice(2)}` },
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
                  language: { type: "string", description: "The programming language used" },
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
                required: ["title", "description", "buggyCode", "correctCode", "language", "bugs", "testCases"],
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
