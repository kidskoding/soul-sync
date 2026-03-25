CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  speaker text NOT NULL CHECK (speaker IN ('twin_a','twin_b')),
  message text NOT NULL,
  message_index int NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_conversations_match ON conversations(match_id, message_index);

ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
