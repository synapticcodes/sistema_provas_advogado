/**
 * @fileoverview Endpoint interno para consultar status do candidato
 * GET /api/v1/internal/exams/status?candidate_id=...
 */
import type { Context } from '@netlify/functions';
import { sql } from './lib/db';
import { validateInternalAuth } from './lib/auth';
import { createRequestId, success, error, jsonResponse } from './lib/response';
import { logger } from './lib/logger';

interface IExamStatus {
    id: string;
    status: string;
    issued_at: string;
    started_at: string | null;
    expires_at: string | null;
    submitted_at: string | null;
    exam_url?: string;
}

export default async (req: Request, _context: Context) => {
    const requestId = createRequestId();

    if (req.method !== 'GET') {
        return jsonResponse(error('method_not_allowed', 'Use GET', requestId), 405);
    }

    // Auth Interna
    const authError = validateInternalAuth(req);
    if (authError) return authError;

    const url = new URL(req.url);
    const candidateId = url.searchParams.get('candidate_id');

    if (!candidateId) {
        return jsonResponse(error('missing_param', 'candidate_id obrigatório', requestId), 400);
    }

    try {
        // Buscar última tentativa do candidato
        const attempts = await sql`
      SELECT id, status, issued_at, started_at, expires_at, submitted_at
      FROM exam_attempts
      WHERE candidate_id = ${candidateId}
      ORDER BY created_at DESC
      LIMIT 1
    ` as IExamStatus[];

        if (attempts.length === 0) {
            return jsonResponse(error('not_found', 'Nenhuma prova encontrada para este candidato', requestId), 404);
        }

        const attempt = attempts[0];
        const responseData = { ...attempt };

        return jsonResponse(success(responseData, requestId));

    } catch (err) {
        logger.error('Erro ao consultar status', {
            request_id: requestId,
            error: err instanceof Error ? err.message : String(err),
        });
        return jsonResponse(error('internal_error', 'Erro interno', requestId), 500);
    }
};
