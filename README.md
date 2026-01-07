# 📋 Sistema de Prova Online (ADV)

Sistema de prova técnica online para triagem de advogados, com Magic Link e timer persistente de 1 hora.

## 🚀 Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Netlify Functions (Node.js/TypeScript)
- **Banco de Dados**: Neon (Postgres)
- **Hospedagem**: Netlify

## 📁 Estrutura do Projeto

```
prova_advogado/
├── app/                      # Frontend React
│   ├── src/
│   │   ├── components/       # Timer, QuestionCard, etc.
│   │   ├── pages/            # ExamPage, CompletedPage, HomePage
│   │   ├── lib/              # API client
│   │   └── types/            # Tipos TypeScript
│   └── ...
├── netlify/functions/        # Backend serverless
│   ├── lib/                  # Utilitários compartilhados
│   ├── internal-issue-link.ts
│   ├── exams-session.ts
│   └── exams-submit.ts
├── drizzle/                  # Migrations SQL
├── netlify.toml              # Configuração Netlify
└── .env.example              # Template de variáveis
```

## 🔧 Setup Local

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o `.env`:
- `NEON_DATABASE_URL` - String de conexão do Neon
- `INTERNAL_API_KEY` - Gere com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `ADMIN_BASIC_AUTH` - Credenciais Basic Auth no formato `usuario:senha`
- `APP_PUBLIC_BASE_URL` - `http://localhost:8888` (local) ou URL do Netlify

### 2. Criar tabelas no banco

```bash
# Via psql
psql $NEON_DATABASE_URL -f drizzle/0001_initial_schema.sql
psql $NEON_DATABASE_URL -f drizzle/0002_exam_reviews.sql

# Ou cole o conteúdo do arquivo no Neon SQL Editor
```

### 3. Instalar dependências

```bash
# Raiz (backend)
npm install

# Frontend
cd app && npm install
```

### 4. Rodar localmente

```bash
# Na raiz do projeto
npx netlify dev
```

Acesse `http://localhost:8888`

## 📡 API Endpoints

### Internos (n8n → Backend)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/internal/exams/issue-link` | Emitir magic link |

**Headers**: `X-Internal-API-Key: <sua-key>`

**Body**:
```json
{
  "candidate_id": "uuid",
  "force_new": false,
  "ttl_hours": 72
}
```

### Públicos (Frontend → Backend)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/exams/session?token=...` | Validar token e obter questões |
| POST | `/api/v1/exams/submit` | Submeter respostas |

## 🔐 Segurança

- Tokens gerados com 32 bytes de entropia
- Armazenados como hash SHA-256 (nunca em texto plano)
- Headers de segurança configurados (CSP, X-Frame-Options)
- Validação Zod em todos os endpoints

## 🧪 Testando o Fluxo

1. **Criar um candidato de teste** (no SQL do Neon):
   ```sql
   INSERT INTO candidates (id, name, email)
   VALUES (gen_random_uuid(), 'Teste', 'teste@email.com')
   RETURNING id;
   ```

2. **Emitir magic link** (via curl ou Postman):
   ```bash
   curl -X POST http://localhost:8888/api/v1/internal/exams/issue-link \
     -H "Content-Type: application/json" \
     -H "X-Internal-API-Key: sua-api-key" \
     -d '{"candidate_id": "uuid-do-candidato"}'
   ```

3. **Acessar a URL retornada** no navegador

## 📦 Deploy no Netlify

1. Conecte o repositório no [Netlify](https://app.netlify.com)
2. Configure as variáveis de ambiente no painel
3. Deploy automático a cada push

## 📝 Licença

Privado - Uso interno
