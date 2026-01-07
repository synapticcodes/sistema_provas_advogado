import { describe, it, expect } from 'vitest';
import { generateToken, hashToken, getTokenPrefix } from '../crypto';

describe('Crypto Utils', () => {
    it('should generate a token of correct length', () => {
        const token = generateToken();
        // 32 bytes base64url encoded is roughly 43 chars
        expect(token.length).toBeGreaterThan(40);
    });

    it('should generate unique tokens', () => {
        const token1 = generateToken();
        const token2 = generateToken();
        expect(token1).not.toBe(token2);
    });

    it('should hash token consistently', () => {
        const token = 'test-token-123';
        const hash1 = hashToken(token);
        const hash2 = hashToken(token);
        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64); // SHA-256 hex
    });

    it('should extract prefix correctly', () => {
        const token = 'abcdef1234567890';
        const prefix = getTokenPrefix(token);
        expect(prefix).toBe('abcdef12');
    });
});
