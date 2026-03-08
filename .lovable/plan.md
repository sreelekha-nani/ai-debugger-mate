

# AI Powered Code Debugging Challenge Platform - Implementation Plan

## Architecture Overview

This is a frontend-heavy React application using Lovable Cloud for backend (edge functions + Supabase). AI-generated buggy code will come from the Lovable AI Gateway.

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React SPA   │────▶│  Edge Functions   │────▶│ Lovable AI GW   │
│  (UI/Timer/  │◀────│  - generate-bug   │     │ (Gemini Flash)  │
│   Editor)    │     │  - evaluate-code  │     └─────────────────┘
└─────────────┘     └──────────────────┘
```

## Tech Decisions (based on your requirements)

- **Auth**: Simple name/team entry (no login required)
- **Code Execution**: AI-based evaluation (AI analyzes if fixes are correct via test case generation + comparison)
- **Data**: In-memory/localStorage for session, no persistent database needed
- **Admin**: Self-service competition rooms

## Pages & Routes

1. **`/`** - Landing / Join Competition (name + team entry, difficulty selection)
2. **`/arena`** - Debugging Arena (code editor, timer, problem display)
3. **`/leaderboard`** - Live leaderboard
4. **`/results`** - Final results after competition

## Key Components

- **JoinForm** - Name, team, language, difficulty selection
- **CodeEditor** - Textarea-based editor with syntax highlighting (monospace), anti-paste protection
- **Timer** - Countdown (10-15 min), auto-submit on expiry
- **ProblemDisplay** - Shows buggy code description, expected behavior, bug count hint
- **Leaderboard** - Ranked table with scores, times, accuracy

## Edge Functions

1. **`generate-buggy-code`** - Calls Lovable AI to generate a unique buggy program with:
   - The working solution (hidden)
   - Buggy version (shown to student)
   - List of bugs introduced
   - Test cases for validation
   - Difficulty-appropriate complexity

2. **`evaluate-submission`** - Calls Lovable AI to compare student's fix against expected solution using test cases, returns score (bugs fixed, accuracy)

## Anti-Cheating Measures

- Disable paste events in editor
- Track tab visibility changes (warn on switch)
- Unique problem per participant (AI generates fresh each time)
- Auto-submit on timer expiry
- Session tracking via localStorage

## Competition Flow

1. Student enters name/team, picks difficulty + language
2. Frontend calls `generate-buggy-code` edge function
3. Student gets unique buggy code in the editor with timer started
4. Student edits code and submits (or auto-submit on timeout)
5. Frontend calls `evaluate-submission` with original + fixed code
6. Score calculated, leaderboard updated (stored in React state, shared via localStorage for demo)

## State Management

- React state + context for competition data
- localStorage for leaderboard persistence within session
- No database needed for MVP

## Implementation Order

1. Enable Lovable Cloud + set up edge functions
2. Build Join page with form
3. Build Arena page with editor, timer, problem display
4. Implement `generate-buggy-code` edge function with AI
5. Implement `evaluate-submission` edge function with AI
6. Build Leaderboard and Results pages
7. Add anti-cheating measures
8. Polish UI with animations and responsive design

