# Design Update: SOUL.MD + Learning Loop + Swipe Signal

**Date:** 2026-03-25
**Status:** Approved
**Extends:** `2026-03-24-soulsync-design.md`

## Summary

Adds four major features to the SoulSync backend: photo uploads in onboarding, SOUL.MD as a living twin identity document, daily swipes as a continuous preference learning signal, and a cross-conversation learning loop that makes twins smarter over time. Also introduces a multi-stage matching pipeline (embedding → lite LLM → full conversation) to reduce API costs.

---

## 1) Onboarding (Dynamic)

Onboarding now collects:
- **Name** + **Year** (age)
- **Photos** (stored in Supabase Storage)
- **Interests** — gathered via a dynamic agent that follows up based on answers

The dynamic agent adapts: if you mention hiking, it digs into what kind, how often, solo vs group. This produces richer interest data than fixed questions.

---

## 2) SOUL.MD — The Living Twin

The twin's identity is a structured, evolving document with three input streams:

```
Onboarding interview ──┐
                       ├──▶ SOUL.MD ──▶ Twin Agent (system prompt)
Daily swipe signals ───┤
                       │
Conversation learnings ┘
```

### SOUL.MD Structure

```markdown
# Soul Profile

## Identity
Name, age, photos, location

## Personality
Core values, communication style, humor, emotional depth
(from onboarding interview)

## Preferences (evolving)
What they're attracted to, patterns from swipe data
- Physical preferences (learned from photo swipes)
- Personality preferences (learned from profile swipes)
- Dealbreakers (refined over time)

## Conversation Learnings
- Topics that led to high compatibility scores
- Communication approaches that resonated
- Patterns in failed matches
```

After each swipe batch and each completed conversation, a lite LLM call updates the relevant SOUL.MD sections. The system prompt is regenerated from the latest SOUL.MD.

---

## 3) Matching Pipeline (Multi-Stage)

```
All users
  │
  ▼ Stage 1: pgvector embedding similarity (instant, cheap)
Top ~50 candidates
  │
  ▼ Stage 2: Lite LLM quick-check (reads both SOUL.MDs, ~2s per pair)
  "Are these two worth a full conversation?"
Top ~5-10 candidates
  │
  ▼ Stage 3: Full twin conversation (Sonnet 4.6, 20 exchanges)
Scored matches
```

The lite LLM (Haiku-class) acts as a cheap gate — reads both SOUL.MDs and decides if a full conversation is worth the API cost. Catches conflicting dealbreakers that embeddings alone miss.

---

## 4) Daily Swipes as Learning Signal

- User gets **5-6 profiles per day** to swipe on
- Profiles selected by embedding engine (diverse sampling)
- Each swipe stored as preference data
- **Nightly batch job** processes the day's swipes:
  1. Analyzes patterns (what do right-swipes have in common?)
  2. Updates SOUL.MD Preferences section
  3. Re-generates personality embedding

Swipes are NOT for matching — they're a continuous learning signal that feeds back into the twin.

---

## 5) Conversation Learning Loop

After each twin conversation completes and is scored:

```
Conversation transcript + compatibility scores
  │
  ▼ Reflection agent (lite LLM)
  "What worked? What didn't? What should the twin do differently?"
  │
  ▼ Updates SOUL.MD → Conversation Learnings section
  │
  ▼ Re-generates twin system prompt from updated SOUL.MD
```

The twin gets better at dating with each match.

---

## Data Model Changes

```sql
-- Photo storage
user_photos
  id          uuid PK
  user_id     uuid FK → users
  url         text          -- Supabase Storage URL
  position    int           -- display order
  created_at  timestamptz

-- SOUL.MD as structured data (replaces personality_profiles)
soul_profiles
  id              uuid PK
  user_id         uuid FK → users
  interview_data  jsonb
  personality     jsonb
  preferences     jsonb        -- evolving from swipes
  learnings       jsonb        -- from conversation reflections
  soul_md         text         -- full rendered SOUL.MD document
  system_prompt   text         -- generated from soul_md
  embedding       vector(1536) -- re-generated as SOUL.MD evolves
  version         int          -- track evolution
  created_at      timestamptz
  updated_at      timestamptz

-- Swipe data for learning
swipes
  id          uuid PK
  user_id     uuid FK → users
  target_id   uuid FK → users
  direction   text  -- 'right' | 'left'
  created_at  timestamptz

-- Match pipeline stage tracking
match_candidates
  id            uuid PK
  user_a_id     uuid FK → users
  user_b_id     uuid FK → users
  stage         text  -- 'embedding' | 'llm_validated' | 'conversation' | 'scored'
  embedding_sim float
  llm_pass      boolean
  created_at    timestamptz
```

---

## 6) Conversation Lifecycle — Dynamic Ending

Based on research into Tinder, Bumble, Hinge, and academic studies (see `docs/research/2026-03-25-dating-app-conversation-research.md`), twin conversations follow a 4-phase lifecycle modeled on real human dating patterns:

### Phases

```
Messages 1-4:   OPENING      → Can early-exit if clear dealbreaker
Messages 5-10:  RAPPORT      → Monitor engagement symmetry
Messages 11-15: CONNECTION   → Check for depth + mutual interest signals
Messages 12-20: DECISION     → Escalate to IRL recommendation OR end

After message 20: FORCE DECISION (pen-pal prevention)
```

### Two Terminal States

**Recommend IRL Meeting** — triggered by escalation signals:
- Both twins asking questions (mutual curiosity)
- Topic progression: surface → personal → values
- Humor/playfulness emerging
- Future-oriented language ("we should...", "you'd love...")
- Compatibility scores trending above threshold

**End Conversation** — triggered by death signals:
- Asymmetric engagement (one twin carrying)
- Topic exhaustion (circling back to same subjects)
- Short/generic responses from one side
- Dealbreaker surfacing mid-conversation
- Compatibility scores trending below threshold

### Conversation Monitor

A lite LLM evaluates every 5 messages (after messages 5, 10, 15, 20):

```typescript
// Cheap evaluation call — runs 3-4 times per conversation
const evaluation = await anthropic.messages.create({
  model: "claude-haiku-4-5",
  system: "Evaluate this dating conversation's trajectory. Assess engagement symmetry, topic depth, humor, future language, and dealbreaker conflicts.",
  messages: [{ role: "user", content: transcript }],
  output_config: {
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          phase: { type: "string", enum: ["opening", "rapport", "connection", "decision"] },
          health: { type: "number", description: "0-100 conversation health score" },
          engagement_symmetry: { type: "number", description: "0-100, 100 = perfectly balanced" },
          topic_depth: { type: "string", enum: ["surface", "personal", "values", "deep"] },
          recommendation: { type: "string", enum: ["continue", "escalate_to_meetup", "end_low_compatibility", "end_stalled"] },
          reasoning: { type: "string" }
        },
        required: ["phase", "health", "engagement_symmetry", "topic_depth", "recommendation", "reasoning"]
      }
    }
  }
})
```

### Key Research-Backed Numbers

| Parameter | Value | Source |
|-----------|-------|--------|
| Min messages before escalation | 10 | Hinge, CMB data |
| Sweet spot for meetup recommendation | 12-15 | Academic consensus |
| Max messages before forced decision | 20 | CMB: >20 msgs = <10% meetup chance |
| Early exit threshold | Message 5 | If dealbreaker detected |

---

## No Changes To

- Event-driven conversation orchestrator (from patch-001)
- Claude Sonnet 4.6 for conversations and scoring
- Supabase Realtime for live conversation viewer
- Frontend page structure (new pages may be added for swipe UI)
- Auth flow
- Hosting (Vercel)
