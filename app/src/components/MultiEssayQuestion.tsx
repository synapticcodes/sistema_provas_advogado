/**
 * @fileoverview Componente de questão com múltiplas respostas individuais
 */
import { useCallback } from 'react';
import type { IQuestion, ISubQuestion } from '../types/exam';

interface IMultiEssayQuestionProps {
    question: IQuestion;
    answer: string;
    onChange: (questionId: string, answer: string) => void;
    disabled?: boolean;
    index: number;
}

/**
 * Card de questão com múltiplas subperguntas e campos de texto separados
 */
export function MultiEssayQuestion({
    question,
    answer,
    onChange,
    disabled,
    index,
}: IMultiEssayQuestionProps) {
    // Answer format: JSON string { "A": "resposta A", "B": "resposta B", ... }
    const parseAnswer = (): Record<string, string> => {
        try {
            return answer ? JSON.parse(answer) : {};
        } catch {
            return {};
        }
    };

    const handleChange = useCallback(
        (subId: string, value: string) => {
            const current = parseAnswer();
            current[subId] = value;
            onChange(question.id, JSON.stringify(current));
        },
        [question.id, onChange, answer]
    );

    const answers = parseAnswer();

    return (
        <div className="card mb-6 transition-all hover:shadow-xl">
            <div className="flex items-center gap-3 mb-4">
                <span className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {index + 1}
                </span>
                <h2 className="text-xl font-semibold text-gray-800">{question.title}</h2>
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">{question.prompt}</p>

            <div className="space-y-6">
                {question.subQuestions?.map((subQ: ISubQuestion) => (
                    <div key={subQ.id} className="border-l-4 border-primary-500 pl-4">
                        <label htmlFor={`${question.id}-${subQ.id}`} className="block">
                            <p className="font-semibold text-gray-800 mb-2">
                                {subQ.label}) {subQ.text}
                            </p>
                            <textarea
                                id={`${question.id}-${subQ.id}`}
                                value={answers[subQ.id] || ''}
                                onChange={(e) => handleChange(subQ.id, e.target.value)}
                                disabled={disabled}
                                rows={6}
                                className="input-field font-normal text-base"
                                placeholder={`Resposta para a pergunta ${subQ.label}...`}
                            />
                            <div className="text-right mt-2 text-sm text-gray-500">
                                {(answers[subQ.id] || '').length} caracteres
                            </div>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
}
