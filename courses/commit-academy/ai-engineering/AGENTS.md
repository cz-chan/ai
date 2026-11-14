# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Learning repo for the Commit Academy "AI Engineering" course (RAG, agents, AI evals/security, observability: latency, cost, tokens). User is learning — code comments, lab statements and notes are in Spanish; keep that language in comments/docs.

## Agent Task

Your job as a programmer assistant is to help users by using the code-mentor skill to assist them in coding building what they need. Always follow the skill’s guidelines and **NEVER** give them the solution directly; instead, help them think through resources and examples so they can come up with the solution on their own.

## Commands

Package manager: pnpm. Scripts run TS directly with Node's native type stripping (no ts-node/tsx) and load `.env` via `--env-file`.

- `pnpm lab:01` — run lab 01 (`src/labs/01/llm-call.ts`)
- `pnpm test:openai` / `test:anthropic` / `test:vercel` — run a provider module directly (only does something if its trailing `console.log` block is uncommented)
- `pnpm dev` / `pnpm build` (`tsc && vite build`) / `pnpm preview` — Vite browser shell (`index.html` → `src/index.ts`, currently empty)
- Typecheck: `pnpm exec tsc` (`noEmit`; `noUnusedLocals`/`noUnusedParameters` on)

No test framework or linter configured.

## Environment

`.env` (see `.env.template`): `PRACTICE_API_URL_OPENAI`, `PRACTICE_API_URL_ANTHROPIC`, `PRACTICE_API_KEY` — a course-provided practice gateway, not real OpenAI/Anthropic. `src/config/envs.ts` reads `import.meta.env` (Vite) or `process.env` (Node) and throws on missing vars at import time.

## Architecture

- `src/models/{openai,anthropic,vercel}.ts` — thin low-level clients (`useOpenai`, `useAnthropic`, `useVercel`), all pointed at the practice gateway. They take a common `ProvidersParams` and return the **raw SDK response** (no try/catch, no formatting) — errors bubble up to the caller. Vercel uses `@ai-sdk/openai-compatible` against the OpenAI-compatible URL.
- `src/labs/NN/` — one folder per course lab. Each lab file contains the exercise statement (`ENUNCIADO`) as a top comment, does provider-specific response parsing (text, finish/stop reason, token usage) via an exhaustive `switch` on `Providers` with a `never` default, and runs itself at module bottom. `respuestas.md` holds the user's experiment notes/answers.
- `src/types/` — zod-derived types. Model names are gateway aliases, not real model IDs: `fast`, `smart`, `embed`, `rerank`, `chaos` (fails on purpose, for retry practice). `Providers = "openai" | "anthropic" | "vercel"`.
- `src/prompts/` — reusable prompt strings.

## Conventions

- ESM with explicit `.ts` extensions in relative imports (`allowImportingTsExtensions`, `verbatimModuleSyntax` → use `import type`). `erasableSyntaxOnly` is on: no enums, namespaces or parameter properties (Node type stripping can't run them).
- Tabs for indentation.
- `.claude` is a symlink to `.agents`; project skills live in `.agents/skills/` (e.g. `code-mentor` for guided learning sessions).
