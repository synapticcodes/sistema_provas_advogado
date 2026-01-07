/**
 * @fileoverview Endpoint admin para detalhe de tentativa e review
 * GET  /api/v1/admin/exams/attempt/:attempt_id
 * POST /api/v1/admin/exams/attempt/:attempt_id/review
 */
import type { Context } from '@netlify/functions';
import { sql } from './lib/db';
import { validateAdminAuth } from './lib/auth';
import { createRequestId, success, error, jsonResponse } from './lib/response';
import { logger } from './lib/logger';
import { EXAM_QUESTIONS, EXAM_VERSION } from './lib/questions';
import { reviewSchema } from './lib/validators';

interface IAttemptRow {
    attempt_id: string;
    candidate_id: string;
    candidate_label: string | null;
    status: string;
    started_at: string | null;
    expires_at: string | null;
    submitted_at: string | null;
    is_auto_submit: boolean | null;
}

interface IReviewRow {
    decision: string | null;
    score: number | null;
    notes: string | null;
    reviewer_name: string | null;
    reviewed_at: string | null;
}

interface IAnswerRow {
    question_id: string;
    answer_text: string;
    word_count: number | null;
    char_count: number | null;
}

function extractAttemptId(pathname: string): { attemptId: string | null; isReview: boolean } {
    const parts = pathname.split('/').filter(Boolean);
    const attemptIndex = parts.lastIndexOf('attempt');
    if (attemptIndex === -1) return { attemptId: null, isReview: false };
    const attemptId = parts[attemptIndex + 1] || null;
    const isReview = parts[attemptIndex + 2] === 'review';
    return { attemptId, isReview };
}

export default async (req: Request, _context: Context) => {
    const requestId = createRequestId();

    const authError = validateAdminAuth(req);
    if (authError) return authError;

    const url = new URL(req.url);
    const { attemptId, isReview } = extractAttemptId(url.pathname);

    if (!attemptId) {
        return jsonResponse(error('missing_param', 'attempt_id obrigatório', requestId), 400);
    }

    if (req.method === 'GET') {
        if (isReview) {
            return jsonResponse(error('method_not_allowed', 'Use POST', requestId), 405);
        }

        try {
            const attempts = await sql`
                SELECT
                  a.id AS attempt_id,
                  a.candidate_id,
                  COALESCE(c.lead_nome, c.candidate_email, a.candidate_id::text) AS candidate_label,
                  a.status,
                  a.started_at,
                  a.expires_at,
                  a.submitted_at,
                  COALESCE((a.meta->>'is_auto_submit')::boolean, false) AS is_auto_submit
                FROM exam_attempts a
                JOIN candidates c ON c.id = a.candidate_id
                WHERE a.id = ${attemptId}
                LIMIT 1
            ` as IAttemptRow[];

            if (attempts.length === 0) {
                return jsonResponse(
                    error('not_found', 'Tentativa não encontrada', requestId),
                    404
                );
            }

            const answers = await sql`
                SELECT question_id, answer_text, word_count, char_count
                FROM exam_answers
                WHERE attempt_id = ${attemptId}
                  AND final = TRUE
                ORDER BY question_id
            ` as IAnswerRow[];

            const reviews = await sql`
                SELECT decision, score, notes, reviewer_name, reviewed_at
                FROM exam_reviews
                WHERE attempt_id = ${attemptId}
                LIMIT 1
            ` as IReviewRow[];

            const review = reviews[0] || null;
            const scenario = EXAM_QUESTIONS.find((question) => question.type === 'scenario');
            const questions = EXAM_QUESTIONS.filter((question) => question.type !== 'scenario');

            return jsonResponse(
                success(
                    {
                        attempt: attempts[0],
                        exam: {
                            version: EXAM_VERSION,
                            scenario: scenario
                                ? { title: scenario.title, body_markdown: scenario.prompt }
                                : null,
                            questions,
                        },
                        answers,
                        review: {
                            is_reviewed: !!review?.decision,
                            decision: review?.decision ?? null,
                            score: review?.score ?? null,
                            notes: review?.notes ?? null,
                            reviewer_name: review?.reviewer_name ?? null,
                            reviewed_at: review?.reviewed_at ?? null,
                        },
                    },
                    requestId
                )
            );
        } catch (err) {
            logger.error('Erro ao carregar tentativa', {
                request_id: requestId,
                error: err instanceof Error ? err.message : String(err),
            });

            return jsonResponse(
                error('internal_error', 'Erro interno do servidor', requestId),
                500
            );
        }
    }

    if (req.method === 'POST') {
        if (!isReview) {
            return jsonResponse(error('method_not_allowed', 'Use GET', requestId), 405);
        }

        try {
            const body = await req.json();
            const parsed = reviewSchema.safeParse(body);

            if (!parsed.success) {
                return jsonResponse(
                    error('validation_error', 'Dados inválidos', requestId, parsed.error.flatten()),
                    400
                );
            }

            const { decision, score, notes, reviewer_name } = parsed.data;

            const attempts = await sql`
                SELECT id, candidate_id, status
                FROM exam_attempts
                WHERE id = ${attemptId}
                LIMIT 1
            ` as { id: string; candidate_id: string; status: string }[];

            if (attempts.length === 0) {
                return jsonResponse(
                    error('not_found', 'Tentativa não encontrada', requestId),
                    404
                );
            }

            const attempt = attempts[0];

            if (attempt.status !== 'submitted') {
                return jsonResponse(
                    error('invalid_state', 'Tentativa não está submetida', requestId),
                    409
                );
            }

            const reviews = await sql`
                INSERT INTO exam_reviews (attempt_id, candidate_id, decision, score, notes, reviewer_name, reviewed_at)
                VALUES (
                  ${attempt.id},
                  ${attempt.candidate_id},
                  ${decision},
                  ${score ?? null},
                  ${notes ?? null},
                  ${reviewer_name ?? null},
                  NOW()
                )
                ON CONFLICT (attempt_id) DO UPDATE
                SET decision = EXCLUDED.decision,
                    score = EXCLUDED.score,
                    notes = EXCLUDED.notes,
                    reviewer_name = EXCLUDED.reviewer_name,
                    reviewed_at = NOW(),
                    updated_at = NOW()
                RETURNING decision, reviewed_at
            ` as { decision: string; reviewed_at: string }[];

            await sql`
                INSERT INTO audit_events (candidate_id, attempt_id, event_type, actor_type, request_id, payload)
                VALUES (
                  ${attempt.candidate_id},
                  ${attempt.id},
                  'exam.review_saved',
                  'admin',
                  ${requestId},
                  ${JSON.stringify({ decision, score: score ?? null, reviewer_name: reviewer_name ?? null })}
                )
            `;

            return jsonResponse(
                success(
                    {
                        attempt_id: attempt.id,
                        reviewed: true,
                        decision: reviews[0]?.decision,
                        reviewed_at: reviews[0]?.reviewed_at,
                    },
                    requestId
                )
            );
        } catch (err) {
            logger.error('Erro ao salvar review', {
                request_id: requestId,
                error: err instanceof Error ? err.message : String(err),
            });

            return jsonResponse(
                error('internal_error', 'Erro interno do servidor', requestId),
                500
            );
        }
    }

    return jsonResponse(error('method_not_allowed', 'Use GET ou POST', requestId), 405);
};
