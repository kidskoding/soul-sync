# SoulSync — System Design

**Date:** 2026-03-24
**Status:** Approved

## Overview

SoulSync is an AI-powered dating platform where each user creates a "digital twin" — an AI agent that captures their personality, preferences, communication style, and values. These agents interact with other agents autonomously, holding conversations, testing compatibility, and simulating real relationship dynamics. Humans never chat directly; all communication is agent-mediated. Users only meet in person when their twins determine strong compatibility.

## Architecture: Synchronous Twin Engine

Twin conversations happen in real-time. Each match triggers a GPT-4o conversation loop where both twins exchange messages with natural delays. Users watch live via Supabase Realtime subscriptions.

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js)                │
│  ┌───────────┐ ┌──────────┐ ┌────────────────────┐ │
│  │ Onboarding│ │Dashboard │ │ Live Conversation  │ │
│  │ Interview │ │ & Matches│ │     Viewer         │ │
│  └─────┬─────┘ └────┬─────┘ └────────┬───────────┘ │
└────────┼────────────┼────────────────┼──────────────┘
         │            │                │
         ▼            ▼                ▼ (Realtime sub)
┌─────────────────────────────────────────────────────┐
│              BACKEND (Next.js API Routes)           │
│  ┌────────────┐ ┌──────────────┐ ┌───────────────┐ │
│  │ Interview  │ │   Matching   │ │ Conversation  │ │
│  │  Engine    │ │   Engine     │ │ Orchestrator  │ │
│  └─────┬──────┘ └──────┬───────┘ └──────┬────────┘ │
│        │               │                │          │
│        ▼               ▼                ▼          │
│  ┌──────────┐   ┌───────────┐   ┌──────────────┐  │
│  │ Profile   │   │ pgvector  │   │  Scoring     │  │
│  │ Generator │   │ Search    │   │  Agent       │  │
│  └──────────┘   └───────────┘   └──────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌────────────┐
│   Supabase   │ │   pgvector   │ │  OpenAI    │
│   (Postgres  │ │  (embeddings │ │  GPT-4o    │
│   + Auth +   │ │   + cosine   │ │  API       │
│   Realtime)  │ │   search)    │ │            │
└──────────────┘ └──────────────┘ └────────────┘
```

### Key Components

1. **Interview Engine** — Drives onboarding conversation, extracts structured personality data
2. **Profile Generator** — Converts interview responses into personality profile (JSON) + system prompt
3. **Matching Engine** — Generates embeddings, runs pgvector similarity search for candidates
4. **Conversation Orchestrator** — Runs twin-to-twin conversation loop via GPT-4o, writes messages to DB in real-time
5. **Scoring Agent** — Post-conversation analysis producing multi-dimensional compatibility scores
6. **Live Conversation Viewer** — Frontend subscribing to Supabase Realtime for live message updates

## Data Model

```sql
users
  id              uuid PK (from Supabase Auth)
  email           text
  display_name    text
  avatar_url      text
  created_at      timestamptz
  onboarding_done boolean default false

personality_profiles
  id              uuid PK
  user_id         uuid FK → users
  interview_data  jsonb        -- raw Q&A from onboarding
  personality     jsonb        -- structured: values, style, preferences, dealbreakers
  system_prompt   text         -- LLM system prompt that "is" this twin
  embedding       vector(1536) -- personality embedding for matching
  created_at      timestamptz
  updated_at      timestamptz

matches
  id              uuid PK
  user_a_id       uuid FK → users
  user_b_id       uuid FK → users
  similarity      float        -- cosine similarity score
  status          text         -- 'pending' | 'conversing' | 'scored' | 'revealed' | 'rejected'
  created_at      timestamptz

conversations
  id              uuid PK
  match_id        uuid FK → matches
  speaker         text         -- 'twin_a' | 'twin_b'
  message         text
  message_index   int
  created_at      timestamptz

compatibility_scores
  id              uuid PK
  match_id        uuid FK → matches
  values_alignment    float
  communication_style float
  humor_compatibility float
  lifestyle_fit       float
  emotional_depth     float
  overall             float    -- weighted composite
  analysis            text     -- narrative explanation
  created_at          timestamptz
```

## Core Flows

### Flow 1: Onboarding (Twin Creation)

1. User signs up via Supabase Auth
2. AI interviewer (GPT-4o) asks ~15 conversational questions covering: values, communication style, lifestyle, dealbreakers, humor, depth
3. Responses stored in `interview_data` JSONB
4. Profile Generator extracts structured personality JSON
5. System prompt generated: "You are [name]'s digital twin. You embody..."
6. Embedding created via `text-embedding-3-small`
7. User reviews their twin's personality card
8. `onboarding_done = true`, redirect to Dashboard

### Flow 2: Matching

1. For user X, query pgvector for top 10 most similar profiles (excluding matched/blocked/self)
2. Filter by dealbreaker compatibility
3. Create match records with status='pending'
4. Queue conversations

### Flow 3: Twin Conversation

1. Load both twins' system prompts
2. Create conversation context prompt
3. Loop 10-20 exchanges with natural pacing (2-3s delays)
4. Each message written to `conversations` table (triggers Realtime)
5. After completion: update match status, trigger Scoring Agent

### Flow 4: Scoring

1. Single GPT-4o structured output call analyzing the transcript
2. Returns scores across 5 dimensions + narrative analysis
3. Compute weighted overall score
4. If above threshold, notify both users

### Flow 5: Match Reveal & Ongoing Agent Chat

1. Both users notified of strong match
2. Profiles + full twin conversation visible
3. New ongoing conversation channel opens between twins
4. Twins can continue chatting, plan dates, discuss deeper topics
5. Either user can suggest meeting in person through their twin

## Frontend Pages

| Page | Purpose |
|------|---------|
| `/` | Landing page |
| `/auth` | Sign up / sign in |
| `/onboarding` | AI interview chat |
| `/onboarding/review` | Review twin personality card |
| `/dashboard` | Active matches, pending conversations, notifications |
| `/matches/[id]` | Live/replay conversation viewer + compatibility scores |
| `/matches/[id]/chat` | Ongoing agent-to-agent chat for revealed matches |
| `/profile` | Edit profile, retake interview parts |
| `/settings` | Account settings |

### Key UI Components

- **Interview Chat** — Full-screen chat, AI asks questions, progress indicator
- **Live Conversation Viewer** — Chat bubble view with typing indicators and natural delays
- **Compatibility Radar** — Spider chart for 5 scoring dimensions, animated reveal
- **Match Card** — Score, alignment highlights, CTA to view conversation
- **Dashboard Feed** — Chronological match activity feed

### Design Direction

Warm, human, not clinical. Soft gradients, rounded corners, subtle animations. The AI should feel like a trusted friend, not a robot.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (Postgres) |
| Vector search | pgvector (via Supabase) |
| LLM | OpenAI GPT-4o |
| Embeddings | OpenAI text-embedding-3-small |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Hosting | Vercel |
| State | TanStack Query |

## Key Technical Decisions

- No websocket server needed — Supabase Realtime handles live updates via Postgres changes
- Conversation orchestrator runs server-side via Next.js API routes
- System prompts pre-generated at onboarding time, cached in DB
- Scoring is a single structured-output GPT-4o call
- All communication is agent-mediated — humans never chat directly
