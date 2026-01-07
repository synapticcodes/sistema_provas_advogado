/**
 * @fileoverview Conexão com banco de dados Neon/Postgres
 */
import { neon, neonConfig } from '@neondatabase/serverless';

// Configuração para serverless
neonConfig.fetchConnectionCache = true;

/**
 * Cliente SQL para queries
 */
export const sql = neon(process.env.NEON_DATABASE_URL!);

/**
 * Helper para executar queries com tipagem
 */
export async function query<T>(
    queryText: string,
    params?: unknown[]
): Promise<T[]> {
    const result = await sql(queryText, params);
    return result as T[];
}
