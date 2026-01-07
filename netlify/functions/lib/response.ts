/**
 * @fileoverview Utilitários para respostas JSON padronizadas
 */
import { randomUUID } from 'crypto';

/**
 * Interface de resposta padrão da API
 */
export interface IApiResponse<T> {
    ok: boolean;
    data: T | null;
    error: { code: string; message: string; details?: unknown } | null;
    request_id: string;
}

/**
 * Gera um ID único para rastreamento de requests
 */
export function createRequestId(): string {
    return `req_${randomUUID().slice(0, 8)}`;
}

/**
 * Cria resposta de sucesso
 */
export function success<T>(data: T, requestId: string): IApiResponse<T> {
    return {
        ok: true,
        data,
        error: null,
        request_id: requestId,
    };
}

/**
 * Cria resposta de erro
 */
export function error(
    code: string,
    message: string,
    requestId: string,
    details?: unknown
): IApiResponse<null> {
    return {
        ok: false,
        data: null,
        error: { code, message, details },
        request_id: requestId,
    };
}

/**
 * Cria Response HTTP com headers de segurança
 */
export function jsonResponse<T>(
    body: IApiResponse<T>,
    status = 200,
    extraHeaders?: Record<string, string>
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer',
            ...extraHeaders,
        },
    });
}
