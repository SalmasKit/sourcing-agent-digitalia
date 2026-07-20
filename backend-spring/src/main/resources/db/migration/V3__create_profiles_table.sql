CREATE TABLE profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_request_id UUID NOT NULL REFERENCES search_requests(id) ON DELETE CASCADE,
  source_platform   VARCHAR(100),
  source_url        TEXT,
  full_name         VARCHAR(255),
  headline          TEXT,
  location          VARCHAR(255),
  skills            JSONB,
  experience_years  SMALLINT,
  raw_data          JSONB,
  score             NUMERIC(5,2),
  score_breakdown   JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_search_request_id ON profiles(search_request_id);
CREATE INDEX idx_profiles_score ON profiles(search_request_id, score DESC);
CREATE INDEX idx_profiles_skills ON profiles USING GIN (skills);
