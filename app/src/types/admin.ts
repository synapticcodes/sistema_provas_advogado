/**
 * @fileoverview Tipos do painel admin
 */
import type { IQuestion } from './exam';

export type IAdminDecision = 'approve' | 'reject' | 'interview';

export interface IAdminReviewSummary {
    is_reviewed: boolean;
    decision: IAdminDecision | null;
    reviewed_at: string | null;
}

export interface IAdminSubmissionItem {
    attempt_id: string;
    candidate_id: string;
    candidate_label: string | null;
    status: string;
    submitted_at: string | null;
    is_auto_submit: boolean;
    answers_count: number;
    time_spent_seconds: number | null;
    review: IAdminReviewSummary;
}

export interface IAdminSubmissionsData {
    items: IAdminSubmissionItem[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
    };
}

export interface IAdminAttemptSummary {
    attempt_id: string;
    candidate_id: string;
    candidate_label: string | null;
    status: string;
    started_at: string | null;
    expires_at: string | null;
    submitted_at: string | null;
    is_auto_submit: boolean;
}

export interface IAdminExamPayload {
    version: string;
    scenario: { title: string; body_markdown: string } | null;
    questions: IQuestion[];
}

export interface IAdminAnswer {
    question_id: string;
    answer_text: string;
    char_count: number | null;
    word_count: number | null;
}

export interface IAdminReviewDetail extends IAdminReviewSummary {
    score: number | null;
    notes: string | null;
    reviewer_name: string | null;
}

export interface IAdminAttemptDetailData {
    attempt: IAdminAttemptSummary;
    exam: IAdminExamPayload;
    answers: IAdminAnswer[];
    review: IAdminReviewDetail;
}

export interface IAdminReviewPayload {
    decision: IAdminDecision;
    score?: number;
    notes?: string;
    reviewer_name?: string;
}

export interface IAdminReviewSaveData {
    attempt_id: string;
    reviewed: boolean;
    decision: IAdminDecision;
    reviewed_at: string;
}
