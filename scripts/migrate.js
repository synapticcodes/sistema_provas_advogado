import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function migrate() {
    console.log('🔌 Conectando ao Neon...');

    if (!process.env.NEON_DATABASE_URL) {
        console.error('❌ Erro: NEON_DATABASE_URL não definida no .env');
        process.exit(1);
    }

    const sql = neon(process.env.NEON_DATABASE_URL);

    try {
        console.log('🚀 Executando Migrations...');

        // 1. Extensões
        console.log('→ Criando extensão pgcrypto...');
        await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

        // 2. Tabela candidates
        console.log('→ Criando tabela candidates...');
        await sql`
      CREATE TABLE IF NOT EXISTS candidates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

        // 3. Tabela exam_attempts
        console.log('→ Criando tabela exam_attempts...');
        await sql`
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
      )
    `;

        console.log('→ Criando índices exam_attempts...');
        await sql`CREATE INDEX IF NOT EXISTS idx_exam_attempts_candidate_id ON exam_attempts(candidate_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_exam_attempts_token_hash ON exam_attempts(token_hash)`;

        // Índice parcial
        await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_attempt_per_candidate
      ON exam_attempts(candidate_id)
      WHERE status IN ('issued', 'in_progress')
    `;

        // 4. Tabela exam_answers
        console.log('→ Criando tabela exam_answers...');
        await sql`
      CREATE TABLE IF NOT EXISTS exam_answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL,
        answer_text TEXT NOT NULL,
        saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        final BOOLEAN NOT NULL DEFAULT FALSE,
        word_count INT,
        char_count INT
      )
    `;

        console.log('→ Criando índices exam_answers...');
        await sql`CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt_id ON exam_answers(attempt_id)`;
        await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_final_answer_per_question 
      ON exam_answers(attempt_id, question_id) 
      WHERE final = TRUE
    `;

        // 5. Tabela audit_events
        console.log('→ Criando tabela audit_events...');
        await sql`
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
      )
    `;

        console.log('→ Criando índices audit_events...');
        await sql`CREATE INDEX IF NOT EXISTS idx_audit_events_candidate_id ON audit_events(candidate_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_audit_events_attempt_id ON audit_events(attempt_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at)`;

        // 6. Triggers
        console.log('→ Configurando triggers...');
        await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

        await sql`
      DROP TRIGGER IF EXISTS trigger_exam_attempts_updated_at ON exam_attempts
    `;
        await sql`
      CREATE TRIGGER trigger_exam_attempts_updated_at
      BEFORE UPDATE ON exam_attempts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `;

        await sql`
      DROP TRIGGER IF EXISTS trigger_candidates_updated_at ON candidates
    `;
        await sql`
      CREATE TRIGGER trigger_candidates_updated_at
      BEFORE UPDATE ON candidates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `;

        console.log('✅ Migração concluída com sucesso!');
    } catch (error) {
        console.error('❌ Erro na migração:', error);
        process.exit(1);
    }
}

migrate();
