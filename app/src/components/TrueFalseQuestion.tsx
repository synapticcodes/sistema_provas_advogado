/**
 * @fileoverview Componente de questão Verdadeiro/Falso
 */
import { useCallback } from 'react';
import type { IQuestion, ITrueFalseItem } from '../types/exam';

interface ITrueFalseQuestionProps {
    question: IQuestion;
    answer: string;
    onChange: (questionId: string, answer: string) => void;
    disabled?: boolean;
    index: number;
}

/**
 * Card de questão com checkboxes V/F
 */
export function TrueFalseQuestion({
    question,
    answer,
    onChange,
    disabled,
    index,
}: ITrueFalseQuestionProps) {
    // Answer format: JSON string { "A": true, "B": false, ... }
    const parseAnswer = (): Record<string, boolean> => {
        try {
            return answer ? JSON.parse(answer) : {};
        } catch {
            return {};
        }
    };

    const handleChange = useCallback(
        (itemId: string, value: boolean | null) => {
            const current = parseAnswer();
            if (value === null) {
                delete current[itemId];
            } else {
                current[itemId] = value;
            }
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

            <div className="text-gray-600 mb-6 whitespace-pre-wrap leading-relaxed">
                {question.prompt}
            </div>

            <div className="space-y-4">
                {question.items?.map((item: ITrueFalseItem) => (
                    <div
                        key={item.id}
                        className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                        <div className="flex-shrink-0 font-bold text-primary-600 text-lg">
                            {item.label})
                        </div>
                        <div className="flex-1">
                            <p className="text-gray-700 mb-3">{item.text}</p>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`${question.id}-${item.id}`}
                                        checked={answers[item.id] === true}
                                        onChange={() => handleChange(item.id, true)}
                                        disabled={disabled}
                                        className="w-4 h-4 text-green-600 focus:ring-green-500"
                                    />
                                    <span className="text-green-700 font-medium">Verdadeiro</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`${question.id}-${item.id}`}
                                        checked={answers[item.id] === false}
                                        onChange={() => handleChange(item.id, false)}
                                        disabled={disabled}
                                        className="w-4 h-4 text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-red-700 font-medium">Falso</span>
                                </label>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 text-sm text-gray-500">
                {Object.keys(answers).length} de {question.items?.length || 0} itens respondidos
            </div>
        </div>
    );
}
