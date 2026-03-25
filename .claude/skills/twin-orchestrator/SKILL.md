---
name: twin-orchestrator
description: SoulSync event-driven twin conversation engine. Use when building, modifying, or debugging the conversation orchestrator — the system where two AI twins (Claude Sonnet 4.6) hold a multi-turn getting-to-know-you conversation on behalf of their users. Covers the start endpoint, step function, context assembly, Supabase Realtime integration, failure recovery, and conversation lifecycle. Triggers on files in app/api/conversations/, conversation flow logic, twin chat behavior, or anything related to the agent-to-agent dialogue system.
---

# Twin Conversation Orchestrator

The core product mechanic: two AI digital twins have a real-time conversation to test compatibility. Uses an event-driven architecture where each exchange is a separate short-lived serverless function call (to fit within Vercel's 10s timeout).

## Architecture

```
POST /api/conversations/start
  → creates conversation_session (status: 'active')
  → writes first twin_a message
  → sets status → 'pending_next'
  → returns immediately

Supabase webhook fires on status = 'pending_next':
  POST /api/conversations/step
    → loads conversation state from DB
    → determines whose turn it is
    → generates ONE Claude response
    → writes message to conversations table
    → Supabase Realtime pushes to frontend
    → if turn < max_turns: status → 'pending_next'
    → if done: status → 'completed', trigger scoring
```

## Start Endpoint

`POST /api/conversations/start`

```typescript
// 1. Validate match exists and is 'pending'
// 2. Load both personality profiles (system prompts)
// 3. Create conversation_session record
// 4. Generate Twin A's opening message via Claude
// 5. Insert message into conversations table
// 6. Update session: current_turn = 1, status = 'pending_next'
// 7. Return { sessionId, matchId }
```

## Step Function

`POST /api/conversations/step` (triggered by webhook)

```typescript
// 1. Verify webhook secret
// 2. Load conversation_session (must be 'pending_next')
// 3. Set status → 'active' (prevents double-trigger)
// 4. Determine speaker: odd turn = twin_a, even turn = twin_b
// 5. Assemble context (see below)
// 6. Call Claude Sonnet 4.6
// 7. Insert message into conversations table
// 8. Increment current_turn
// 9. If current_turn >= max_turns: status → 'completed'
//    Else: status → 'pending_next' (triggers next step)
```

## Context Assembly

Each step must reconstruct the full conversation for Claude. Assemble in this order:

```typescript
const systemPrompt = speaker === "twin_a"
  ? profileA.system_prompt
  : profileB.system_prompt

const conversationContext = `You are having a getting-to-know-you conversation with someone new. Be authentic to your personality. Explore values, interests, humor, and what matters in a partner. Keep responses conversational — 2-4 sentences, natural length.`

// Load all previous messages, map to Claude message format
const history = await loadMessages(matchId) // ordered by message_index

const messages = history.map(msg => ({
  role: msg.speaker === speaker ? "assistant" : "user",
  content: msg.message,
}))

// Add a nudge for the current turn if this is the first message
if (messages.length === 0) {
  messages.push({
    role: "user",
    content: "Say hi and introduce yourself naturally."
  })
}

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 300, // keep responses concise
  system: `${systemPrompt}\n\n${conversationContext}`,
  messages,
})
```

**Token budget:** Cap `max_tokens` at 300 to keep twin messages natural length. The full conversation context grows with each turn — by turn 20, expect ~10-12K input tokens.

## Failure Recovery

- **Double-trigger prevention:** Step function sets status to `active` immediately before processing. If webhook fires twice, second call sees `active` and exits.
- **Step failure:** Wrap Claude call in try/catch. On failure, increment `retry_count`. If retries < 3, set status back to `pending_next`. If retries >= 3, set status to `failed`.
- **Stall detection:** A cron job (every 60s) checks for sessions stuck in `pending_next` or `active` for > 30 seconds and re-triggers them.
- **Conversation timeout:** If a session hasn't completed within 10 minutes, mark as `failed`.

## Database Schema

```sql
conversation_sessions
  id            uuid PK DEFAULT gen_random_uuid()
  match_id      uuid FK → matches UNIQUE
  status        text DEFAULT 'active'
    -- 'active' | 'pending_next' | 'completed' | 'failed' | 'stalled'
  current_turn  int DEFAULT 0
  max_turns     int DEFAULT 20
  retry_count   int DEFAULT 0
  started_at    timestamptz DEFAULT now()
  completed_at  timestamptz
```

## Example

**User says:** "The conversation is getting cut off at turn 15, increase to 25 turns"

**Skill behavior:**
1. Update `max_turns` default in the `conversation_sessions` table migration
2. Update the step function's completion check: `if (session.current_turn >= session.max_turns)`
3. No other changes needed — the loop is driven by `max_turns`, not a hardcoded value
