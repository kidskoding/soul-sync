CREATE TABLE swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('right','left')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_id)
);

ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own swipes"
  ON swipes FOR ALL
  USING (auth.uid() = user_id);
