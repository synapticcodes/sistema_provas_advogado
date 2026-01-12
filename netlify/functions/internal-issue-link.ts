/**
 * @fileoverview Endpoint interno para emissão de Magic Link
 * POST /api/v1/internal/exams/issue-link
 *
 * Chamado pelo orquestrador (n8n) quando um candidato é aprovado na triagem.
 */
import type { Context } from '@netlify/functions';
import { sql } from './lib/db';
import { generateToken, hashToken, getTokenPrefix } from './lib/crypto';
import { EXAM_VERSION } from './lib/questions';
import { issueLinkSchema } from './lib/validators';
import {
    createRequestId,
    success,
    error,
    jsonResponse,
} from './lib/response';
import { validateInternalAuth } from './lib/auth';
import { logger } from './lib/logger';

interface IExamAttempt {
    id: string;
    candidate_id: string;
    status: string;
    issued_at: string;
}

export default async (req: Request, _context: Context) => {
    const requestId = createRequestId();

    // Apenas POST
    if (req.method !== 'POST') {
        return jsonResponse(
            error('method_not_allowed', 'Use POST', requestId),
            405
        );
    }

    // Validar autenticação interna
    const authError = validateInternalAuth(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const parsed = issueLinkSchema.safeParse(body);

        if (!parsed.success) {
            logger.warn('Validação falhou', {
                request_id: requestId,
                errors: parsed.error.flatten(),
            });
            return jsonResponse(
                error('validation_error', 'Dados inválidos', requestId, parsed.error.flatten()),
                400
            );
        }

        const { candidate_id, force_new, ttl_hours } = parsed.data;

        // Verificar se candidato existe
        const candidates = await sql`
      SELECT id FROM public.candidates WHERE id = ${candidate_id}
    `;

        if (candidates.length === 0) {
            return jsonResponse(
                error('candidate_not_found', 'Candidato não encontrado', requestId),
                404
            );
        }

        // Verificar tentativa ativa existente
        const existingAttempts = await sql`
      SELECT id, status, issued_at
      FROM public.exam_attempts
      WHERE candidate_id = ${candidate_id}
        AND status IN ('issued', 'in_progress')
      LIMIT 1
    ` as IExamAttempt[];

        if (existingAttempts.length > 0 && !force_new) {
            logger.info('Tentativa ativa já existe', {
                request_id: requestId,
                candidate_id,
                attempt_id: existingAttempts[0].id,
            });

            return jsonResponse(
                error(
                    'active_attempt_exists',
                    'Já existe uma tentativa ativa. Use force_new=true para invalidar.',
                    requestId,
                    { attempt_id: existingAttempts[0].id }
                ),
                409
            );
        }

        // Invalidar tentativa anterior se force_new
        if (existingAttempts.length > 0 && force_new) {
            const oldAttempt = existingAttempts[0];

            await sql`
        UPDATE public.exam_attempts
        SET status = 'invalidated', updated_at = NOW()
        WHERE id = ${oldAttempt.id}
      `;

            await sql`
        INSERT INTO public.audit_events (candidate_id, attempt_id, event_type, actor_type, request_id)
        VALUES (${candidate_id}, ${oldAttempt.id}, 'exam.link_invalidated', 'orchestrator', ${requestId})
      `;

            logger.info('Tentativa anterior invalidada', {
                request_id: requestId,
                candidate_id,
                old_attempt_id: oldAttempt.id,
            });
        }

        // Gerar novo token
        const token = generateToken();
        const tokenHash = hashToken(token);
        const tokenPrefix = getTokenPrefix(token);

        // Criar nova tentativa
        const newAttempts = await sql`
      INSERT INTO public.exam_attempts (candidate_id, token_hash, token_prefix, status, meta)
      VALUES (${candidate_id}, ${tokenHash}, ${tokenPrefix}, 'issued', ${JSON.stringify({ ttl_hours, exam_version: EXAM_VERSION })})
      RETURNING id, issued_at
    ` as { id: string; issued_at: string }[];

        const newAttempt = newAttempts[0];

        // Registrar evento de auditoria
        await sql`
      INSERT INTO public.audit_events (candidate_id, attempt_id, event_type, actor_type, request_id)
      VALUES (${candidate_id}, ${newAttempt.id}, 'exam.link_issued', 'orchestrator', ${requestId})
    `;

        const examUrl = `${process.env.APP_PUBLIC_BASE_URL}/prova/${token}`;
        const linkExpiresAt = new Date(Date.now() + ttl_hours * 60 * 60 * 1000);

        logger.info('Magic link emitido', {
            request_id: requestId,
            candidate_id,
            attempt_id: newAttempt.id,
            event: 'exam.link_issued',
        });

        return jsonResponse(
            success(
                {
                    attempt_id: newAttempt.id,
                    candidate_id,
                    exam_url: examUrl,
                    issued_at: newAttempt.issued_at,
                    link_expires_at: linkExpiresAt.toISOString(),
                    status: 'issued',
                },
                requestId
            )
        );
    } catch (err) {
        logger.error('Erro ao emitir magic link', {
            request_id: requestId,
            error: err instanceof Error ? err.message : String(err),
        });

        return jsonResponse(
            error('internal_error', 'Erro interno do servidor', requestId),
            500
        );
    }
};
