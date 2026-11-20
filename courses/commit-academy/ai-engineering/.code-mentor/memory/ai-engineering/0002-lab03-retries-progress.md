---
status: in-progress
topic: Lab 03 — resilient LLM call (timeout + retries + exponential backoff with jitter)
concepts:
  [
    retries,
    exponential-backoff,
    jitter,
    timeout,
    http-status-codes,
    promises,
    finish-reason,
  ]
level: trainee
mode: guided-feature
updated: 2026-11-20
---

## Agreement

Goal: summarizer (3 points) with a "safe" call for lab 03 (`src/labs/03/statement.md`), to learn how to handle API failures.
You: all code (retry loop, backoff, timeout, cut warning, final 1-line error, README, analisis.md).
Me: explanations, traced examples, hints, reviews, done checks. No code in files.
Done: the 4 statement checks pass (chaos x10, 400 not retried, 0.001s timeout exhausted, 10 tokens → cut warning).
Async level: basic (knows Promise/await, never built a Promise by hand).

    [texto] ──▶ [retry loop (attempt)] ──▶ [client.responses.create (timeout, maxRetries:0)]
                  YOU   ▲     │ error                      YOU
                        │     ▼
                        │  [isRetry(err)?] ──no──▶ [1-line error + exit 1]  YOU
                        │     │ yes
                        └─ [sleep random(0, min(cap, base·2^n))]  (max 4 attempts)  YOU
                  success ──▶ [cut? → warning] ──▶ [summary]  YOU

## Plan

- [x] 1. Review `isRetry` + disable library retries (`maxRetries: 0`)
- [x] 2. Timeout on the call
- [x] 3. `sleep` helper + exponential backoff with jitter calc (formula goes inline in step 4)
- [ ] 4. Retry loop (max 4 attempts) using `isRetry` + backoff ← current
- [ ] 5. 1-line error when attempts run out
- [ ] 6. Check stop reason (cut warning)
- [ ] 7. 4 checks + screenshots + analisis.md + README

## Current step

Step 4: retry loop — code written, NOT verified yet.
Problem: chaos model fails randomly; one failure = whole call fails, though a retry would likely succeed.
Why this way: generic `withRetries<T>(call: () => Promise<T>, opts)` in `error-helpers.ts`; `useOpenai` stays one attempt (owns `timeoutMs`). Takes a function, not a promise: a promise is already started, re-awaiting returns the same rejection with no new HTTP call.
Done so far: `maxAttempts` default 4; `withRetries` written (for without condition — exits via return/throw; throw if `!isRetry || attempt === maxAttempts - 1`; `waitMs = retryAfterMs ?? Math.random() * Math.min(capMs, baseMs * 2 ** attempt)`; log; `await sleep(waitMs)`); import fixed with `.ts`; comments on sleep/timeout corrected; call wrapped at bottom of `openai.securecall.ts` (`chaos_input`, `fast_input`).
Left / not run:
- Current call uses `fast_input` with NO options to `useOpenai` → `timeoutMs` default 1000 ms; real model likely needs >1 s for 200 tokens → probable `Request timed out.` on every attempt. User was asked to paste the error to confirm (not confirmed). Also: `fast` costs budget — use `chaos` for failure tests.
- Decide one shared options object vs two (`requestOptions` = `{ timeoutMs }`, `retryOptions` = `{ maxAttempts }`); both typed `Partial<RetryOpt>`, each fn destructures only its part.
- Optional nits mentioned once: `waitMs` has decimals in log; log counts from `reintento 0`.
Next: switch back to `chaos_input` (or raise timeout for fast), run `pnpm lab:03` = done check.
Done check: `pnpm lab:03` with chaos → "[reintento n] ..." lines then summary, or final error after 4 attempts.
Clarified: statement's "fast + empty messages" is a step-7 test (send `messages: []` on purpose → real 400, not retried), not fast's normal behavior.

## Log

### 1. Disable SDK retries + review isRetry — 2026-11-20

- Did: `maxRetries: 0` in `new OpenAI({...})`, removed from request options, comment with 12-vs-4 trace; `isRetry` reviewed (timeout covered: `APIConnectionTimeoutError extends APIConnectionError`); `retryOpt.prefault({})`.
- Stuck on: `retryOpt.parse(undefined)` → ZodError "expected object, received undefined"; asked whether `.default({})` on the object fixes it.
- Solved by: traced the call; tested `.default({})` → `{}` vs `.prefault({})` → filled defaults.
- Lesson: SDKs retry on their own (OpenAI default `maxRetries: 2`); if you also retry, attempts multiply (3 × 4 = 12), so only one layer may retry — set it once on the client. Inner `.default()`s in a `z.object` only fill missing fields of an object that exists; for an `undefined` input use `.prefault({})` (input value, gets parsed) not `.default({})` (output value, returned as-is in zod 4, skips inner defaults). Spot it when parse returns `{}` or throws "expected object, received undefined".

### 2. Timeout — 2026-11-20

- Did: `timeoutMs` field in `retryOpt` (fixed description: max duration of one attempt), `timeout: timeoutMs` in request options, removed `customTimeout`; tested `{ timeoutMs: 1 }` → `Request timed out.`
- Stuck on: TS error "Type '{ timeoutMs: number; }' is missing ... maxAttempts, baseMs, capMs" — used `z.infer` (output type) as the parameter type; first described timeout as the wait between requests (that's backoff).
- Solved by: input vs output diagram of a schema with defaults; `z.input` vs `Partial<z.infer>` (chose Partial).
- Lesson: Timeout = max time for ONE attempt (fixed); backoff = wait BETWEEN attempts (random, growing) — never derive one from the other. A zod schema with `.default()` has two types: input (defaulted fields optional, `z.input`) and output (all required, `z.infer`/`z.output`); parameters before `.parse` take the input type, values after `.parse` are already the output type by inference. Spot it when TS says "missing properties" that have defaults. SDK timeout is in ms: 0.001 s = `timeout: 1`.

### 3. sleep + backoff idea — 2026-11-20

- Did: `sleep(ms)` with `new Promise` + `setTimeout(resolve, ms)`; verified 0 ms on call, ~500 ms after await; rewrote comment; studied course `withRetries` example.
- Stuck on: thought sleep "executes at the end and frees the process"; mixed sleep with the anti-herd reason; wrote range numbers wrong (0–1 ms, 3000 ms); thought Retry-After can never be 0.
- Solved by: timeline trace of sleep/resolve/await; table of attempt → max range (1000, 2000, 4000…); `Number(null)` = 0 table.
- Lesson: `sleep` runs immediately and returns a pending Promise; after `ms` setTimeout calls `resolve`, and only the function doing `await` continues — the Node process never stops. `sleep` only knows HOW to wait; HOW LONG (backoff/Retry-After) is computed elsewhere, and that is what prevents the thundering herd. With full jitter what grows is the max of the range (base·2^attempt, capped), the wait itself is random inside it. `??` only falls back on null/undefined, so a helper must return `null` (not 0/NaN) to mean "no value" — `Number(null)` is 0, so guard with `> 0`.

## Where it lives in the repo

- `src/labs/03/openai.securecall.ts`, `src/labs/03/error-helpers.ts`, `src/labs/03/variables.ts`, `src/types/retry-options.types.ts`

## Assets

- Zod — defaults / prefaults: https://zod.dev/api#defaults , https://zod.dev/api#prefaults (official)
- openai-node README handling errors / retries / timeouts (user already has it in `src/labs/03/readme.md`)
