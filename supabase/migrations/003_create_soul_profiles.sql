CREATE TABLE soul_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  interview_data jsonb DEFAULT '{}',
  personality jsonb DEFAULT '{}',
  preferences jsonb DEFAULT '{}',
  learnings jsonb DEFAULT '{}',
  soul_md text DEFAULT '',
  system_prompt text DEFAULT '',
  embedding vector(1536),
  version int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE soul_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own soul"
  ON soul_profiles FOR SELECT
  USING (auth.uid() = user_id);
