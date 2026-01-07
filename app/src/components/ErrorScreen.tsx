/**
 * @fileoverview Componente de erro
 */
import { useNavigate } from 'react-router-dom';

import { ReactNode } from 'react';

interface IErrorScreenProps {
    title?: string;
    message: ReactNode;
    code?: string;
    buttonText?: string;
    onButtonClick?: () => void;
    isStatic?: boolean;
}

/**
 * Tela de erro genérica
 */
export function ErrorScreen({
    title = 'Erro',
    message,
    code,
    buttonText = 'Voltar ao início',
    onButtonClick,
    isStatic = false,
}: IErrorScreenProps) {
    const navigate = useNavigate();

    const handleButtonClick = () => {
        if (onButtonClick) {
            onButtonClick();
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <div className="card text-center max-w-md">
                <div className="flex justify-center mb-6">
                    <img
                        src="/Design_sem_nome__1_-removebg-preview.png"
                        alt="Logo"
                        className="h-24 w-auto"
                    />
                </div>

                <h1 className="text-2xl font-bold text-red-600 mb-2">{title}</h1>
                <div className="text-gray-600 mb-4">{message}</div>

                {code && (
                    <p className="text-sm text-gray-400 mb-4">
                        Código: <code className="bg-gray-100 px-2 py-1 rounded">{code}</code>
                    </p>
                )}

                {isStatic ? (
                    <p className="text-gray-500 font-medium cursor-default">
                        {buttonText}
                    </p>
                ) : (
                    <button
                        onClick={handleButtonClick}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                        {buttonText}
                    </button>
                )}
            </div>
        </div>
    );
}
