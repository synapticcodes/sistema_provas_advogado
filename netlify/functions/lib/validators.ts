/**
 * @fileoverview Schemas de validação Zod para endpoints
 */
import { z } from 'zod';

/**
 * Schema para emissão de magic link (endpoint interno)
 */
export const issueLinkSchema = z.object({
    candidate_id: z.string().uuid('ID do candidato deve ser um UUID válido'),
    force_new: z.boolean().default(false),
    ttl_hours: z.number().int().min(1).max(168).default(72),
});

export type IIssueLinkInput = z.infer<typeof issueLinkSchema>;

/**
 * Schema para submissão de prova
 */
export const submitSchema = z.object({
    token: z.string().min(20, 'Token inválido'),
    answers: z.array(
        z.object({
            question_id: z.string().min(1, 'ID da questão é obrigatório'),
            answer_text: z.string(),
        })
    ),
    client: z
        .object({
            user_agent: z.string().optional(),
            timezone: z.string().optional(),
        })
        .optional(),
    is_auto_submit: z.boolean().optional(),
});

export type ISubmitInput = z.infer<typeof submitSchema>;

/**
 * Schema para salvamento de rascunho
 */
export const draftSchema = z.object({
    token: z.string().min(20, 'Token inválido'),
    answers: z.array(
        z.object({
            question_id: z.string().min(1),
            answer_text: z.string(),
        })
    ),
});

export type IDraftInput = z.infer<typeof draftSchema>;

/**
 * Schema para avaliação administrativa
 */
export const reviewSchema = z.object({
    decision: z.enum(['approve', 'reject', 'interview']),
    score: z.number().int().min(0).max(100).optional(),
    notes: z.string().optional(),
    reviewer_name: z.string().optional(),
});

export type IReviewInput = z.infer<typeof reviewSchema>;
