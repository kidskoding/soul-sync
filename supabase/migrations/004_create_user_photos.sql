CREATE TABLE user_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url text NOT NULL,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own photos"
  ON user_photos FOR ALL
  USING (auth.uid() = user_id);
