-- ===========================================
-- MIGRATION: exam_reviews table
-- ===========================================

-- -------------------------------------------
-- Tabela: exam_reviews
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS exam_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject', 'interview')),
  score INT CHECK (score >= 0 AND score <= 100),
  notes TEXT,
  reviewer_name TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_exam_reviews_attempt_id
  ON exam_reviews(attempt_id);

CREATE INDEX IF NOT EXISTS idx_exam_reviews_candidate_id
  ON exam_reviews(candidate_id);

CREATE INDEX IF NOT EXISTS idx_exam_reviews_decision
  ON exam_reviews(decision);

CREATE INDEX IF NOT EXISTS idx_exam_reviews_reviewed_at
  ON exam_reviews(reviewed_at);

-- -------------------------------------------
-- Trigger: updated_at automático
-- -------------------------------------------
CREATE TRIGGER trigger_exam_reviews_updated_at
  BEFORE UPDATE ON exam_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
