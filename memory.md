# Memory

## Project State (2026-03-24)
- **Phase:** Design approved, moving to implementation planning
- **Design doc:** `docs/plans/2026-03-24-soulsync-design.md`

## Key Decisions
- **Architecture:** Synchronous Twin Engine — real-time twin conversations, live viewer
- **All communication is agent-mediated** — humans never chat directly, only meet IRL
- **Tech stack:** Next.js 15 + Supabase + GPT-4o + pgvector + Tailwind/shadcn
- **Onboarding:** Guided AI interview (~15 questions) → personality profile + system prompt + embedding
- **Matching:** Auto-match via pgvector cosine similarity + dealbreaker filtering
- **Scoring:** Multi-dimensional (5 axes) via single GPT-4o structured output call
- **Live viewer:** Supabase Realtime subscriptions on conversations table
- **Hosting:** Vercel
