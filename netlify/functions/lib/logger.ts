/**
 * @fileoverview Logging estruturado para observabilidade
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface ILogContext {
    request_id?: string;
    candidate_id?: string;
    attempt_id?: string;
    event?: string;
    route?: string;
    [key: string]: unknown;
}

/**
 * Logger estruturado que emite JSON
 */
export function log(
    level: LogLevel,
    message: string,
    context: ILogContext = {}
): void {
    const logEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...context,
    };

    // Em produção, emite JSON; em dev, formata para legibilidade
    if (process.env.NODE_ENV === 'production') {
        console[level](JSON.stringify(logEntry));
    } else {
        console[level](`[${level.toUpperCase()}] ${message}`, context);
    }
}

export const logger = {
    info: (message: string, context?: ILogContext) => log('info', message, context),
    warn: (message: string, context?: ILogContext) => log('warn', message, context),
    error: (message: string, context?: ILogContext) => log('error', message, context),
    debug: (message: string, context?: ILogContext) => log('debug', message, context),
};
