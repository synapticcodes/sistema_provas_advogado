import { describe, it, expect } from 'vitest';
import { issueLinkSchema, submitSchema, reviewSchema } from '../validators';

describe('Validators', () => {
    describe('issueLinkSchema', () => {
        it('should validate correct input', () => {
            const input = {
                candidate_id: '123e4567-e89b-12d3-a456-426614174000',
                force_new: true,
                ttl_hours: 48,
            };
            const result = issueLinkSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('should reject invalid uuid', () => {
            const input = {
                candidate_id: 'invalid-id',
            };
            const result = issueLinkSchema.safeParse(input);
            expect(result.success).toBe(false);
        });

        it('should use default values', () => {
            const input = {
                candidate_id: '123e4567-e89b-12d3-a456-426614174000',
            };
            const result = issueLinkSchema.safeParse(input);
            if (result.success) {
                expect(result.data.force_new).toBe(false);
                expect(result.data.ttl_hours).toBe(72);
            }
        });
    });

    describe('submitSchema', () => {
        it('should validate minimal correct input', () => {
            const input = {
                token: 'a'.repeat(30),
                answers: [{ question_id: 'Q1', answer_text: 'Answer' }],
            };
            const result = submitSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('should reject short token', () => {
            const input = {
                token: 'short',
                answers: [],
            };
            const result = submitSchema.safeParse(input);
            expect(result.success).toBe(false);
        });
    });

    describe('reviewSchema', () => {
        it('should validate correct review input', () => {
            const input = {
                decision: 'approve',
                score: 90,
                notes: 'Boa estratégia',
                reviewer_name: 'Admin',
            };
            const result = reviewSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('should reject invalid decision', () => {
            const input = {
                decision: 'maybe',
            };
            const result = reviewSchema.safeParse(input);
            expect(result.success).toBe(false);
        });

        it('should reject out of range score', () => {
            const input = {
                decision: 'reject',
                score: 120,
            };
            const result = reviewSchema.safeParse(input);
            expect(result.success).toBe(false);
        });
    });
});
