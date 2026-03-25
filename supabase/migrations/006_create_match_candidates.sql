CREATE TABLE match_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage text DEFAULT 'embedding' CHECK (stage IN ('embedding','llm_validated','conversation','scored')),
  embedding_sim float,
  llm_pass boolean,
  created_at timestamptz DEFAULT now()
);
