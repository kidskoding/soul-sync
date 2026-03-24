# Patch 001 — Migrate LLM from OpenAI to Anthropic Claude + Event-Driven Conversation Orchestrator

**Date:** 2026-03-24
**Status:** Proposed
**Type:** Dependency swap + model strategy + architecture change

---

## Summary

Two changes bundled together:

1. Replace OpenAI GPT-4o with Anthropic Claude across all LLM tasks. Retain OpenAI solely for embeddings (`text-embedding-3-small`) since Claude has no embeddings API. Adopt a mixed-model strategy to stretch API credits.
2. Redesign the conversation orchestrator from a single long-running HTTP request to an event-driven architecture, solving Vercel free tier's 10s serverless function timeout.

---

## Motivation

**Claude migration:**
- Claude consistently outperforms GPT-4o on personality analysis, emotional nuance, and authentic conversational personas — all core to SoulSync
- Anthropic SDK (`@anthropic-ai/sdk`) is a clean TypeScript-first SDK with streaming, structured outputs, and adaptive thinking built in
- Adaptive thinking (`thinking: {type: "adaptive"}`) on Sonnet 4.6 improves compatibility scoring quality with no extra configuration

**Event-driven orchestrator:**
- Vercel free tier serverless functions timeout at 10 seconds — a full twin conversation (20 exchanges with Claude) takes 2-3 minutes
- A single long HTTP request is also fragile — any client disconnect kills the conversation mid-way
- Event-driven architecture: each Claude exchange is a separate short-lived function invocation; Supabase Realtime pushes messages to the frontend as they're written

---

## Changes

### Dependencies

**Remove:**
```bash
npm uninstall openai
```

**Add:**
```bash
npm install @anthropic-ai/sdk
```

**Keep:**
```bash
# OpenAI retained for embeddings only
npm install openai  # text-embedding-3-small
```

---

### Environment Variables

**Remove:**
```env
OPENAI_API_KEY=...
```

**Add:**
```env
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...   # retained for embeddings only
```

---

### Model Strategy

Mixed-model approach to balance quality and cost:

| Task | Old Model | New Model | Reason |
|---|---|---|---|
| Interview Engine | GPT-4o | `claude-sonnet-4-6` | Conversational quality, cost-efficient |
| Twin Conversation Orchestrator | GPT-4o | `claude-sonnet-4-6` | Core product — quality matters |
| Scoring Agent | GPT-4o | `claude-haiku-4-5` | Single structured call, simpler task |
| Personality Embeddings | `text-embedding-3-small` | `text-embedding-3-small` | No change — Claude has no embeddings API |

---

### API Changes

#### Before (OpenAI)
```typescript
import OpenAI from "openai"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: prompt }],
})

const text = response.choices[0].message.content
```

#### After (Anthropic)
```typescript
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 16000,
  messages: [{ role: "user", content: prompt }],
})

const text = response.content[0].type === "text" ? response.content[0].text : ""
```

---

### Streaming (Conversation Orchestrator)

Live conversation viewer requires streaming so each twin message appears in real-time via Supabase Realtime.

#### Before (OpenAI)
```typescript
const stream = await client.chat.completions.create({
  model: "gpt-4o",
  messages,
  stream: true,
})

for await (const chunk of stream) {
  const text = chunk.choices[0]?.delta?.content ?? ""
  // write to DB
}
```

#### After (Anthropic)
```typescript
const stream = client.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 16000,
  messages,
})

for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
    const text = event.delta.text
    // write to DB
  }
}

const finalMessage = await stream.finalMessage()
```

---

### Scoring Agent (Structured Output)

Replaces OpenAI JSON mode with Anthropic's `output_config.format` for guaranteed valid JSON.

#### Before (OpenAI)
```typescript
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages,
  response_format: { type: "json_object" },
})
```

#### After (Anthropic)
```typescript
const response = await client.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 4096,
  messages,
  output_config: {
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          values_alignment:    { type: "number" },
          communication_style: { type: "number" },
          humor_compatibility: { type: "number" },
          lifestyle_fit:       { type: "number" },
          emotional_depth:     { type: "number" },
          overall:             { type: "number" },
          analysis:            { type: "string" },
        },
        required: ["values_alignment", "communication_style", "humor_compatibility", "lifestyle_fit", "emotional_depth", "overall", "analysis"],
        additionalProperties: false,
      },
    },
  },
})
```

---

### Embeddings (Unchanged)

Embeddings remain on OpenAI. No changes to matching engine.

```typescript
// No change — still uses OpenAI
const embeddingResponse = await openaiClient.embeddings.create({
  model: "text-embedding-3-small",
  input: personalityText,
})
const embedding = embeddingResponse.data[0].embedding
```

---

## Event-Driven Conversation Orchestrator

### Old Architecture (single long HTTP request)

```
POST /api/conversations/start
  → runs full 20-exchange loop (~2-3 min)
  → times out on Vercel free tier at 10s ❌
```

### New Architecture (event-driven)

```
POST /api/conversations/start
  → creates conversation record (status: 'pending')
  → returns immediately ✓

Supabase pg_cron / webhook triggers worker:
  POST /api/conversations/step
    → loads conversation state from DB
    → generates ONE Claude exchange
    → writes message to conversations table
    → Supabase Realtime pushes to frontend
    → if exchanges < 20: schedules next step
    → if done: triggers scoring
```

### New DB Column

```sql
conversations
  + turn_index  int  -- tracks which exchange we're on
```

### New API Routes

| Route | Purpose |
|---|---|
| `POST /api/conversations/start` | Creates record, triggers first step |
| `POST /api/conversations/step` | Runs one Claude exchange, schedules next |

### How Steps Are Triggered

Use **Supabase Database Webhooks** to call `/api/conversations/step` whenever a new message is inserted with `status = 'pending_next'`. No separate queue service needed — Supabase handles it.

---

## Files Affected

| File | Change |
|---|---|
| `package.json` | Add `@anthropic-ai/sdk` |
| `.env.local` | Add `ANTHROPIC_API_KEY` |
| `lib/ai/client.ts` | New — Anthropic client singleton |
| `lib/ai/embeddings.ts` | New — OpenAI embeddings client (isolated) |
| `app/api/interview/route.ts` | Swap to Anthropic SDK |
| `app/api/conversations/start/route.ts` | New — replaces old conversations route |
| `app/api/conversations/step/route.ts` | New — single exchange handler |
| `app/api/scoring/route.ts` | Swap to Anthropic SDK + structured output |
| `app/api/profile/route.ts` | Swap to Anthropic SDK |
| `supabase/migrations/` | Add `turn_index` column + webhook config |

---

## Cost Estimate (per user onboarding + first match)

| Task | Model | Est. Tokens | Est. Cost |
|---|---|---|---|
| Interview (15 turns) | Sonnet 4.6 | ~3K in / ~1.5K out | ~$0.03 |
| Twin conversation (20 exchanges) | Sonnet 4.6 | ~4K in / ~2K out | ~$0.04 |
| Scoring | Haiku 4.5 | ~3K in / ~0.5K out | ~$0.006 |
| **Total per match** | | | **~$0.08** |

$10 in credits ≈ **~125 full match cycles** for development and testing.

---

## No Changes To

- Supabase schema (except `turn_index` column)
- pgvector matching logic
- Supabase Realtime subscriptions (frontend unchanged)
- Frontend components
- Auth flow
- Hosting (Vercel)
