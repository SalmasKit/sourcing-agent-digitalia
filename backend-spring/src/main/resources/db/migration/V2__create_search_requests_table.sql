CREATE TABLE search_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_description TEXT NOT NULL,
  extracted_criteria JSONB,
  status          VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sr_created_by ON search_requests(created_by);
CREATE INDEX idx_sr_status ON search_requests(status) WHERE status IN ('PENDING', 'RUNNING');
CREATE INDEX idx_sr_created_at ON search_requests(created_at DESC);
