/**
 * @fileoverview Lista de provas submetidas (admin)
 */
import { useEffect, useState } from 'react';
import { Loading } from '../components/Loading';
import { ErrorScreen } from '../components/ErrorScreen';
import { getAdminSubmissions } from '../lib/adminApi';
import type { IAdminSubmissionItem } from '../types/admin';

const DEFAULT_LIMIT = 50;

const formatDateTime = (value: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR');
};

const formatDuration = (seconds: number | null) => {
    if (seconds === null || Number.isNaN(seconds)) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
};

export function AdminExamsPage() {
    const [items, setItems] = useState<IAdminSubmissionItem[]>([]);
    const [reviewFilter, setReviewFilter] = useState<'pending' | 'reviewed' | 'all'>('pending');
    const [offset, setOffset] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadSubmissions() {
            setLoading(true);
            setError(null);

            try {
                const response = await getAdminSubmissions(reviewFilter, DEFAULT_LIMIT, offset);
                if (!response.ok || !response.data) {
                    setError(response.error?.message || 'Erro ao carregar submissões');
                    return;
                }

                setItems(response.data.items);
                setTotal(response.data.pagination.total);
            } catch {
                setError('Erro de conexão com o servidor');
            } finally {
                setLoading(false);
            }
        }

        loadSubmissions();
    }, [reviewFilter, offset]);

    if (loading) {
        return <Loading message="Carregando submissões..." />;
    }

    if (error) {
        return (
            <ErrorScreen
                title="Erro"
                message={error}
                code="admin_load_error"
            />
        );
    }

    const hasPrev = offset > 0;
    const hasNext = offset + DEFAULT_LIMIT < total;

    const handleRowClick = (attemptId: string) => {
        window.location.href = `/admin/exams/${attemptId}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 leading-tight">Painel de Provas</h1>
                            <p className="text-sm text-gray-500">
                                Gerencie as submissões e avaliações dos candidatos.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Buscar candidato..."
                                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none w-64"
                                    disabled
                                    title="Busca em breve"
                                />
                            </div>
                            <div className="h-6 w-px bg-gray-300 mx-1 hidden md:block"></div>
                            <select
                                id="review-filter"
                                value={reviewFilter}
                                onChange={(event) => {
                                    setReviewFilter(event.target.value as typeof reviewFilter);
                                    setOffset(0);
                                }}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
                            >
                                <option value="pending">Pendentes</option>
                                <option value="reviewed">Revisadas</option>
                                <option value="all">Todas</option>
                            </select>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-gray-500 py-16">
                            <div className="bg-gray-50 p-4 rounded-full mb-3">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <p className="font-medium text-gray-900">Nenhuma submissão encontrada</p>
                            <p className="text-sm mt-1">Tente mudar o filtro ou aguarde novas provas.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 font-semibold uppercase tracking-wider text-xs">
                                    <tr>
                                        <th className="py-4 px-6">Candidato</th>
                                        <th className="py-4 px-6">Status</th>
                                        <th className="py-4 px-6">Detalhes</th>
                                        <th className="py-4 px-6">Tempo</th>
                                        <th className="py-4 px-6 text-right">Enviado em</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((item) => (
                                        <tr
                                            key={item.attempt_id}
                                            onClick={() => handleRowClick(item.attempt_id)}
                                            className="group hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <td className="py-4 px-6 vertical-align-middle">
                                                <div>
                                                    <p className="font-semibold text-gray-900 leading-none">
                                                        {item.candidate_label || item.candidate_id}
                                                    </p>
                                                    <code className="text-[10px] text-gray-400 mt-1 block font-mono">
                                                        {item.attempt_id.slice(0, 8)}...
                                                    </code>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    {item.review.is_reviewed ? (
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.review.decision === 'approve' ? 'bg-green-100 text-green-700 border-green-200' :
                                                            item.review.decision === 'reject' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                'bg-blue-100 text-blue-700 border-blue-200'
                                                            }`}>
                                                            {item.review.decision?.toUpperCase() || 'REVISADO'}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                            PENDENTE
                                                        </span>
                                                    )}
                                                    {item.is_auto_submit && (
                                                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded" title="Auto-submit">
                                                            AUTO
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-4 text-gray-600">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium text-gray-400 uppercase">Respostas</span>
                                                        <span className="font-semibold">{item.answers_count}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-gray-600 font-medium">
                                                {formatDuration(item.time_spent_seconds)}
                                            </td>
                                            <td className="py-4 px-6 text-right text-gray-500">
                                                {formatDateTime(item.submitted_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Footer */}
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            Mostrando <strong className="font-medium text-gray-900">{items.length}</strong> de <strong className="font-medium text-gray-900">{total}</strong> resultados
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={!hasPrev}
                                onClick={() => setOffset(Math.max(offset - DEFAULT_LIMIT, 0))}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                Anterior
                            </button>
                            <button
                                type="button"
                                disabled={!hasNext}
                                onClick={() => setOffset(offset + DEFAULT_LIMIT)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
