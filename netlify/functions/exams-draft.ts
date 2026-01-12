/**
 * @fileoverview Endpoint público para salvar rascunho (auto-save server-side)
 * POST /api/v1/exams/draft
 */
import type { Context } from '@netlify/functions';
import { sql } from './lib/db';
import { hashToken } from './lib/crypto';
import { draftSchema } from './lib/validators';
import { createRequestId, success, error, jsonResponse } from './lib/response';
import { logger } from './lib/logger';

interface IExamAttempt {
    id: string;
    candidate_id: string;
    status: string;
    expires_at: string | null;
}

export default async (req: Request, _context: Context) => {
    const requestId = createRequestId();

    if (req.method !== 'POST') {
        return jsonResponse(error('method_not_allowed', 'Use POST', requestId), 405);
    }

    try {
        const body = await req.json();
        const parsed = draftSchema.safeParse(body);

        if (!parsed.success) {
            return jsonResponse(
                error('validation_error', 'Dados inválidos', requestId, parsed.error.flatten()),
                400
            );
        }

        const { token, answers } = parsed.data;
        const tokenHash = hashToken(token);
        const now = new Date();

        // 1. Validar Token e Status
        const attempts = await sql`
      SELECT id, candidate_id, status, expires_at
      FROM public.exam_attempts
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    ` as IExamAttempt[];

        if (attempts.length === 0) {
            return jsonResponse(error('token_not_found', 'Token inválido', requestId), 404);
        }

        const attempt = attempts[0];

        // Não permitir salvar rascunho se já submetido ou expirado
        if (['submitted', 'expired', 'invalidated'].includes(attempt.status)) {
            return jsonResponse(
                error('invalid_state', `Prova com status: ${attempt.status}`, requestId),
                409
            );
        }

        if (attempt.expires_at && now > new Date(attempt.expires_at)) {
            return jsonResponse(error('expired', 'Prova expirada', requestId), 410);
        }

        // 2. Salvar respostas como rascunho (final = false)
        // Atualiza se já existir rascunho para a mesma questão
        for (const answer of answers) {
            const wordCount = answer.answer_text.trim().split(/\s+/).filter(Boolean).length;
            const charCount = answer.answer_text.length;

            await sql`
        INSERT INTO public.exam_answers (attempt_id, question_id, answer_text, final, word_count, char_count, saved_at)
        VALUES (${attempt.id}, ${answer.question_id}, ${answer.answer_text}, false, ${wordCount}, ${charCount}, NOW())
        ON CONFLICT (attempt_id, question_id) WHERE final = FALSE
        DO UPDATE SET answer_text = EXCLUDED.answer_text,
                      word_count = EXCLUDED.word_count,
                      char_count = EXCLUDED.char_count,
                      saved_at = NOW()
      `;
        }

        // Atualizar last_seen_at
        await sql`
      UPDATE public.exam_attempts
      SET last_seen_at = NOW(), updated_at = NOW()
      WHERE id = ${attempt.id}
    `;

        return jsonResponse(success({ saved: true, timestamp: now.toISOString() }, requestId));

    } catch (err) {
        logger.error('Erro ao salvar rascunho', {
            request_id: requestId,
            error: err instanceof Error ? err.message : String(err),
        });
        return jsonResponse(error('internal_error', 'Erro interno', requestId), 500);
    }
};
