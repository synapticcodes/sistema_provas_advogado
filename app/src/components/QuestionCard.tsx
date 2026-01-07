/**
 * @fileoverview Componente de card de questão dissertativa
 */
import { useCallback } from 'react';
import type { IQuestion } from '../types/exam';

interface IQuestionCardProps {
    question: IQuestion;
    answer: string;
    onChange: (questionId: string, answer: string) => void;
    disabled?: boolean;
    index: number;
}

/**
 * Card de questão com textarea e contador de caracteres
 */
export function QuestionCard({
    question,
    answer,
    onChange,
    disabled,
    index,
}: IQuestionCardProps) {
    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            onChange(question.id, e.target.value);
        },
        [question.id, onChange]
    );

    const charCount = answer.length;

    return (
        <div className="card mb-6 transition-all hover:shadow-xl">
            <div className="flex items-center gap-3 mb-4">
                <span className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {index + 1}
                </span>
                <h2 className="text-xl font-semibold text-gray-800">{question.title}</h2>
            </div>

            <label htmlFor={`question-${question.id}`} className="block">
                <p className="text-gray-600 mb-4 whitespace-pre-wrap leading-relaxed">
                    {question.prompt}
                </p>
            </label>

            <textarea
                id={`question-${question.id}`}
                value={answer}
                onChange={handleChange}
                disabled={disabled}
                rows={14}
                className="input-field font-normal text-base"
                placeholder="Digite sua resposta aqui..."
                aria-describedby={`counter-${question.id}`}
            />

            <div
                id={`counter-${question.id}`}
                className="flex justify-end mt-3 text-sm text-gray-500"
            >
                <span className="bg-gray-100 px-3 py-1 rounded-full">
                    {charCount} {charCount === 1 ? 'caractere' : 'caracteres'}
                </span>
            </div>
        </div>
    );
}
