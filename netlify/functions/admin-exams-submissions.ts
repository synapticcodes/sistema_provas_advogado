/**
 * @fileoverview Endpoint admin para listar provas submetidas
 * GET /api/v1/admin/exams/submissions
 */
import type { Context } from '@netlify/functions';
import { sql } from './lib/db';
import { validateAdminAuth } from './lib/auth';
import { createRequestId, success, error, jsonResponse } from './lib/response';
import { logger } from './lib/logger';

interface ISubmissionRow {
    attempt_id: string;
    candidate_id: string;
    candidate_label: string | null;
    status: string;
    submitted_at: string | null;
    is_auto_submit: boolean | null;
    answers_count: number | string | null;
    time_spent_seconds: number | string | null;
    decision: string | null;
    reviewed_at: string | null;
}

export default async (req: Request, _context: Context) => {
    const requestId = createRequestId();

    if (req.method !== 'GET') {
        return jsonResponse(error('method_not_allowed', 'Use GET', requestId), 405);
    }

    const authError = validateAdminAuth(req);
    if (authError) return authError;

    try {
        const url = new URL(req.url);
        const reviewParam = url.searchParams.get('review') || 'pending';
        const limitParam = Number(url.searchParams.get('limit') || 50);
        const offsetParam = Number(url.searchParams.get('offset') || 0);

        const review = ['pending', 'reviewed', 'all'].includes(reviewParam)
            ? reviewParam
            : 'pending';

        const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;
        const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0;

        let items: ISubmissionRow[] = [];
        let total = 0;

        if (review === 'pending') {
            const totals = await sql`
                SELECT COUNT(*)::int AS total
                FROM public.exam_attempts a
                LEFT JOIN public.exam_reviews r ON r.attempt_id = a.id
                WHERE a.status = 'submitted'
                  AND r.id IS NULL
            ` as { total: number }[];
            total = totals[0]?.total || 0;

            items = await sql`
                SELECT
                  a.id AS attempt_id,
                  a.candidate_id,
                  COALESCE(c.lead_nome, c.candidate_email, a.candidate_id::text) AS candidate_label,
                  a.status,
                  a.submitted_at,
                  COALESCE((a.meta->>'is_auto_submit')::boolean, false) AS is_auto_submit,
                  COALESCE(ans.answers_count, 0) AS answers_count,
                  CASE
                    WHEN a.started_at IS NOT NULL AND a.submitted_at IS NOT NULL
                      THEN FLOOR(EXTRACT(EPOCH FROM (a.submitted_at - a.started_at)))::int
                    ELSE NULL
                  END AS time_spent_seconds,
                  r.decision,
                  r.reviewed_at
                FROM public.exam_attempts a
                JOIN public.candidates c ON c.id = a.candidate_id
                LEFT JOIN (
                  SELECT attempt_id, COUNT(*) AS answers_count
                  FROM public.exam_answers
                  WHERE final = TRUE
                  GROUP BY attempt_id
                ) ans ON ans.attempt_id = a.id
                LEFT JOIN public.exam_reviews r ON r.attempt_id = a.id
                WHERE a.status = 'submitted'
                  AND r.id IS NULL
                ORDER BY a.submitted_at DESC NULLS LAST
                LIMIT ${limit} OFFSET ${offset}
            ` as ISubmissionRow[];
        } else if (review === 'reviewed') {
            const totals = await sql`
                SELECT COUNT(*)::int AS total
                FROM public.exam_attempts a
                JOIN public.exam_reviews r ON r.attempt_id = a.id
                WHERE a.status = 'submitted'
            ` as { total: number }[];
            total = totals[0]?.total || 0;

            items = await sql`
                SELECT
                  a.id AS attempt_id,
                  a.candidate_id,
                  COALESCE(c.lead_nome, c.candidate_email, a.candidate_id::text) AS candidate_label,
                  a.status,
                  a.submitted_at,
                  COALESCE((a.meta->>'is_auto_submit')::boolean, false) AS is_auto_submit,
                  COALESCE(ans.answers_count, 0) AS answers_count,
                  CASE
                    WHEN a.started_at IS NOT NULL AND a.submitted_at IS NOT NULL
                      THEN FLOOR(EXTRACT(EPOCH FROM (a.submitted_at - a.started_at)))::int
                    ELSE NULL
                  END AS time_spent_seconds,
                  r.decision,
                  r.reviewed_at
                FROM public.exam_attempts a
                JOIN public.candidates c ON c.id = a.candidate_id
                LEFT JOIN (
                  SELECT attempt_id, COUNT(*) AS answers_count
                  FROM public.exam_answers
                  WHERE final = TRUE
                  GROUP BY attempt_id
                ) ans ON ans.attempt_id = a.id
                JOIN public.exam_reviews r ON r.attempt_id = a.id
                WHERE a.status = 'submitted'
                ORDER BY a.submitted_at DESC NULLS LAST
                LIMIT ${limit} OFFSET ${offset}
            ` as ISubmissionRow[];
        } else {
            const totals = await sql`
                SELECT COUNT(*)::int AS total
                FROM public.exam_attempts a
                LEFT JOIN public.exam_reviews r ON r.attempt_id = a.id
                WHERE a.status = 'submitted'
            ` as { total: number }[];
            total = totals[0]?.total || 0;

            items = await sql`
                SELECT
                  a.id AS attempt_id,
                  a.candidate_id,
                  COALESCE(c.lead_nome, c.candidate_email, a.candidate_id::text) AS candidate_label,
                  a.status,
                  a.submitted_at,
                  COALESCE((a.meta->>'is_auto_submit')::boolean, false) AS is_auto_submit,
                  COALESCE(ans.answers_count, 0) AS answers_count,
                  CASE
                    WHEN a.started_at IS NOT NULL AND a.submitted_at IS NOT NULL
                      THEN FLOOR(EXTRACT(EPOCH FROM (a.submitted_at - a.started_at)))::int
                    ELSE NULL
                  END AS time_spent_seconds,
                  r.decision,
                  r.reviewed_at
                FROM public.exam_attempts a
                JOIN public.candidates c ON c.id = a.candidate_id
                LEFT JOIN (
                  SELECT attempt_id, COUNT(*) AS answers_count
                  FROM public.exam_answers
                  WHERE final = TRUE
                  GROUP BY attempt_id
                ) ans ON ans.attempt_id = a.id
                LEFT JOIN public.exam_reviews r ON r.attempt_id = a.id
                WHERE a.status = 'submitted'
                ORDER BY a.submitted_at DESC NULLS LAST
                LIMIT ${limit} OFFSET ${offset}
            ` as ISubmissionRow[];
        }

        const formattedItems = items.map((row) => ({
            attempt_id: row.attempt_id,
            candidate_id: row.candidate_id,
            candidate_label: row.candidate_label,
            status: row.status,
            submitted_at: row.submitted_at,
            is_auto_submit: !!row.is_auto_submit,
            answers_count: Number(row.answers_count || 0),
            time_spent_seconds:
                row.time_spent_seconds === null ? null : Number(row.time_spent_seconds),
            review: {
                is_reviewed: !!row.decision,
                decision: row.decision,
                reviewed_at: row.reviewed_at,
            },
        }));

        return jsonResponse(
            success(
                {
                    items: formattedItems,
                    pagination: { limit, offset, total },
                },
                requestId
            )
        );
    } catch (err) {
        logger.error('Erro ao listar submissões', {
            request_id: requestId,
            error: err instanceof Error ? err.message : String(err),
        });

        return jsonResponse(
            error('internal_error', 'Erro interno do servidor', requestId),
            500
        );
    }
};
