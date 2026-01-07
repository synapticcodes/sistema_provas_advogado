-- ===========================================
-- MIGRATION: Setup inicial do banco de dados
-- Sistema de Prova Online (ADV)
-- ===========================================

-- Habilitar extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------
-- Tabela: candidates (base, se não existir)
-- -------------------------------------------
-- NOTA: Ajuste conforme sua estrutura existente
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------
-- Tabela: exam_attempts
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT,
  status TEXT NOT NULL CHECK (status IN ('issued', 'in_progress', 'submitted', 'expired', 'invalidated')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  idempotency_key_issue TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para exam_attempts
CREATE INDEX IF NOT EXISTS idx_exam_attempts_candidate_id ON exam_attempts(candidate_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_token_hash ON exam_attempts(token_hash);

-- Impedir múltiplas provas ativas por candidato
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_attempt_per_candidate
  ON exam_attempts(candidate_id)
  WHERE status IN ('issued', 'in_progress');

-- -------------------------------------------
-- Tabela: exam_answers
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  final BOOLEAN NOT NULL DEFAULT FALSE,
  word_count INT,
  char_count INT
);

CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt_id ON exam_answers(attempt_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_final_answer_per_question 
  ON exam_answers(attempt_id, question_id) 
  WHERE final = TRUE;

-- -------------------------------------------
-- Tabela: audit_events
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  attempt_id UUID REFERENCES exam_attempts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'orchestrator', 'candidate', 'admin')),
  actor_id TEXT,
  request_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_candidate_id ON audit_events(candidate_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_attempt_id ON audit_events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);

-- -------------------------------------------
-- Trigger: updated_at automático
-- -------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_exam_attempts_updated_at
  BEFORE UPDATE ON exam_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
