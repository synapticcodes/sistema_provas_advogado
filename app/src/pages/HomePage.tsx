/**
 * @fileoverview Página inicial / Home
 */

/**
 * Página inicial simples
 */
export function HomePage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
            <div className="card text-center max-w-lg">
                <div className="flex items-center justify-center gap-4 mb-6">
                    <img
                        src="/Design_sem_nome__1_-removebg-preview.png"
                        alt="Logo"
                        className="h-16 w-auto"
                    />
                    <h1 className="text-2xl font-bold text-gray-800">
                        Prova Técnica
                    </h1>
                </div>

                <p className="text-gray-600">
                    Aguarde o link de acesso à prova que será enviado para você após a
                    aprovação na triagem.
                </p>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
                    <strong>Importante:</strong> O link de acesso é pessoal e
                    intransferível. Ao acessar, o timer de 1 hora será iniciado
                    automaticamente.
                </div>
            </div>
        </div>
    );
}
