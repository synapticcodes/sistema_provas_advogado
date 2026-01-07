# AGENTS.md — Online Exam System (ADV)

> This file contains specific instructions for **coding agents** to work effectively on this project.  
> For general human onboarding information, see `README.md`.

---

## Language Rule

> [!IMPORTANT]
> **You MUST always respond in Brazilian Portuguese**, even though this file and all documentation are in English.

---

## Project Overview

This is the **Online Exam** module for lawyer screening. The system uses:

- **Frontend**: React + Vite + TypeScript (hosted on Netlify)
- **Backend**: Netlify Functions (Node.js/TypeScript)
- **Database**: Neon (Postgres) — single source of truth
- **External Orchestrator**: n8n (issues magic links)

### Main Features
- Magic Link for exam access (passwordless)
- Persistent 1-hour timer (server-controlled)
- Local auto-save + essay answer submission
- Audit trails and idempotency on critical endpoints

---

## Dev Environment Tips

- Use `pnpm dlx turbo run where <project_name>` to jump to a package instead of scanning with `ls`.
- Run `pnpm install --filter <project_name>` to add the package to your workspace so Vite, ESLint, and TypeScript can see it.
- Use `pnpm create vite@latest <project_name> -- --template react-ts` to spin up a new React + Vite package with TypeScript checks ready.
- Check the `name` field inside each package's `package.json` to confirm the right name—skip the top-level one.

### Project Structure
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
      exams-draft.ts (optional)
  drizzle/                   # migrations (if using Drizzle)
  .env.example
  netlify.toml
  README.md
```

### Environment Variables
Copy `.env.example` and configure:
- `NEON_DATABASE_URL` — Neon connection string
- `INTERNAL_API_KEY` — key for internal endpoints (n8n)
- `APP_PUBLIC_BASE_URL` — e.g., `https://yourapp.netlify.app`
- `SENTRY_DSN` (optional)

> ⚠️ **Never** expose `NEON_DATABASE_URL` to the front-end.

---

## Testing Instructions

- Find the CI plan in the `.github/workflows` folder.
- Run `pnpm turbo run test --filter <project_name>` to run every check defined for that package.
- From the package root you can just call `pnpm test`. The commit should pass all tests before you merge.
- To focus on one step, add the Vitest pattern: `pnpm vitest run -t "<test name>"`.
- Fix any test or type errors until the whole suite is green.
- After moving files or changing imports, run `pnpm lint --filter <project_name>` to be sure ESLint and TypeScript rules still pass.
- Add or update tests for the code you change, even if nobody asked.

### Expected Test Types

| Type | What to Test |
|------|--------------|
| **Unit** | Token validation, time remaining calculation, state transitions, hashing, idempotency |
| **Integration** | Full flow: issue link → start session → submit → reject after expiration |
| **E2E** | Playwright: open link, see questions, type, submit, simulate refresh and verify timer persists |
| **Security** | Invalid token (404), reuse after submit (409), submit after expiration (410), endpoint without API key (401) |

---

## Code Style Guidelines

- Use **2 spaces** for indentation.
- Prefix interfaces with `I` (e.g., `IUserService`).
- Use strict equality (`===` and `!==`).
- Prefer **functional components** and **hooks** in React.
- TypeScript in **strict mode**.
- Use **Zod** for schema validation.
- Use **Drizzle ORM** for typed DB interactions (optional but preferred).

### API Patterns (Netlify Functions)
- Version prefix: `/api/v1/...`
- Consistent JSON responses:
```json
{
  "ok": true,
  "data": { ... },
  "error": null,
  "request_id": "req_..."
}
```

---

## Security Considerations

### Tokens
- Generate tokens with high entropy (32 bytes → base64url).
- Store **only the hash** (`SHA-256`) in the DB.
- Token is **single-use** (invalidated after submit).

### Internal Endpoints
- Require `X-Internal-API-Key` or `Authorization: Bearer ...`.
- Optional: HMAC signature for enhanced security.

### Security Headers
- Restrictive `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- CORS only for the front-end domain

### Logging
- **Never** log the token (neither in front-end nor backend).
- Use `request_id` for log correlation.
- Prefer hash/anonymization for IP/user-agent.

---

## PR Instructions

- Title format: `[<project_name>] <Title>`
- Always run `pnpm lint` and `pnpm test` before committing.
- Ensure all tests pass before merging.
- Update tests for any code you modify.

---

## Commit Message Guidelines

Use clear and descriptive commit messages:
```
<type>(<scope>): <short description>

[optional body with more details]
```

Common types:
- `feat`: new feature
- `fix`: bug fix
- `refactor`: refactoring without behavior change
- `test`: adding/modifying tests
- `docs`: documentation
- `chore`: maintenance tasks

---

## Database First Principle

The database is the **single source of truth**:
- Dates and states are controlled by the backend/DB, not the frontend.
- The front-end **does not decide** what's valid, it only displays and sends.
- Timer and expiration are calculated on the server.

### Main Tables
- `exam_attempts` — controls token, state, start time, expiration, completion
- `exam_answers` — stores essay answers
- `audit_events` — events for auditing

---

## Idempotency Guidelines

Critical endpoints must be **idempotent**:
- Use `Idempotency-Key` in `issue-link` and `submit`.
- Store the key and result to return on retries.
- DB constraints (partial unique) prevent multiple active attempts.

---

## Additional Resources

- See `blueprint_prova_adv.md` for complete technical specification.
- See `GEMINI.md` for model context instructions.
