/**
 * @fileoverview Middleware de autenticação para endpoints internos
 */
import { error, jsonResponse, createRequestId } from './response';

/**
 * Valida a API key para endpoints internos
 * @param request - Request HTTP
 * @returns null se autenticado, Response de erro se não
 */
export function validateInternalAuth(request: Request): Response | null {
    const apiKey = request.headers.get('X-Internal-API-Key');
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!apiKey || apiKey !== expectedKey) {
        const requestId = createRequestId();
        return jsonResponse(
            error('unauthorized', 'API key inválida ou ausente', requestId),
            401
        );
    }

    return null;
}

/**
 * Valida Basic Auth para endpoints administrativos
 * @param request - Request HTTP
 * @returns null se autenticado, Response de erro se não
 */
export function validateAdminAuth(request: Request): Response | null {
    const expectedAuth =
        process.env.ADMIN_BASIC_AUTH ||
        (process.env.ADMIN_BASIC_USER && process.env.ADMIN_BASIC_PASSWORD
            ? `${process.env.ADMIN_BASIC_USER}:${process.env.ADMIN_BASIC_PASSWORD}`
            : null);

    if (!expectedAuth) {
        const requestId = createRequestId();
        return jsonResponse(
            error('admin_auth_not_configured', 'Autenticação admin não configurada', requestId),
            500
        );
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        const requestId = createRequestId();
        return jsonResponse(
            error('unauthorized', 'Credenciais ausentes', requestId),
            401,
            { 'WWW-Authenticate': 'Basic realm="Admin"' }
        );
    }

    let decoded = '';
    try {
        decoded = Buffer.from(authHeader.slice('Basic '.length).trim(), 'base64').toString('utf-8');
    } catch {
        const requestId = createRequestId();
        return jsonResponse(
            error('unauthorized', 'Credenciais inválidas', requestId),
            401,
            { 'WWW-Authenticate': 'Basic realm="Admin"' }
        );
    }

    if (decoded !== expectedAuth) {
        const requestId = createRequestId();
        return jsonResponse(
            error('unauthorized', 'Credenciais inválidas', requestId),
            401,
            { 'WWW-Authenticate': 'Basic realm="Admin"' }
        );
    }

    return null;
}
