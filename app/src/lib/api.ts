/**
 * @fileoverview Cliente API para comunicação com o backend
 */
import type { IApiResponse, ISessionData, ISubmitData } from '../types/exam';

const API_BASE = '/api/v1';

/**
 * Obtém a sessão da prova (valida token e inicia timer se necessário)
 */
export async function getSession(token: string): Promise<IApiResponse<ISessionData>> {
    const response = await fetch(`${API_BASE}/exams/session?token=${encodeURIComponent(token)}`);
    return response.json();
}

/**
 * Submete as respostas finais da prova
 */
export async function submitExam(
    token: string,
    answers: Array<{ question_id: string; answer_text: string }>,
    isAutoSubmit?: boolean
): Promise<IApiResponse<ISubmitData>> {
    const response = await fetch(`${API_BASE}/exams/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            token,
            answers,
            client: {
                user_agent: navigator.userAgent,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            is_auto_submit: isAutoSubmit,
        }),
    });
    return response.json();
}
