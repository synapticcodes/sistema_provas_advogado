/**
 * @fileoverview Componente para exibir cenário informativo
 */

interface IScenarioCardProps {
    title: string;
    content: string;
    index: number;
}

/**
 * Card de cenário (apenas leitura, sem resposta)
 */
export function ScenarioCard({ title, content, index }: IScenarioCardProps) {
    return (
        <div className="card mb-6">
            <div className="flex items-center gap-3 mb-4">
                <span className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {index + 1}
                </span>
                <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            </div>

            <div className="prose prose-sm max-w-none">
                {content.split('\n').map((line, idx) => (
                    <p key={idx} className="text-gray-700 leading-relaxed mb-2">
                        {line}
                    </p>
                ))}
            </div>
        </div>
    );
}
