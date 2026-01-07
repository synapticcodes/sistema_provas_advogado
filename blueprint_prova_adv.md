# BLUEPRINT — Sistema de Prova Online (ADV) com Magic Link, Timer Persistente e Neon (Postgres)
> **Arquivo:** `blueprint_prova_adv.md`  
> **Objetivo:** especificação técnica detalhada (arquitetura + contrato de APIs + modelo de dados + segurança + UX) para o módulo **Prova Online** integrado ao processo de triagem.  
> **Hospedagem da prova:** Netlify (deploy via GitHub).  
> **Orquestrador externo:** n8n (fora do escopo de workflow neste documento).  
> **Fonte única da verdade:** Neon (Postgres).

---

## Sumário
1. [Contexto e Escopo](#contexto-e-escopo)  
2. [Princípios de Arquitetura](#princípios-de-arquitetura)  
3. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)  
4. [Tecnologias Recomendadas](#tecnologias-recomendadas)  
5. [Modelo de Dados (Neon/Postgres)](#modelo-de-dados-neonpostgres)  
6. [Estados e Regras de Negócio](#estados-e-regras-de-negócio)  
7. [Contrato de APIs (Netlify Functions)](#contrato-de-apis-netlify-functions)  
8. [Landing Page da Prova (Front-end)](#landing-page-da-prova-front-end)  
9. [Timer Persistente (1 hora)](#timer-persistente-1-hora)  
10. [Segurança](#segurança)  
11. [Auditoria e Observabilidade](#auditoria-e-observabilidade)  
12. [Deploy, Configuração e Ambientes](#deploy-configuração-e-ambientes)  
13. [Testes e Qualidade](#testes-e-qualidade)  
14. [Checklist de Implementação](#checklist-de-implementação)  
15. [Apêndices](#apêndices)  

---

## Contexto e Escopo

### Contexto
- Existe um processo de **triagem conversacional** (Agente 01) que aprova/reprova candidatos.
- Candidatos **aprovados** avançam para a **prova online** (esta especificação).
- O orquestrador (n8n) aciona **chamadas HTTP** (tools) para:
  - emitir/ativar o **magic link** para um candidato aprovado;
  - consultar estado da prova (opcional);
  - receber evento de submissão (opcional via webhook/callback);
  - atualizar estado do candidato no DB.

### Escopo deste blueprint
- Landing page da prova (Netlify) + API serverless (Netlify Functions).
- Magic link e validação de acesso à prova.
- Timer persistente (1 hora) controlado por servidor.
- Submissão e armazenamento das respostas no Neon/Postgres.
- Segurança, idempotência, auditoria, observabilidade e testes.

### Fora do escopo
- Workflow detalhado do n8n (será documentado separadamente).
- Implementação do canal WhatsApp/Chat e da triagem (já existe blueprint anterior).
- Interface interna de correção humana (admin dashboard) — **pode ser adicionada depois**.

---

## Princípios de Arquitetura

1. **Banco é a fonte única da verdade**
   - Status do candidato, status da prova, horário de início e expiração são decididos pelo DB + backend determinístico.
   - O front-end **não decide** o que vale, apenas exibe e envia.

2. **Separação de responsabilidades**
   - Orquestrador: roteia estado e aciona APIs.
   - Backend (Functions): valida token, controla tempo e grava dados.
   - Front-end: UX, coleta respostas, exibe timer.

3. **Idempotência**
   - Geração de link e submissões devem ser idempotentes (safe retries).
   - Uso de `Idempotency-Key` + constraints no DB.

4. **Segurança “link = credencial”**
   - Magic link é “passwordless”: quem tem o token pode acessar.
   - Token deve ser **imprevisível**, armazenado **apenas em hash** no DB e com expiração/uso único.

5. **Auditável e determinístico**
   - Toda decisão e evento relevante vira registro (audit trail).
   - Possibilidade de reconstruir: “quem gerou link, quando iniciou, quanto tempo, quando submeteu, o que respondeu”.

---

## Visão Geral da Arquitetura

### Componentes
- **A) Orquestrador (n8n)**  
  - Recebe evento “candidato aprovado” da triagem.
  - Chama endpoint interno para emitir magic link.
  - Envia link ao candidato via canal (WhatsApp/Email/etc.).

- **B) Landing Page (Netlify Static + SPA)**  
  - Rota `/prova/:token` (ou `/prova?token=...`).
  - Renderiza questões, campos dissertativos e timer.
  - Chama APIs públicas para validar token e enviar respostas.

- **C) Netlify Functions (Backend)**  
  - Endpoints internos (orquestrador): emissão/renovação do link.
  - Endpoints públicos (candidato): iniciar/retomar sessão, submissão final.
  - Conecta no Neon e aplica regras de negócio.

- **D) Neon (Postgres)**  
  - Tabelas: `candidates` (já existente), `exam_attempts`, `exam_answers`, `audit_events` (recomendado).

### Diagrama (alto nível)
```text
          +-------------------+             +---------------------------+
          |  Canal (WhatsApp) |             |     Landing Page (SPA)    |
          +---------+---------+             +------------+--------------+
                    |                                      |
                    | (mensagens)                          | (HTTP: validar/iniciar/submit)
                    v                                      v
              +-----------+                          +-------------+
              |    n8n    |--(HTTP interno)--------->| Netlify Fn  |
              +-----+-----+                          +------+------+
                    |                                       |
                    | (SQL/queries via backend)             | (SQL)
                    v                                       v
              +-----------------------------------------------+
              |               Neon Postgres                    |
              +-----------------------------------------------+
```

---

## Tecnologias Recomendadas

> Objetivo: **rápidas, robustas, simples no Netlify** e com bom suporte em serverless.

### Front-end (Landing Page)
- **React + Vite + TypeScript**
- (opcional, recomendado) **Tailwind CSS** para responsividade rápida
- (opcional) **React Hook Form** + **Zod** para validação de formulário (UI/UX)
- `localStorage` para **auto-save** local das respostas (UX), mas sempre validar no servidor.

### Backend (API)
- **Netlify Functions** (Node.js / TypeScript)
- Cliente Postgres serverless:
  - **@neondatabase/serverless** (HTTP/WebSocket dependendo da necessidade)
- (opcional) ORM e migrations:
  - **Drizzle ORM + drizzle-kit** (migrations versionadas)
- (opcional) validação:
  - **Zod** para validar payloads de entrada (tanto interno quanto público)

### Segurança e utilitários
- `crypto` (Node) para geração de tokens randômicos e HMAC.
- Rate limit (pode ser no nível do Netlify/edge + lógica simples por IP se necessário).
- Headers de segurança (CSP, X-Frame-Options etc. — ver seção Segurança).

### Observabilidade
- **Sentry** (front + functions) *ou* logging estruturado + monitoramento do Netlify.
- Logs JSON com `request_id` (correlação).

---

## Modelo de Dados (Neon/Postgres)

> Você já tem a tabela de candidatos. Este blueprint assume um `candidates.id` (UUID ou BIGINT) existente.

### Objetivos do modelo
- 1 prova por candidato (padrão), mas permitir múltiplas tentativas futuramente sem quebrar schema.
- Token armazenado **apenas em hash**.
- Separar:
  - **tentativa de prova** (`exam_attempts`)
  - **respostas** (`exam_answers`) ou um JSON único (opção B).
- Auditoria de eventos (`audit_events`) para rastreabilidade.

### Tabelas recomendadas

#### A) `exam_attempts` (1 linha por tentativa)
- Controla token, estado, início, expiração, conclusão.

Campos sugeridos:
- `id` UUID (PK)
- `candidate_id` FK -> `candidates.id`
- `token_hash` TEXT (unique) — hash do token (ex.: SHA-256 hex)
- `token_prefix` TEXT (opcional) — primeiros 6-8 chars do token para suporte (não é segredo)
- `status` TEXT enum-like:
  - `issued` (link emitido, ainda não iniciou)
  - `in_progress` (iniciou, timer rodando)
  - `submitted` (enviado dentro do prazo)
  - `expired` (tempo expirou sem submissão)
  - `invalidated` (revogado/novo link)
- `issued_at` TIMESTAMPTZ
- `started_at` TIMESTAMPTZ (nullable até o primeiro acesso)
- `expires_at` TIMESTAMPTZ (nullable até iniciar)
- `submitted_at` TIMESTAMPTZ
- `last_seen_at` TIMESTAMPTZ (opcional; update quando front “pingar”)
- `idempotency_key_issue` TEXT (unique por candidate_id, opcional)
- `meta` JSONB (user agent, ip hash, etc. — cuidado com LGPD)
- `created_at` TIMESTAMPTZ default now()
- `updated_at` TIMESTAMPTZ default now()

Constraints:
- Unique `(candidate_id)` WHERE status IN ('issued','in_progress') (garante somente 1 prova ativa)
- Unique `token_hash`
- Check `expires_at = started_at + interval '1 hour'` (opcional, pode ser enforce em trigger)

#### B) `exam_answers` (respostas por questão)
- Armazena respostas dissertativas.
- Se a prova tiver N perguntas fixas, preferível 1 linha por pergunta.

Campos sugeridos:
- `id` UUID (PK)
- `attempt_id` FK -> `exam_attempts.id`
- `question_id` TEXT (ex.: "Q1", "Q2")
- `answer_text` TEXT
- `saved_at` TIMESTAMPTZ default now()
- `final` BOOLEAN default false (true quando enviada)
- `word_count` INT (opcional)
- `char_count` INT (opcional)

Constraints:
- Unique `(attempt_id, question_id, final)` se quiser manter rascunhos + final separados.
- Ou simplificar: só salvar final no submit.

#### C) `audit_events` (recomendado)
- Registra eventos importantes do sistema para auditoria.

Campos sugeridos:
- `id` UUID PK
- `candidate_id` nullable
- `attempt_id` nullable
- `event_type` TEXT (ex.: `exam.link_issued`, `exam.started`, `exam.submitted`, `exam.expired`, `exam.invalid_token`, `exam.issue_reused`)
- `actor_type` TEXT (`system`, `orchestrator`, `candidate`, `admin`)
- `actor_id` TEXT nullable (ex.: id do job no n8n; não colocar dados sensíveis)
- `request_id` TEXT (correlação)
- `payload` JSONB (pequeno; sem dados sensíveis — ou com redaction)
- `created_at` TIMESTAMPTZ default now()

---

### Exemplo de migration (SQL) — base
> Ajuste nomes de schema e FKs conforme seu DB real.

```sql
-- exam_attempts
create table if not exists exam_attempts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  token_hash text not null unique,
  token_prefix text,
  status text not null,
  issued_at timestamptz not null default now(),
  started_at timestamptz,
  expires_at timestamptz,
  submitted_at timestamptz,
  last_seen_at timestamptz,
  idempotency_key_issue text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exam_attempts_candidate_id on exam_attempts(candidate_id);
create index if not exists idx_exam_attempts_status on exam_attempts(status);

-- opcional: impedir múltiplas provas ativas por candidato
-- pode ser feito com índice parcial:
create unique index if not exists uniq_active_attempt_per_candidate
  on exam_attempts(candidate_id)
  where status in ('issued','in_progress');

-- exam_answers
create table if not exists exam_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references exam_attempts(id) on delete cascade,
  question_id text not null,
  answer_text text not null,
  saved_at timestamptz not null default now(),
  final boolean not null default false,
  word_count int,
  char_count int
);

create index if not exists idx_exam_answers_attempt_id on exam_answers(attempt_id);

-- audit_events
create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete set null,
  attempt_id uuid references exam_attempts(id) on delete set null,
  event_type text not null,
  actor_type text not null,
  actor_id text,
  request_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_events_candidate_id on audit_events(candidate_id);
create index if not exists idx_audit_events_attempt_id on audit_events(attempt_id);
create index if not exists idx_audit_events_event_type on audit_events(event_type);
```

---

## Estados e Regras de Negócio

### Estados da tentativa de prova (`exam_attempts.status`)
- `issued`: link gerado, ainda não iniciou (started_at null)
- `in_progress`: candidato acessou; started_at preenchido; expires_at preenchido
- `submitted`: respostas finais gravadas; submitted_at preenchido; token não aceita mais
- `expired`: expires_at < now() e não submeteu
- `invalidated`: link revogado (ex.: reemissão manual)

### Invariantes (regras que **sempre** devem valer)
1. **Autoridade de tempo é do servidor**
   - `expires_at` é derivado de `started_at + 1 hour`.
   - O backend rejeita submissões após `expires_at`.

2. **Acesso via token válido**
   - Token só é válido se:
     - existe `token_hash` correspondente;
     - status != `submitted` e != `invalidated`;
     - se `expires_at` existir, agora <= expires_at (para endpoints públicos).

3. **Uso único / antirreplay**
   - Após `submitted`, token deve ser considerado inutilizável.

4. **Idempotência de emissão**
   - Se o orquestrador chamar “emitir link” 2x para o mesmo candidato:
     - deve retornar o mesmo link ativo (se ainda `issued`) **ou**
     - invalidar o anterior e emitir um novo (decisão de produto).
   - Recomendação: **retornar o link ativo se existir e estiver válido**, a menos que `force_new = true`.

---

## Contrato de APIs (Netlify Functions)

### Convenções
- Prefixo de versão: `/api/v1/...`
- Respostas JSON com formato consistente:
  - `ok: boolean`
  - `data: object | null`
  - `error: { code, message, details? } | null`
  - `request_id: string`

### Autenticação
- **Endpoints internos** (chamados pelo orquestrador): requerem `X-Internal-API-Key` ou `Authorization: Bearer <internal_key>`.
- **Endpoints públicos** (candidato): usam `token` no path ou query + validação em DB.

### Headers padrão
- `Content-Type: application/json`
- `X-Request-Id` (opcional do cliente; se não vier, gerar no servidor)
- `Idempotency-Key` (em endpoints sensíveis)

---

### 1) Emitir Magic Link (INTERNAL)
**POST** `/api/v1/internal/exams/issue-link`

**Uso:** chamado pelo orquestrador quando o candidato for aprovado.

**Auth:** `X-Internal-API-Key: <SECRET>`

**Body**
```json
{
  "candidate_id": "uuid",
  "force_new": false,
  "ttl_hours": 72
}
```

**Regras**
- Se existir tentativa ativa (`issued` ou `in_progress`) e `force_new=false`:
  - retorna o link correspondente (mesmo token), sem criar novo.
- Se `force_new=true`:
  - marca tentativa anterior como `invalidated` (audit event) e cria nova.
- `ttl_hours` controla **validade do link antes de iniciar** (ex.: 72h).  
  - Implementação: `issued_at + ttl_hours` (campo opcional `link_expires_at`) **ou** reuso de `meta`.

**Response 200**
```json
{
  "ok": true,
  "data": {
    "attempt_id": "uuid",
    "candidate_id": "uuid",
    "exam_url": "https://SEU-DOMINIO.netlify.app/prova/<TOKEN>",
    "issued_at": "2026-01-06T12:00:00Z",
    "link_expires_at": "2026-01-09T12:00:00Z",
    "status": "issued"
  },
  "error": null,
  "request_id": "req_..."
}
```

**Erros**
- `401 unauthorized` se API key inválida
- `404 candidate_not_found`
- `409 active_attempt_exists` (se preferir não retornar link e exigir `force_new`, não recomendado)

---

### 2) Validar Token e Iniciar/Retomar Sessão (PUBLIC)
**GET** `/api/v1/exams/session?token=<TOKEN>`

**Uso:** chamado pela landing page no carregamento.

**Regras**
- Calcula `token_hash` e busca `exam_attempts`.
- Se `status=issued`:
  - seta `started_at = now()`
  - seta `expires_at = now() + 1 hour`
  - muda status -> `in_progress`
  - cria audit event `exam.started`
- Se `status=in_progress`:
  - retorna `expires_at` e tempo restante.
- Se `status=submitted`:
  - retorna erro `already_submitted`.
- Se `expires_at < now()`:
  - muda status -> `expired` (se ainda in_progress/issued) e retorna erro `expired`.

**Response 200 (sessão válida)**
```json
{
  "ok": true,
  "data": {
    "attempt_id": "uuid",
    "candidate_id": "uuid",
    "status": "in_progress",
    "server_time": "2026-01-06T12:00:00Z",
    "started_at": "2026-01-06T12:00:00Z",
    "expires_at": "2026-01-06T13:00:00Z",
    "time_remaining_seconds": 3600,
    "questions": [
      {
        "id": "Q1",
        "title": "Questão 1",
        "prompt": "Descreva..."
      }
    ],
    "ui_hints": {
      "autosave_local": true
    }
  },
  "error": null,
  "request_id": "req_..."
}
```

**Erros**
- `400 invalid_token_format`
- `404 token_not_found`
- `410 expired`
- `409 already_submitted`

---

### 3) Submeter Prova (PUBLIC)
**POST** `/api/v1/exams/submit`

**Body**
```json
{
  "token": "<TOKEN>",
  "answers": [
    { "question_id": "Q1", "answer_text": "..." },
    { "question_id": "Q2", "answer_text": "..." }
  ],
  "client": {
    "user_agent": "string",
    "timezone": "America/Sao_Paulo"
  }
}
```

**Regras**
- Validar token e obter tentativa.
- Rejeitar se:
  - status já `submitted`/`invalidated`/`expired`;
  - `now() > expires_at` (expirou).
- Gravar respostas em transação:
  - inserir `exam_answers` com `final=true` (ou update).
  - atualizar `exam_attempts.status='submitted'`, `submitted_at=now()`.
  - audit event `exam.submitted`.
- **Idempotência**:
  - Se o front enviar duas vezes (timeout/retry), retornar 200 com “já submetida” **se** payload for igual (ideal) ou retornar 409 (aceitável).
  - Recomendação: aceitar idempotência por `Idempotency-Key` (gerada pelo front no submit).

**Response 200**
```json
{
  "ok": true,
  "data": {
    "attempt_id": "uuid",
    "status": "submitted",
    "submitted_at": "2026-01-06T12:45:00Z"
  },
  "error": null,
  "request_id": "req_..."
}
```

**Erros**
- `410 expired`
- `409 already_submitted`
- `400 validation_error`

---

### 4) (Opcional) Autosave Server-side (PUBLIC)
**POST** `/api/v1/exams/draft`

> Se você quiser autosave também no servidor (além do localStorage).  
> **Não é obrigatório** para MVP, mas aumenta robustez.

- Salva respostas parciais com `final=false`.
- Pode ser rate-limited e não deve permitir salvar após expiração.

---

### 5) (Opcional) Consultar Status (INTERNAL)
**GET** `/api/v1/internal/exams/status?candidate_id=...`

> Útil para o orquestrador re-enviar link, verificar expiração, etc.

---

## Landing Page da Prova (Front-end)

### Rotas
- `/prova/:token` (preferido)  
  - Sem query strings, mais limpo e reduz vazamento via logs de analytics (ainda há referer, então cuide de headers).
- `/prova-invalida` (opcional)
- `/prova-concluida` (opcional)

### Componentes (recomendado)
1. **ExamGate**
   - Extrai token da URL.
   - Chama `/exams/session`.
   - Lida com estados: inválido/expirado/já enviado.
2. **ExamHeader**
   - Nome da etapa (ex.: “Prova Técnica”).
   - Timer regressivo.
   - Avisos (últimos 10 min, etc.).
3. **QuestionCard**
   - Título, enunciado, textarea dissertativa.
   - Contadores (opcional): caracteres/palavras.
4. **AutoSaveBanner**
   - Mostra “Rascunho salvo localmente” / “Falha ao salvar”.
5. **SubmitPanel**
   - Botão “Enviar Prova”.
   - Modal de confirmação.
   - Estado de loading.
6. **ExamCompletedScreen**
   - Mensagem final.

### UX e Acessibilidade
- Mobile-first: layout em coluna; botões grandes; inputs confortáveis.
- Acessibilidade:
  - labels vinculados aos textareas
  - foco visível
  - avisos com `aria-live` para mudanças do timer
- Evitar perda de conteúdo:
  - autosave local a cada X segundos + ao blur do textarea
  - detectar “navigate away” e alertar o usuário se não submeteu

### Conteúdo da prova (fixo)
- Pode estar:
  - embutido em JSON no build do front **ou**
  - retornado pelo backend em `/exams/session`.
- Recomendação: **retornar do backend**, pois permite atualização sem rebuild (ou com controle melhor).
  - Se quiser “congelar” a versão, armazene `exam_version` no attempt.

---

## Timer Persistente (1 hora)

### Regras do timer
- **A contagem começa na primeira validação real do token** (primeiro acesso).
- O servidor grava:
  - `started_at = now()`
  - `expires_at = started_at + 1 hour`
- O front:
  - recebe `server_time` e `expires_at`
  - calcula `time_remaining_seconds = expires_at - server_time`
  - inicia countdown local (setInterval)
- Em refresh/reabertura:
  - front chama novamente `/exams/session`
  - backend retorna tempo restante real.

### Considerações importantes
- Não confiar em `Date.now()` do cliente para regras de negócio.
- Se o usuário ficar offline:
  - timer local continua (UX)
  - mas submissão exigirá reconexão e validação final no servidor.
- Ao chegar a 0:
  - front deve:
    - bloquear inputs
    - tentar enviar automaticamente (`submit`)
    - se falhar por rede, mostrar instrução “conecte-se para enviar” (mas backend poderá marcar expired quando expirar).

---

## Segurança

### Ameaças principais
1. **Vazamento do token** (alguém obtém o link).
2. **Replay de token** (reuso após submit).
3. **Tentativa de burlar o tempo** (alterar relógio do PC / manipular JS).
4. **Ataques contra endpoints internos** (orquestrador).
5. **Exfiltração/abuso de dados** (respostas e PII).

### Controles obrigatórios
#### Token
- Gerar token com alta entropia (ex.: 32 bytes -> base64url).
- Armazenar **hash** (`SHA-256(token)`) no DB.
- Nunca persistir token puro no DB.
- Token uso único (após submit, invalida).
- Opcional: token “prefix” para suporte (primeiros 6 chars) — **não usar como segredo**.

#### Endpoints internos
- `X-Internal-API-Key` ou `Authorization: Bearer ...`
- (melhor) Assinatura HMAC:
  - headers: `X-Signature`, `X-Timestamp`, `X-Nonce`
  - assinatura: `HMAC_SHA256(secret, timestamp + "." + nonce + "." + body)`
  - rejeitar se timestamp fora da janela (ex.: 5 min) ou nonce repetido (guardar nonce por tempo curto em DB/redis; se não tiver, aceite API key simples no MVP).

#### Idempotência
- `Idempotency-Key`:
  - no `issue-link` e `submit`.
  - armazenar a chave e resultado para retornar em retries.
- Constraints no DB (unique parcial) evitando múltiplas tentativas ativas.

#### Rate limit e hardening
- Rate limit em endpoints públicos por IP/token:
  - `session`: ex. 30/min por IP
  - `submit`: ex. 10/min por token
- CORS:
  - permitir apenas o domínio do front.
- Headers:
  - `Content-Security-Policy` (CSP) restritiva
  - `X-Frame-Options: DENY` (evitar clickjacking)
  - `Referrer-Policy: no-referrer` (reduz vazamento de token via referer)
- Sanitização:
  - respostas são texto; armazenar como texto.
  - Ao exibir internamente, escapar HTML (evitar XSS no painel futuro).

#### Privacidade/LGPD
- Minimizar PII no front. O token basta.
- Em logs, **não logar token** (nem no front nem no backend).
- Se registrar IP/user-agent, preferir hash/anonimização e retenção limitada.

---

## Auditoria e Observabilidade

### Auditoria (DB)
Registrar no `audit_events`:
- `exam.link_issued` (orquestrador)
- `exam.started` (candidato)
- `exam.session_refreshed` (opcional)
- `exam.submitted`
- `exam.expired`
- `exam.invalid_token_access`

### Logging estruturado
- Sempre gerar `request_id` (UUID curto) e incluir em:
  - resposta JSON
  - logs do backend
  - eventos de auditoria
- Logs em JSON:
```json
{
  "level": "info",
  "request_id": "req_...",
  "route": "POST /api/v1/exams/submit",
  "attempt_id": "uuid",
  "candidate_id": "uuid",
  "event": "exam.submitted"
}
```

### Sentry (recomendado)
- Capturar:
  - erros em funções (DB connect, validação)
  - erros no front (crash, submit failing)
- Adicionar `request_id` como tag para correlacionar.

---

## Deploy, Configuração e Ambientes

### Estrutura de repositório (sugestão)
```text
repo/
  app/                       # Front-end (Vite + React)
    src/
      pages/
      components/
      lib/api.ts
    public/
    index.html
    vite.config.ts
    package.json
  netlify/
    functions/
      internal-issue-link.ts
      exams-session.ts
      exams-submit.ts
      exams-draft.ts (opcional)
  drizzle/                    # migrations (se usar Drizzle)
  .env.example
  netlify.toml
  README.md
```

### Variáveis de ambiente (Netlify)
- `NEON_DATABASE_URL` (string)
- `INTERNAL_API_KEY` (string)
- `HMAC_SECRET` (opcional)
- `APP_PUBLIC_BASE_URL` (ex.: `https://seuapp.netlify.app`)
- `SENTRY_DSN` (opcional)
- `NODE_ENV` (`production|development`)

> **Nunca** expor `NEON_DATABASE_URL` no front.

### Ambientes
- **Dev**: localhost + Neon dev
- **Staging**: deploy preview Netlify + Neon staging
- **Prod**: main branch + Neon prod

---

## Testes e Qualidade

### Unit tests
- Funções:
  - validação de token
  - cálculo de tempo restante
  - regras de transição de estado
  - hashing e idempotência
- Front:
  - componentes puros (timer, forms)

### Integration tests
- Netlify functions + Neon (staging):
  - emitir link
  - iniciar sessão
  - submeter
  - rejeitar após expiração

### E2E tests (recomendado)
- Playwright:
  - abrir link, ver perguntas, digitar, submeter
  - simular refresh e ver timer persistir
  - simular expiração (mock server_time ou set `started_at` no DB)

### Security tests (mínimo)
- Token inválido: 404/400 consistente
- Reuso do token após submit: 409
- Submit após expiração: 410
- Endpoint interno sem API key: 401

---

## Checklist de Implementação

### Banco
- [ ] Criar tabelas `exam_attempts`, `exam_answers`, `audit_events`
- [ ] Criar índices e constraints (unique parcial por candidato)
- [ ] Garantir `gen_random_uuid()` disponível (extensão `pgcrypto`)

### Backend
- [ ] Função `issue-link` (internal)
  - [ ] token random 32 bytes
  - [ ] hash SHA-256
  - [ ] idempotência por candidato + `force_new`
  - [ ] audit event
- [ ] Função `session` (public)
  - [ ] valida token
  - [ ] inicia timer no 1º acesso
  - [ ] retorna `expires_at` e questões
- [ ] Função `submit` (public)
  - [ ] valida token e prazo
  - [ ] grava respostas em transação
  - [ ] muda status e invalida token
  - [ ] audit event
- [ ] Sanitização de logs (não logar token)
- [ ] Rate limit (mínimo) e headers de segurança

### Front
- [ ] Rota `/prova/:token`
- [ ] Chamada `session` no mount
- [ ] Timer regressivo com base em `expires_at`
- [ ] Campos dissertativos
- [ ] Auto-save local
- [ ] Submit com confirmação + loading + tratamento de erro
- [ ] Tela final (sucesso) e tela de erro (token inválido/expirado)

### Operação
- [ ] Sentry (opcional)
- [ ] Documentar `.env.example`
- [ ] Testar em mobile e desktop

---

## Apêndices

### A) Padrão de erro (recomendado)
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "expired",
    "message": "O tempo da prova expirou.",
    "details": { "expires_at": "2026-01-06T13:00:00Z" }
  },
  "request_id": "req_..."
}
```

### B) Hash do token (exemplo)
- token: base64url(randomBytes(32))
- token_hash: sha256(token) -> hex string

### C) Conteúdo das questões (exemplo)
```json
[
  {
    "id": "Q1",
    "title": "Peça Processual",
    "prompt": "Redija uma peça..."
  },
  {
    "id": "Q2",
    "title": "Análise Jurídica",
    "prompt": "Explique o entendimento..."
  }
]
```

---

## Encerramento
Este blueprint descreve o módulo de prova com:
- Magic link seguro e auditável
- Timer persistente (1h) com autoridade do servidor
- Landing page responsiva e resiliente
- APIs claras para integração com o orquestrador
- Modelo de dados no Neon adequado para correção humana

> Próximo artefato sugerido (separado): **Workflow n8n** com roteamento por estado + chamadas HTTP idempotentes.
