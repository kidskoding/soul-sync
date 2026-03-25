CREATE OR REPLACE FUNCTION match_personalities(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 50,
  exclude_user_id uuid DEFAULT NULL
)
RETURNS TABLE (user_id uuid, similarity float)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT sp.user_id, 1 - (sp.embedding <=> query_embedding) AS similarity
  FROM soul_profiles sp
  WHERE sp.user_id != COALESCE(exclude_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND sp.embedding IS NOT NULL
    AND 1 - (sp.embedding <=> query_embedding) > match_threshold
  ORDER BY sp.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
