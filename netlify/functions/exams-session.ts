/**
 * @fileoverview Endpoint público para validar token e iniciar/retomar sessão
 * GET /api/v1/exams/session?token=...
 *
 * Chamado pela landing page no carregamento para:
 * - Validar o token
 * - Iniciar o timer (se primeiro acesso)
 * - Retornar questões e tempo restante
 */
import type { Context } from '@netlify/functions';
import { sql } from './lib/db';
import { hashToken } from './lib/crypto';
import { createRequestId, success, error, jsonResponse } from './lib/response';
import { logger } from './lib/logger';
import { EXAM_QUESTIONS, EXAM_DURATION_MS } from './lib/questions';

interface IExamAttempt {
    id: string;
    candidate_id: string;
    status: string;
    started_at: string | null;
    expires_at: string | null;
}

export default async (req: Request, _context: Context) => {
    const requestId = createRequestId();

    // Apenas GET
    if (req.method !== 'GET') {
        return jsonResponse(error('method_not_allowed', 'Use GET', requestId), 405);
    }

    try {
        const url = new URL(req.url);
        const token = url.searchParams.get('token');

        if (!token || token.length < 20) {
            return jsonResponse(
                error('invalid_token_format', 'Formato de token inválido', requestId),
                400
            );
        }

        const tokenHash = hashToken(token);
        const now = new Date();

        // Buscar tentativa pelo hash
        const attempts = await sql`
      SELECT id, candidate_id, status, started_at, expires_at
      FROM public.exam_attempts
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    ` as IExamAttempt[];

        if (attempts.length === 0) {
            logger.warn('Token não encontrado', { request_id: requestId });
            return jsonResponse(
                error('token_not_found', 'Token não encontrado', requestId),
                404
            );
        }

        const attempt = attempts[0];

        // Verificar status
        if (attempt.status === 'submitted') {
            return jsonResponse(
                error('already_submitted', 'Prova já foi enviada', requestId),
                409
            );
        }

        if (attempt.status === 'invalidated') {
            return jsonResponse(
                error('token_invalidated', 'Este link foi invalidado', requestId),
                410
            );
        }

        if (attempt.status === 'expired') {
            return jsonResponse(
                error('expired', 'O tempo da prova expirou', requestId),
                410
            );
        }

        // Verificar expiração (se já iniciou)
        if (attempt.expires_at && now > new Date(attempt.expires_at)) {
            await sql`
        UPDATE public.exam_attempts
        SET status = 'expired', updated_at = NOW()
        WHERE id = ${attempt.id}
      `;

            await sql`
        INSERT INTO public.audit_events (candidate_id, attempt_id, event_type, actor_type, request_id)
        VALUES (${attempt.candidate_id}, ${attempt.id}, 'exam.expired', 'system', ${requestId})
      `;

            return jsonResponse(
                error('expired', 'O tempo da prova expirou', requestId, {
                    expires_at: attempt.expires_at,
                }),
                410
            );
        }

        let startedAt = attempt.started_at ? new Date(attempt.started_at) : null;
        let expiresAt = attempt.expires_at ? new Date(attempt.expires_at) : null;
        let status = attempt.status;

        // Se é o primeiro acesso (status = issued), iniciar timer
        if (attempt.status === 'issued') {
            startedAt = now;
            expiresAt = new Date(now.getTime() + EXAM_DURATION_MS);
            status = 'in_progress';

            await sql`
        UPDATE public.exam_attempts
        SET started_at = ${startedAt.toISOString()},
            expires_at = ${expiresAt.toISOString()},
            status = 'in_progress',
            last_seen_at = NOW(),
            updated_at = NOW()
        WHERE id = ${attempt.id}
      `;

            await sql`
        INSERT INTO public.audit_events (candidate_id, attempt_id, event_type, actor_type, request_id)
        VALUES (${attempt.candidate_id}, ${attempt.id}, 'exam.started', 'candidate', ${requestId})
      `;

            logger.info('Prova iniciada', {
                request_id: requestId,
                candidate_id: attempt.candidate_id,
                attempt_id: attempt.id,
                event: 'exam.started',
            });
        } else {
            // Atualizar last_seen
            await sql`
        UPDATE public.exam_attempts
        SET last_seen_at = NOW(), updated_at = NOW()
        WHERE id = ${attempt.id}
      `;
        }

        const timeRemainingSeconds = expiresAt
            ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
            : 0;

        return jsonResponse(
            success(
                {
                    attempt_id: attempt.id,
                    candidate_id: attempt.candidate_id,
                    status,
                    server_time: now.toISOString(),
                    started_at: startedAt?.toISOString() || null,
                    expires_at: expiresAt?.toISOString() || null,
                    time_remaining_seconds: timeRemainingSeconds,
                    questions: EXAM_QUESTIONS,
                    ui_hints: { autosave_local: true },
                },
                requestId
            )
        );
    } catch (err) {
        logger.error('Erro ao obter sessão', {
            request_id: requestId,
            error: err instanceof Error ? err.message : String(err),
        });

        return jsonResponse(
            error('internal_error', 'Erro interno do servidor', requestId),
            500
        );
    }
};
