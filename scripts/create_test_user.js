import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function createTestCandidate() {
    if (!process.env.NEON_DATABASE_URL) {
        console.error('❌ Erro: NEON_DATABASE_URL não definida');
        process.exit(1);
    }

    const sql = neon(process.env.NEON_DATABASE_URL);

    try {
        const name = 'Usuario Teste';
        const email = `teste_${Date.now()}@exemplo.com`;

        console.log(`Criando candidato: ${name} (${email})...`);

        // Ajuste com campos obrigatórios da tabela preexistente
        const result = await sql`
      INSERT INTO candidates (
        id, 
        lead_nome, 
        candidate_email, 
        status, 
        id_conversa
      )
      VALUES (
        gen_random_uuid(), 
        ${name}, 
        ${email}, 
        'approved', 
        'TESTE-MANUAL-001'
      )
      RETURNING id
    `;

        console.log('\n✅ Candidato criado com sucesso!');
        console.log(`🆔 ID: ${result[0].id}`);
        console.log('---------------------------------------------------');
        console.log('⬇️  COPIE E COLE EM OUTRO TERMINAL (com servidor rodando):');
        console.log('\ncurl -X POST http://localhost:8888/api/v1/internal/exams/issue-link \\');
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -H "X-Internal-API-Key: ${process.env.INTERNAL_API_KEY}" \\`);
        console.log(`  -d '{"candidate_id": "${result[0].id}"}'`);
        console.log('\n---------------------------------------------------');

    } catch (error) {
        console.error('❌ Erro ao criar candidato:', error);
    }
}

createTestCandidate();
