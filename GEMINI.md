# Project: Online Exam System (ADV)

## Project Context
We are developing the **Online Exam** module for a lawyer screening process.
- **Objective**: Landing page for taking a technical exam with a persistent timer and essay answer submission.
- **Architecture**:
    - **Frontend**: React + Vite + TypeScript (hosted on Netlify).
    - **Backend**: Netlify Functions (Node.js/TypeScript).
    - **Database**: Neon (Postgres) as the single source of truth.
    - **Orchestration**: n8n (external, issues links).
- **Key Features**:
    - Magic Link for access (passwordless).
    - 1-hour timer controlled by the server (persistent).
    - Local auto-save and server-side token validation.

## General Instructions
- **Language Rule**: You must ALWAYS respond in Brazilian Portuguese, even though this file is in English.
- When you generate new TypeScript code, follow the existing coding style.
- Ensure all new functions and classes have JSDoc comments.
- Prefer functional programming paradigms where appropriate.
- **Database First**: The database is the source of truth. Dates and states are controlled by the backend/DB, not the frontend.
- **Security**: Treat Magic Links as credentials. Tokens are never saved in plain text (always hashed).
- **Idempotency**: Critical endpoints (link issuance, submission) must be idempotent.

## Coding Style
- Use 2 spaces for indentation.
- Prefix interface names with `I` (for example, `IUserService`).
- Always use strict equality (`===` and `!==`).
- **Tech Stack**:
    - React (Functional Components, Hooks).
    - TypeScript (Strict mode).
    - Tailwind CSS (for styling, if necessary).
    - Zod (for schema validation).
    - Drizzle ORM (optional, but preferred for typed SQL interactions).

## Directory Structure (Reference)
- `/app`: Frontend (React + Vite).
- `/netlify/functions`: Backend (Serverless functions).
- `/drizzle`: Migrations and database schemas.
