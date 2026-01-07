/**
 * @fileoverview Componente de Loading
 */

interface ILoadingProps {
    message?: string;
}

/**
 * Spinner de loading com mensagem opcional
 */
export function Loading({ message = 'Carregando...' }: ILoadingProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-primary-200 rounded-full animate-spin border-t-primary-600" />
            </div>
            <p className="mt-4 text-gray-600 font-medium">{message}</p>
        </div>
    );
}
