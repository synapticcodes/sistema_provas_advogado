/**
 * @fileoverview Endpoint público para submissão final da prova
 * POST /api/v1/exams/submit
 *
 * Chamado pela landing page para:
 * - Submeter as respostas finais
 * - Marcar a prova como concluída
 */
import type { Context } from '@netlify/functions';
import { sql } from './lib/db';
import { hashToken } from './lib/crypto';
import { submitSchema } from './lib/validators';
import { createRequestId, success, error, jsonResponse } from './lib/response';
import { logger } from './lib/logger';

interface IExamAttempt {
    id: string;
    candidate_id: string;
    status: string;
    expires_at: string | null;
    submitted_at: string | null;
    meta: Record<string, unknown>;
}

export default async (req: Request, _context: Context) => {
    const requestId = createRequestId();

    // Apenas POST
    if (req.method !== 'POST') {
        return jsonResponse(error('method_not_allowed', 'Use POST', requestId), 405);
    }

    try {
        const body = await req.json();
        const parsed = submitSchema.safeParse(body);

        if (!parsed.success) {
            return jsonResponse(
                error('validation_error', 'Dados inválidos', requestId, parsed.error.flatten()),
                400
            );
        }

        const { token, answers, client, is_auto_submit } = parsed.data;
        const tokenHash = hashToken(token);
        const now = new Date();

        // Buscar tentativa
        const attempts = await sql`
      SELECT id, candidate_id, status, expires_at, submitted_at, meta
      FROM exam_attempts
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    ` as IExamAttempt[];

        if (attempts.length === 0) {
            return jsonResponse(
                error('token_not_found', 'Token não encontrado', requestId),
                404
            );
        }

        const attempt = attempts[0];

        // Se já foi submetida, retornar sucesso (idempotência)
        if (attempt.status === 'submitted') {
            logger.info('Prova já submetida anteriormente', {
                request_id: requestId,
                attempt_id: attempt.id,
            });

            return jsonResponse(
                success(
                    {
                        attempt_id: attempt.id,
                        status: 'submitted',
                        submitted_at: attempt.submitted_at,
                        message: 'Prova já foi enviada anteriormente',
                    },
                    requestId
                )
            );
        }

        // Verificar status inválido
        if (attempt.status === 'invalidated') {
            return jsonResponse(
                error('token_invalidated', 'Este link foi invalidado', requestId),
                410
            );
        }

        // NOTA: Removemos a verificação estrita de 'expired' aqui para permitir o auto-submit
        // que pode chegar milissegundos após o tempo oficial de expiração.
        // O backend ainda deve aceitar a submissão se for um envio final legítimo.

        // Inserir respostas
        for (const answer of answers) {
            const wordCount = answer.answer_text.trim().split(/\s+/).filter(Boolean).length;
            const charCount = answer.answer_text.length;

            await sql`
        INSERT INTO exam_answers (attempt_id, question_id, answer_text, final, word_count, char_count)
        VALUES (${attempt.id}, ${answer.question_id}, ${answer.answer_text}, true, ${wordCount}, ${charCount})
        ON CONFLICT (attempt_id, question_id) WHERE final = TRUE
        DO UPDATE SET answer_text = EXCLUDED.answer_text,
                      word_count = EXCLUDED.word_count,
                      char_count = EXCLUDED.char_count,
                      saved_at = NOW()
      `;
        }

        // Atualizar status da tentativa
        const updatedMeta = {
            ...attempt.meta,
            client,
            is_auto_submit: !!is_auto_submit
        };

        await sql`
      UPDATE exam_attempts
      SET status = 'submitted',
          submitted_at = NOW(),
          meta = ${JSON.stringify(updatedMeta)},
          updated_at = NOW()
      WHERE id = ${attempt.id}
    `;

        // Registrar auditoria
        await sql`
      INSERT INTO audit_events (candidate_id, attempt_id, event_type, actor_type, request_id, payload)
      VALUES (
        ${attempt.candidate_id},
        ${attempt.id},
        'exam.submitted',
        'candidate',
        ${requestId},
        ${JSON.stringify({ answers_count: answers.length, is_auto_submit: !!is_auto_submit })}
      )
    `;

        logger.info('Prova submetida', {
            request_id: requestId,
            candidate_id: attempt.candidate_id,
            attempt_id: attempt.id,
            answers_count: answers.length,
            is_auto_submit: !!is_auto_submit,
            event: 'exam.submitted',
        });

        return jsonResponse(
            success(
                {
                    attempt_id: attempt.id,
                    status: 'submitted',
                    submitted_at: now.toISOString(),
                },
                requestId
            )
        );
    } catch (err) {
        logger.error('Erro ao submeter prova', {
            request_id: requestId,
            error: err instanceof Error ? err.message : String(err),
        });

        return jsonResponse(
            error('internal_error', 'Erro interno do servidor', requestId),
            500
        );
    }
};
