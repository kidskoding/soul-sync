CREATE TABLE compatibility_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
  values_alignment float NOT NULL,
  communication_style float NOT NULL,
  humor_compatibility float NOT NULL,
  lifestyle_fit float NOT NULL,
  emotional_depth float NOT NULL,
  overall float NOT NULL,
  analysis text,
  created_at timestamptz DEFAULT now()
);
