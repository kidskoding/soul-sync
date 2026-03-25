---
name: supabase-patterns
description: SoulSync Supabase patterns — Auth, Realtime subscriptions, pgvector similarity search, database webhooks, and migrations. Use when working on any Supabase-related code including auth flows, realtime conversation subscriptions, embedding queries, webhook triggers for the conversation orchestrator, or writing/modifying Supabase migrations. Triggers on files in supabase/, lib/supabase*, any pgvector query, or realtime subscription code.
---

# Supabase Patterns for SoulSync

## Auth Setup

Use Supabase Auth with email/password. The `users` table extends Supabase's `auth.users`.

```typescript
import { createClient } from "@supabase/supabase-js"

// Server client (API routes)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Browser client (components)
import { createBrowserClient } from "@supabase/ssr"
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

Always use `supabaseAdmin` (service role) in API routes. Use the anon client in browser code — RLS policies enforce access.

## Realtime Subscriptions

The live conversation viewer subscribes to the `conversations` table filtered by `match_id`.

```typescript
const channel = supabase
  .channel(`match-${matchId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "conversations",
      filter: `match_id=eq.${matchId}`,
    },
    (payload) => {
      // payload.new contains the new message row
      addMessage(payload.new)
    }
  )
  .subscribe()

// Cleanup
return () => { supabase.removeChannel(channel) }
```

Enable Realtime on the `conversations` table in Supabase dashboard or via migration:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

## pgvector Similarity Search

Personality embeddings use `vector(1536)` (OpenAI text-embedding-3-small). Query via a Postgres function:

```sql
CREATE OR REPLACE FUNCTION match_personalities(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  exclude_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.user_id,
    1 - (pp.embedding <=> query_embedding) AS similarity
  FROM personality_profiles pp
  WHERE pp.user_id != COALESCE(exclude_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND 1 - (pp.embedding <=> query_embedding) > match_threshold
  ORDER BY pp.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

Call from TypeScript:
```typescript
const { data } = await supabaseAdmin.rpc("match_personalities", {
  query_embedding: userEmbedding,
  match_threshold: 0.7,
  match_count: 10,
  exclude_user_id: userId,
})
```

## Database Webhooks (Conversation Step Trigger)

The event-driven orchestrator uses a Supabase Database Webhook to trigger `/api/conversations/step` when a conversation session moves to `pending_next`.

Configure via Supabase dashboard or SQL:
- **Table:** `conversation_sessions`
- **Event:** UPDATE (when `status` changes to `pending_next`)
- **URL:** `{VERCEL_URL}/api/conversations/step`
- **Method:** POST
- **Headers:** Include a shared webhook secret for auth

Verify webhook authenticity in the step handler:
```typescript
const secret = request.headers.get("x-webhook-secret")
if (secret !== process.env.WEBHOOK_SECRET) {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
```

## Migrations

All migrations go in `supabase/migrations/` with timestamp prefix:
```
supabase/migrations/
  20260324000001_create_users.sql
  20260324000002_create_personality_profiles.sql
  20260324000003_create_matches.sql
  20260324000004_create_conversations.sql
  20260324000005_create_conversation_sessions.sql
  20260324000006_create_compatibility_scores.sql
  20260324000007_enable_pgvector.sql
  20260324000008_create_match_function.sql
```

Enable pgvector first:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Example

**User says:** "Add a new column to the matches table"

**Skill behavior:**
1. Create a new migration file with next timestamp
2. Write the ALTER TABLE statement
3. Update any TypeScript types that reference the matches table
4. Run `supabase db push` or `supabase migration up` to apply
