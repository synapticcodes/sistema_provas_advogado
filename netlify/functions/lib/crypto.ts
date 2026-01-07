/**
 * @fileoverview Utilitários de criptografia para tokens
 */
import { randomBytes, createHash } from 'crypto';

/**
 * Gera um token seguro de 32 bytes em base64url
 * @returns Token único e imprevisível
 */
export function generateToken(): string {
    return randomBytes(32).toString('base64url');
}

/**
 * Calcula o hash SHA-256 do token para armazenamento seguro
 * @param token - Token em texto plano
 * @returns Hash hexadecimal do token
 */
export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

/**
 * Extrai o prefixo do token para identificação em suporte
 * @param token - Token em texto plano
 * @returns Primeiros 8 caracteres do token
 */
export function getTokenPrefix(token: string): string {
    return token.slice(0, 8);
}
