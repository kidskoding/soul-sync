# SoulSync

AI-powered dating platform where digital twin agents interact on behalf of users to find deeply compatible matches. Instead of endless swiping, your AI twin has conversations with other twins to discover genuine compatibility before you ever meet.

## How It Works

1. **Onboarding Interview** — An AI interviewer learns your personality, values, communication style, humor, and dealbreakers through a ~15 question conversation.
2. **Twin Creation** — Your answers generate a SOUL.MD profile (a living personality document), a system prompt that powers your digital twin, and a personality embedding for matching.
3. **Matching Pipeline** — pgvector similarity search finds potential matches, then a lite LLM gate filters out dealbreaker conflicts before any conversation begins.
4. **Twin Conversations** — Your AI twin autonomously chats with matched twins in real-time getting-to-know-you conversations. A conversation monitor evaluates health every 5 messages and can end unproductive conversations early.
5. **Compatibility Scoring** — After conversations complete, a 5-axis scoring engine evaluates values alignment, communication style, humor compatibility, lifestyle fit, and emotional depth.
6. **Match Reveal** — High-scoring matches (72%+) are revealed to both users. You can read the full twin conversation transcript and see detailed compatibility breakdowns.

## Features

- **AI-Powered Onboarding** — Dynamic interview that adapts follow-up questions based on your answers
- **Living Personality Profiles** — SOUL.MD documents evolve from swipe patterns and conversation learnings
- **Real-Time Conversation Viewer** — Watch your twin's conversations live via Supabase Realtime
- **Multi-Dimensional Scoring** — 5-axis weighted compatibility analysis with AI-generated insights
- **Daily Swipe Feed** — Swipe data feeds back into your twin's preferences (learning loop)
- **Nightly Analysis** — Batch job extracts preference patterns from swipe history
- **Post-Conversation Reflection** — Agent analyzes completed conversations to improve future matches

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Python 3.12, FastAPI, uvicorn |
| **Database** | Supabase (Postgres + pgvector + Auth + Realtime + Storage) |
| **AI** | GPT-4o (conversations, scoring, interviews), GPT-4o-mini (monitoring, validation, analysis), OpenAI text-embedding-3-small (embeddings) |
| **State** | TanStack Query (frontend), Supabase Realtime (live updates) |

## Project Structure

```
soulsync/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app with CORS + router registration
│   │   ├── config.py                # Environment config via pydantic-settings
│   │   ├── deps.py                  # DI helpers (Supabase, OpenAI)
│   │   ├── models/                  # Pydantic request/response models
│   │   │   ├── user.py
│   │   │   ├── soul.py
│   │   │   ├── match.py
│   │   │   └── conversation.py
│   │   ├── routers/                 # API endpoints
│   │   │   ├── auth.py              # JWT verification
│   │   │   ├── interview.py         # Onboarding chat
│   │   │   ├── profile.py           # SOUL.MD generation trigger
│   │   │   ├── photos.py            # Photo upload (Supabase Storage)
│   │   │   ├── matching.py          # Matching pipeline trigger
│   │   │   ├── swipes.py            # Daily swipe feed + recording
│   │   │   ├── conversations.py     # Twin conversation start + messages
│   │   │   ├── scoring.py           # Compatibility scoring
│   │   │   └── cron.py              # Nightly batch jobs
│   │   └── services/                # Business logic
│   │       ├── interview_engine.py  # AI interviewer
│   │       ├── soul_generator.py    # Personality extraction + SOUL.MD + embedding
│   │       ├── matching_engine.py   # pgvector + lite LLM matching
│   │       ├── conversation_orchestrator.py  # Twin-to-twin chat loop
│   │       ├── conversation_monitor.py       # Health evaluation
│   │       ├── scoring_engine.py    # 5-axis compatibility scoring
│   │       ├── reflection_agent.py  # Post-conversation learning
│   │       └── swipe_analyzer.py    # Preference pattern extraction
│   └── requirements.txt
├── frontend/
│   ├── app/                         # Next.js App Router pages
│   │   ├── page.tsx                 # Landing page
│   │   ├── auth/                    # Login/signup
│   │   ├── onboarding/              # Interview + personality review
│   │   ├── dashboard/               # Match grid
│   │   ├── matches/[id]/            # Match detail + conversation viewer
│   │   ├── swipes/                  # Daily swipe feed
│   │   ├── profile/                 # Personality profile + photos
│   │   └── settings/                # Account settings
│   ├── components/                  # React components
│   │   ├── ui/                      # shadcn/ui primitives
│   │   ├── chat/                    # Chat interface + message bubbles
│   │   ├── nav.tsx                  # Bottom navigation bar
│   │   ├── match-card.tsx           # Match list card
│   │   ├── swipe-card.tsx           # Swipe deck card
│   │   └── conversation-viewer.tsx  # Real-time conversation viewer
│   └── lib/
│       ├── api.ts                   # Typed API client for FastAPI
│       ├── supabase/client.ts       # Supabase browser client
│       └── hooks/use-user.ts        # Auth state hook
└── supabase/
    ├── config.toml                  # Local Supabase config
    └── migrations/                  # 11 SQL migration files
        ├── 001_enable_extensions.sql
        ├── 002_create_users.sql
        ├── 003_create_soul_profiles.sql
        └── ...
```

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env  # or create manually:
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# SUPABASE_ANON_KEY=your-anon-key
# OPENAI_API_KEY=your-openai-key
# WEBHOOK_SECRET=your-webhook-secret
# FRONTEND_URL=http://localhost:3000

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Create .env.local
cp .env.local.example .env.local  # or create manually:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

### Database

Push migrations to your Supabase project:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

## Architecture

```
User → Frontend (Next.js) → Backend (FastAPI) → OpenAI (GPT-4o)
                 ↕                    ↕
            Supabase Auth      Supabase Postgres
            Supabase Realtime  pgvector embeddings
            Supabase Storage   Supabase RPC
```

**Conversation Flow:**
1. User triggers "Start Conversation" on a match
2. Backend spawns a background loop that alternates twin messages every 2.5s
3. Each message is written to the `conversations` table, triggering Supabase Realtime
4. Frontend subscribes to Realtime and displays messages as they arrive
5. Monitor evaluates every 5 messages — can escalate to meetup or end early
6. On completion, scoring engine runs 5-axis analysis and reflection agent updates learnings

## License

MIT
