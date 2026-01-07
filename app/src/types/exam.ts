/**
 * @fileoverview Tipos compartilhados do sistema de prova
 */

/**
 * Item de verdadeiro ou falso
 */
export interface ITrueFalseItem {
    id: string;
    label: string;
    text: string;
}

/**
 * Subpergunta para questões multi-essay
 */
export interface ISubQuestion {
    id: string;
    label: string;
    text: string;
}

/**
 * Questão da prova (pode ser dissertativa, V/F, cenário ou multi-essay)
 */
export interface IQuestion {
    id: string;
    title: string;
    prompt: string;
    type: 'essay' | 'true-false' | 'scenario' | 'multi-essay';
    items?: ITrueFalseItem[]; // Apenas para type === 'true-false'
    subQuestions?: ISubQuestion[]; // Apenas para type === 'multi-essay'
}

/**
 * Dados da sessão retornados pela API
 */
export interface ISessionData {
    attempt_id: string;
    candidate_id: string;
    status: 'issued' | 'in_progress' | 'submitted' | 'expired' | 'invalidated';
    server_time: string;
    started_at: string | null;
    expires_at: string | null;
    time_remaining_seconds: number;
    questions: IQuestion[];
    ui_hints: {
        autosave_local: boolean;
    };
}

/**
 * Resposta da API padrão
 */
export interface IApiResponse<T> {
    ok: boolean;
    data: T | null;
    error: { code: string; message: string; details?: unknown } | null;
    request_id: string;
}

/**
 * Dados de submissão
 */
export interface ISubmitData {
    attempt_id: string;
    status: string;
    submitted_at: string;
    message?: string;
}
