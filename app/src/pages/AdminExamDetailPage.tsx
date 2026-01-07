/**
 * @fileoverview Detalhe de tentativa e revisão (admin)
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorScreen } from '../components/ErrorScreen';
import { getAdminAttemptDetail, saveAdminReview } from '../lib/adminApi';
import type {
    IAdminAttemptDetailData,
    IAdminDecision,
    IAdminReviewPayload,
} from '../types/admin';
import type { IQuestion } from '../types/exam';

type ReviewDecisionOption = IAdminDecision | '';

const formatDateTime = (value: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR');
};

const safeJsonParse = <T,>(value: string): T | null => {
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
};

const StatusBadge = ({ status }: { status: string }) => {
    const statusMap: Record<string, string> = {
        finished: 'bg-green-100 text-green-800 border-green-200',
        submitted: 'bg-green-100 text-green-800 border-green-200',
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        ongoing: 'bg-blue-100 text-blue-800 border-blue-200',
        expired: 'bg-red-100 text-red-800 border-red-200',
    };
    const className = statusMap[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
            {status.toUpperCase()}
        </span>
    );
};

export function AdminExamDetailPage() {
    const { attempt_id: attemptId } = useParams<{ attempt_id: string }>();
    const [detail, setDetail] = useState<IAdminAttemptDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const [decision, setDecision] = useState<ReviewDecisionOption>('');
    const [score, setScore] = useState('');
    const [notes, setNotes] = useState('');
    const [reviewerName, setReviewerName] = useState('Admin');

    useEffect(() => {
        async function loadDetail() {
            if (!attemptId) {
                setError('Tentativa inválida');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const response = await getAdminAttemptDetail(attemptId);
                if (!response.ok || !response.data) {
                    setError(response.error?.message || 'Erro ao carregar tentativa');
                    return;
                }

                setDetail(response.data);
                if (response.data.review) {
                    setDecision(response.data.review.decision || '');
                    setScore(
                        response.data.review.score !== null
                            ? String(response.data.review.score)
                            : ''
                    );
                    setNotes(response.data.review.notes || '');
                    setReviewerName(response.data.review.reviewer_name || 'Admin');
                }
            } catch {
                setError('Erro de conexão com o servidor');
            } finally {
                setLoading(false);
            }
        }

        loadDetail();
    }, [attemptId]);

    const answerMap = useMemo(() => {
        if (!detail) return new Map();
        return new Map(detail.answers.map((answer) => [answer.question_id, answer]));
    }, [detail]);

    const handleCopyAttemptId = async () => {
        if (!detail) return;
        try {
            await navigator.clipboard.writeText(detail.attempt.attempt_id);
            setSaveMessage('Attempt ID copiado.');
            setTimeout(() => setSaveMessage(null), 2000);
        } catch {
            setSaveMessage('Não foi possível copiar o ID.');
        }
    };

    const handleSave = async () => {
        if (!attemptId) return;
        if (!decision) {
            setSaveMessage('Selecione uma decisão antes de salvar.');
            return;
        }

        setSaving(true);
        setSaveMessage(null);

        const payload: IAdminReviewPayload = {
            decision: decision as IAdminDecision,
        };

        const scoreValue = score.trim();
        if (scoreValue) {
            const parsedScore = Number(scoreValue);
            if (!Number.isNaN(parsedScore)) {
                payload.score = parsedScore;
            }
        }

        if (notes.trim()) payload.notes = notes.trim();
        if (reviewerName.trim()) payload.reviewer_name = reviewerName.trim();

        try {
            const response = await saveAdminReview(attemptId, payload);
            if (!response.ok || !response.data) {
                setSaveMessage(response.error?.message || 'Erro ao salvar avaliação');
                return;
            }

            setSaveMessage('Avaliação salva com sucesso.');
            const responseData = response.data;
            setDetail((current) =>
                current
                    ? {
                        ...current,
                        review: {
                            is_reviewed: true,
                            decision: responseData.decision,
                            reviewed_at: responseData.reviewed_at,
                            score: payload.score ?? null,
                            notes: payload.notes ?? null,
                            reviewer_name: payload.reviewer_name ?? null,
                        },
                    }
                    : current
            );
        } catch {
            setSaveMessage('Erro de conexão ao salvar a avaliação');
        } finally {
            setSaving(false);
        }
    };

    const renderAnswer = (question: IQuestion) => {
        const answer = answerMap.get(question.id);

        if (!answer) {
            return (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <p className="text-sm text-gray-400 italic">Nenhuma resposta registrada.</p>
                </div>
            );
        }

        if (question.type === 'true-false') {
            const parsed = safeJsonParse<Record<string, boolean>>(answer.answer_text) || {};
            return (
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    {question.items?.map((item) => (
                        <div key={item.id} className="flex items-start gap-4 p-2 rounded hover:bg-gray-100 transition-colors">
                            <span className="font-semibold text-gray-500 w-6">{item.label})</span>
                            <div className="flex-1">
                                <p className="text-gray-800 font-medium">{item.text}</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Resposta:</span>
                                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${parsed[item.id] === true
                                        ? 'bg-green-100 text-green-700'
                                        : parsed[item.id] === false
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-gray-200 text-gray-600'
                                        }`}>
                                        {parsed[item.id] === true
                                            ? 'Verdadeiro'
                                            : parsed[item.id] === false
                                                ? 'Falso'
                                                : 'Não respondido'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (question.type === 'multi-essay') {
            const parsed = safeJsonParse<Record<string, string>>(answer.answer_text) || {};
            return (
                <div className="space-y-4">
                    {question.subQuestions?.map((subQuestion) => (
                        <div key={subQuestion.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <p className="text-sm font-semibold text-gray-600 mb-2 border-b border-gray-200 pb-2">
                                {subQuestion.label}) {subQuestion.text}
                            </p>
                            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed font-newsreader">
                                {parsed[subQuestion.id] || <span className="text-gray-400 italic">Sem resposta</span>}
                            </p>
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed font-newsreader">
                    {answer.answer_text || <span className="text-gray-400 italic">Sem resposta</span>}
                </p>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">Carregando detalhes da prova...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return <ErrorScreen title="Erro ao carregar" message={error} code="admin_detail_error" />;
    }

    if (!detail) return null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                to="/admin/exams"
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                                title="Voltar"
                            >
                                ←
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                                    Detalhe da Prova
                                </h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-gray-500">Candidato:</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {detail.attempt.candidate_label || detail.attempt.candidate_id}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Enviado em</p>
                            <p className="text-sm font-medium text-gray-900">
                                {formatDateTime(detail.attempt.submitted_at)}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                {/* Meta Info Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">ID da Tentativa</p>
                            <div className="flex items-center gap-2">
                                <code className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                    {detail.attempt.attempt_id}
                                </code>
                                <button
                                    type="button"
                                    onClick={handleCopyAttemptId}
                                    className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 px-2 py-1 rounded transition-colors"
                                >
                                    Copiar
                                </button>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Status</p>
                            <StatusBadge status={detail.attempt.status} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Tempo / Auto-submit</p>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-700">
                                    Início: {formatDateTime(detail.attempt.started_at)}
                                </span>
                                <span className="text-xs text-gray-500 mt-0.5">
                                    Auto-submit: {detail.attempt.is_auto_submit ? 'Sim' : 'Não'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scenario Section */}
                {detail.exam.scenario && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                                Cenário: {detail.exam.scenario.title}
                            </h2>
                        </div>
                        <div className="p-8 prose prose-gray max-w-none text-gray-800 font-newsreader leading-relaxed">
                            <div className="whitespace-pre-wrap">{detail.exam.scenario.body_markdown}</div>
                        </div>
                    </div>
                )}

                {/* Questions Section */}
                <div className="space-y-8">
                    {detail.exam.questions.map((question, index) => (
                        <div key={question.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-4">
                                <span className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                    {index + 1}
                                </span>
                                <div className="flex-1 pt-1">
                                    <h3 className="text-lg font-semibold text-gray-900 leading-snug">
                                        {question.title}
                                    </h3>
                                    {question.prompt && (
                                        <p className="text-gray-600 mt-2 text-sm leading-relaxed">{question.prompt}</p>
                                    )}
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="mb-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resposta do Candidato</span>
                                </div>
                                {renderAnswer(question)}
                                <div className="mt-4 flex justify-end">
                                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                                        {answerMap.get(question.id)?.char_count ?? 0} caracteres •{' '}
                                        {answerMap.get(question.id)?.word_count ?? 0} palavras
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Review Guide / Form */}
                <div className="bg-white rounded-xl shadow-lg border border-primary-100 overflow-hidden ring-1 ring-primary-50">
                    <div className="bg-primary-50 px-6 py-4 border-b border-primary-100">
                        <h2 className="text-lg font-bold text-primary-900">Avaliação & Feedback</h2>
                    </div>

                    <div className="p-6 md:p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="decision">
                                    Decisão Final <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="decision"
                                    value={decision}
                                    onChange={(event) => setDecision(event.target.value as ReviewDecisionOption)}
                                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow outline-none"
                                >
                                    <option value="">Selecione uma ação...</option>
                                    <option value="approve">✅ Aprovar Candidato</option>
                                    <option value="reject">❌ Reprovar Candidato</option>
                                    <option value="interview">💬 Solicitar Entrevista</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="score">
                                    Nota (0-100)
                                </label>
                                <input
                                    id="score"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={score}
                                    onChange={(event) => setScore(event.target.value)}
                                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow outline-none"
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="notes">
                                Parecer Técnico
                            </label>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow outline-none min-h-[120px]"
                                placeholder="Descreva os pontos fortes, fracos e observações gerais sobre a prova..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="reviewer">
                                    Nome do Revisor
                                </label>
                                <input
                                    id="reviewer"
                                    value={reviewerName}
                                    onChange={(event) => setReviewerName(event.target.value)}
                                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow outline-none"
                                />
                            </div>
                            <div className="flex flex-col items-end">
                                {saveMessage && (
                                    <p className={`text-sm font-medium mb-3 ${saveMessage.includes('sucesso') ? 'text-green-600' : 'text-red-500'}`}>
                                        {saveMessage}
                                    </p>
                                )}
                                <div className="flex items-center gap-4 w-full justify-end">
                                    {detail.review.is_reviewed && detail.review.reviewed_at && (
                                        <p className="text-xs text-gray-400 text-right leading-tight">
                                            Última revisão:<br />
                                            {formatDateTime(detail.review.reviewed_at)}
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:transform active:scale-95"
                                    >
                                        {saving ? 'Salvando...' : 'Salvar Avaliação'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
