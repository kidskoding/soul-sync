CREATE TABLE conversation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
  status text DEFAULT 'active' CHECK (status IN ('active','pending_next','completed','failed','stalled')),
  current_turn int DEFAULT 0,
  max_turns int DEFAULT 20,
  retry_count int DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
