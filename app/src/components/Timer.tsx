/**
 * @fileoverview Componente Timer com countdown regressivo
 */
import { useEffect, useState, useCallback } from 'react';

interface ITimerProps {
    expiresAt: Date;
    onExpire: () => void;
}

/**
 * Timer regressivo visual com alertas de tempo
 */
export function Timer({ expiresAt, onExpire }: ITimerProps) {
    const [timeRemaining, setTimeRemaining] = useState<number>(0);

    const calculateRemaining = useCallback(() => {
        return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    }, [expiresAt]);

    useEffect(() => {
        setTimeRemaining(calculateRemaining());

        const interval = setInterval(() => {
            const remaining = calculateRemaining();
            setTimeRemaining(remaining);

            if (remaining <= 0) {
                clearInterval(interval);
                onExpire();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt, onExpire, calculateRemaining]);

    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;

    const isWarning = timeRemaining <= 600; // últimos 10 minutos
    const isCritical = timeRemaining <= 120; // últimos 2 minutos

    const formatNumber = (n: number) => String(n).padStart(2, '0');

    return (
        <div
            role="timer"
            aria-live="polite"
            aria-label={`Tempo restante: ${hours} horas, ${minutes} minutos e ${seconds} segundos`}
            className={`
        font-mono text-2xl font-bold px-4 py-2 rounded-lg transition-all duration-300
        ${isCritical
                    ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/50'
                    : isWarning
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30'
                        : 'bg-gray-800 text-white'
                }
      `}
        >
            {formatNumber(hours)}:{formatNumber(minutes)}:{formatNumber(seconds)}
        </div>
    );
}
