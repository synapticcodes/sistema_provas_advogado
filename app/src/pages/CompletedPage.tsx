/**
 * @fileoverview Tela de prova concluída
 */

/**
 * Tela exibida após submissão bem-sucedida
 */
export function CompletedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
            <div className="card text-center max-w-lg">
                <img
                    src="/Design_sem_nome__1_-removebg-preview.png"
                    alt="Logo"
                    className="h-24 w-auto mx-auto mb-6"
                />

                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                    Prova Enviada com Sucesso!
                </h1>

                <p className="text-gray-600 mb-6 leading-relaxed">
                    Suas respostas foram recebidas e registradas. Agora é só aguardar o
                    resultado da avaliação. Você receberá uma mensagem via WhatsApp assim que
                    a correção for concluída
                </p>

                <div className="bg-gray-50 rounded-lg p-4 text-left">
                    <h2 className="font-semibold text-gray-700 mb-2">Próximos passos:</h2>
                    <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>Suas respostas estão seguras em nosso sistema</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>A equipe jurídica fará a análise das respostas</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>Você será notificado sobre o resultado</span>
                        </li>
                    </ul>
                </div>

                <div className="mt-8 space-y-2">
                    <p className="text-sm text-gray-500">
                        Esta tentativa de prova foi finalizada e não pode ser editada ou
                        reenviada.
                    </p>
                    <p className="text-xs text-gray-400">
                        Você pode fechar esta página com segurança.
                    </p>
                </div>
            </div>
        </div>
    );
}
