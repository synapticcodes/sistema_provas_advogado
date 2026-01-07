/**
 * @fileoverview Página principal da prova online
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Timer } from '../components/Timer';
import { QuestionCard } from '../components/QuestionCard';
import { TrueFalseQuestion } from '../components/TrueFalseQuestion';
import { MultiEssayQuestion } from '../components/MultiEssayQuestion';
import { ScenarioCard } from '../components/ScenarioCard';
import { Loading } from '../components/Loading';
import { ErrorScreen } from '../components/ErrorScreen';
import { getSession, submitExam } from '../lib/api';
import type { ISessionData } from '../types/exam';

const AUTOSAVE_KEY = 'exam_draft_';

/**
 * Página da prova com timer, questões e submissão
 */
export function ExamPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [session, setSession] = useState<ISessionData | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<{ code: string; message: string } | null>(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Carregar sessão
    useEffect(() => {
        async function loadSession() {
            if (!token) {
                setError({ code: 'missing_token', message: 'Token não fornecido' });
                setLoading(false);
                return;
            }

            try {
                const response = await getSession(token);

                if (!response.ok) {
                    if (response.error?.code === 'already_submitted') {
                        navigate('/prova-concluida');
                        return;
                    }
                    setError({
                        code: response.error?.code || 'unknown',
                        message: response.error?.message || 'Erro ao carregar prova',
                    });
                    return;
                }

                setSession(response.data);

                // Restaurar rascunho local
                if (response.data) {
                    const savedDraft = localStorage.getItem(
                        AUTOSAVE_KEY + response.data.attempt_id
                    );
                    if (savedDraft) {
                        try {
                            setAnswers(JSON.parse(savedDraft));
                        } catch {
                            // Rascunho inválido, ignorar
                        }
                    }
                }
            } catch {
                setError({ code: 'network', message: 'Erro de conexão com o servidor' });
            } finally {
                setLoading(false);
            }
        }

        loadSession();
    }, [token, navigate]);

    // Auto-save local com debounce
    useEffect(() => {
        if (!session) return;

        setAutoSaveStatus('saving');
        const timeoutId = setTimeout(() => {
            localStorage.setItem(
                AUTOSAVE_KEY + session.attempt_id,
                JSON.stringify(answers)
            );
            setAutoSaveStatus('saved');
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [answers, session]);

    // Alerta ao sair da página
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (session && session.status === 'in_progress') {
                e.preventDefault();
                e.returnValue =
                    'Você tem uma prova em andamento. Deseja realmente sair?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [session]);

    // Callback para mudança de resposta
    const handleAnswerChange = useCallback(
        (questionId: string, answer: string) => {
            setAnswers((prev) => ({ ...prev, [questionId]: answer }));
            setAutoSaveStatus('idle');
        },
        []
    );

    // Callback de submissão
    const handleSubmit = useCallback(async (force = false) => {
        if (!session || !token) return;

        if (!force) {
            const confirmed = window.confirm(
                'Tem certeza que deseja enviar a prova?\n\nEsta ação não pode ser desfeita.'
            );
            if (!confirmed) return;
        }

        setSubmitting(true);

        try {
            const answersArray = Object.entries(answers).map(
                ([question_id, answer_text]) => ({
                    question_id,
                    answer_text,
                })
            );

            const response = await submitExam(token, answersArray, force);

            if (response.ok) {
                // Limpar rascunho local
                localStorage.removeItem(AUTOSAVE_KEY + session.attempt_id);
                navigate('/prova-concluida');
            } else {
                setError({
                    code: response.error?.code || 'submit_failed',
                    message: response.error?.message || 'Erro ao enviar prova',
                });
            }
        } catch {
            setError({
                code: 'network',
                message: 'Erro de conexão ao enviar. Tente novamente.',
            });
            setSubmitting(false);
        }
    }, [session, token, answers, navigate]);

    // Callback quando timer expira
    const handleExpire = useCallback(() => {
        // Auto-submit forçado quando tempo acabar (sem confirmação)
        handleSubmit(true);
    }, [handleSubmit]);

    // Estados de loading e erro
    if (loading) {
        return <Loading message="Carregando prova..." />;
    }

    if (error) {
        return (
            <ErrorScreen
                title={error.code === 'expired' ? 'Tempo Esgotado' : 'Erro'}
                message={
                    error.code === 'expired' ? (
                        <div className="space-y-4">
                            <p>
                                O prazo máximo para conclusão da prova foi atingido e, por isso, o
                                acesso foi encerrado automaticamente.
                            </p>
                            <div className="bg-orange-50 p-4 rounded-lg text-sm text-orange-800 border border-orange-200">
                                <p className="font-semibold mb-1">Nota sobre suas respostas:</p>
                                <p>
                                    Se você já havia iniciado a prova, as respostas salvas até o
                                    encerramento poderão ser analisadas.
                                    <br />
                                    Caso contrário, esta tentativa foi finalizada.
                                </p>
                            </div>
                            <p className="text-xs text-gray-400 mt-4">
                                Este link é de uso único e não pode ser reutilizado.
                            </p>
                        </div>
                    ) : (
                        error.message
                    )
                }
                code={error.code}
                buttonText={
                    error.code === 'expired'
                        ? 'Você já pode fechar esta aba'
                        : undefined
                }
                isStatic={error.code === 'expired'}
            />
        );
    }

    if (!session) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header fixo */}
            <header className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-md z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img
                            src="/Design_sem_nome__1_-removebg-preview.png"
                            alt="Logo"
                            className="h-12 w-auto hidden sm:block"
                        />
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">
                                Prova Técnica - Cobrança Judicial e Recuperação de Ativos
                            </h1>
                            <p className="text-sm text-gray-500">
                                {autoSaveStatus === 'saving' && 'Salvando...'}
                                {autoSaveStatus === 'saved' && '✓ Rascunho salvo'}
                                {autoSaveStatus === 'idle' && ''}
                            </p>
                        </div>
                    </div>
                    <Timer
                        expiresAt={new Date(session.expires_at!)}
                        onExpire={handleExpire}
                    />
                </div>
            </header>

            {/* Conteúdo */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Instruções */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h2 className="font-semibold text-blue-800 mb-2">Instruções</h2>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Responda todas as questões de forma clara e objetiva</li>
                        <li>• Seu progresso é salvo automaticamente no navegador</li>
                        <li>• Ao finalizar, clique em "Enviar Prova"</li>
                        <li>• A prova será enviada automaticamente quando o tempo acabar</li>
                    </ul>
                </div>

                {/* Texto Introdutório */}
                <div className="mb-8 text-gray-700 space-y-4">
                    <p className="font-medium text-lg">
                        Esta é uma prova prática para avaliar sua capacidade estratégica em cobrança judicial, com foco em resultado.
                    </p>
                    <p>
                        Para isso, leia com atenção o cenário fictício abaixo e responda às perguntas na sequência.
                    </p>
                </div>

                {/* Questões */}
                {session.questions.map((question, index) => {
                    if (question.type === 'scenario') {
                        return (
                            <ScenarioCard
                                key={question.id}
                                title={question.title}
                                content={question.prompt}
                                index={index}
                            />
                        );
                    }

                    if (question.type === 'true-false') {
                        return (
                            <TrueFalseQuestion
                                key={question.id}
                                question={question}
                                answer={answers[question.id] || ''}
                                onChange={handleAnswerChange}
                                disabled={submitting}
                                index={index}
                            />
                        );
                    }

                    if (question.type === 'multi-essay') {
                        return (
                            <MultiEssayQuestion
                                key={question.id}
                                question={question}
                                answer={answers[question.id] || ''}
                                onChange={handleAnswerChange}
                                disabled={submitting}
                                index={index}
                            />
                        );
                    }

                    return (
                        <QuestionCard
                            key={question.id}
                            question={question}
                            answer={answers[question.id] || ''}
                            onChange={handleAnswerChange}
                            disabled={submitting}
                            index={index}
                        />
                    );
                })}

                {/* Botão de submissão */}
                <div className="mt-8 flex flex-col items-center gap-4">
                    <button
                        onClick={() => handleSubmit(false)}
                        disabled={submitting}
                        className="btn-primary text-lg px-10 py-4"
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <svg
                                    className="animate-spin h-5 w-5"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Enviando...
                            </span>
                        ) : (
                            'Enviar Prova'
                        )}
                    </button>

                    <p className="text-sm text-gray-500 text-center">
                        Ao clicar em "Enviar Prova", suas respostas serão finalizadas e não
                        poderão ser alteradas.
                    </p>
                </div>
            </main>
        </div>
    );
}
