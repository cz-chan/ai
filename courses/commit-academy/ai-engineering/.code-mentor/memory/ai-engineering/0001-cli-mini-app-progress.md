---
status: in-progress
topic: Lab 02 — CLI mini-app (summarizer)
concepts:
  [process-argv, stdin, system-prompt, finish-reason, token-usage, exit-codes]
level: trainee
mode: guided-feature
updated: 2026-11-14
---

## Agreement

Goal: CLI summarizer (3 key points) for lab 02 (`src/labs/02/statement.md`), to learn how to build a CLI around an LLM call.
You: everything (input reading, usage message, system prompt in the 3 providers, output + tokens + length warning, README, .env.example, analysis).
Me: explanations, hints, traced examples, done checks — ONLY for the command line (steps 1–4: argv parser, validation/usage/exit, stdin). No code in files.
Scope change 2026-11-14: user wants to do steps 5+ (systemPrompt in providers, Claude/LLM calls, output, length warning, script, tests, docs) ON THEIR OWN, without guidance. When step 4 is done, tell them explicitly "the CLI part is finished; from here it's yours" and only help if they ask.
Done: `node --env-file=.env src/labs/02/command-line.ts "texto"` and `... < texto.txt` print 3 points + tokens; no input → usage + exit 1; low maxTokens → length warning.
Explanations: normal (trainee level).

    [terminal] ──argv / stdin──▶ [readInput] ──texto──▶ [build params: system + user]
       user                          YOU                         YOU
                                                                  │
    [print result + tokens + length warning] ◀── [useOpenai/useAnthropic/useVercel]
                     YOU                                 YOU (add systemPrompt)

## Plan

- [x] 1. Read text from argv (first arg)
- [x] 2. Hand-written arg parser: `--model <name>` + `--max-tokens <n>` from index 2, any order, unknown ignored, raw `Record<string,string>` via flag→key map (no libraries, user's choice)
- [ ] 3. Validation ← current + usage + exit: args[0] must be `--summary`/`--category`/`--extract` (else error); `--help`/`-h` only valid at [0] and alone (args.length === 1) → usage, exit 0; no args → usage, exit 1; `flags.safeParse(raw)` (zod, cli-flags.type.ts) → error msg; flag without value; every run prints a hint line "si necesita ayuda, usa --help o -h" (suggest stderr so it doesn't mix with result)
- [ ] 4. Text input (decided 2026-11-14: stdin + path): args[1] existing file path → read with fs; args[1] other → it's the text; no args[1] → read stdin (`cli --summary < texto.txt`); none of them → usage + exit 1
     --- mentor scope ends here; steps below are user-solo (help only if asked) ---
- [ ] 5. One system prompt per tool (summary/category/extract) + send systemPrompt in openai + vercel clients
- [ ] 6. Build params and call provider; print result + usage
- [ ] 7. Length warning (finish_reason length / max_tokens)
- [ ] 8. pnpm script `lab:02`
- [ ] 9. Tests with short/medium/long texts + analisis.md
- [ ] 10. README + .env.example

## Current step

Step 3: validation + usage + exit codes.
Problem: raw parse accepts bad input silently: `--model` last → `{ model: undefined }`; `--model --max-tokens 100` → `{ model: '--max-tokens' }`; `--to-string x` / `--constructor y` pass the `in` check (inherited Object.prototype props; harmless after safeParse strips unknown keys, but `Object.hasOwn` is the exact check); args[0] tool not validated yet; `--help`/`-h` not handled.
State: schemas in `src/types/cli-options.type.ts`: `flagsSchema` {model, maxTokens} (loop whitelist via `.shape`) and `toolsSchema` {tools} (no default, mandatory; suggested rename key to `tool`). Option C agreed as plan: in step 3 combine with `flagsSchema.extend(toolsSchema.shape)` → one safeParse, one error branch.
Next: fill rawFlags.tool from args[0] (strip "--"), handle flag-without-value (value missing or starts with "--"), safeParse combined schema, print usage + exit codes.
Pending (user deferred 2026-11-14): update design comment in command-line.ts — [1] optional (stdin), --help only at [0] and alone + hint line every run, positions as "from [2], `--flag value` pairs".
Later notes: `providers-params.types.ts` imports `./ai-model-names.types` without `.ts` — fine for type-only imports, breaks if imported at runtime (e.g. `llmModelNames` for validation → import from `ai-model-names.types.ts` directly). Stdin/path (step 4) also count as text, so the "no text" check must run after all sources. Scope 2026-11-14: user chose 3 tools with mandatory [0] (statement asks for one; extra is fine, but `cli "texto"` from statement no longer works — user accepted).

## Log

### 1. Read text from argv — 2026-11-14

- Did: logged `process.argv`, ran with quotes / without quotes / no arg; read `process.argv[2]`.
- Stuck on: nothing.
- Lesson: `process.argv[0]` is node, `[1]` the script, user args start at `[2]`; the shell splits unquoted words into separate args, and a missing index is `undefined`.

### 2. Hand-written arg parser — 2026-11-14

- Did: `flagToKey` (slice/split/map/join, ternary in map), loop from index 2 with `key in flagsSchema.shape` whitelist, `rawFlags[key] = args[i + 1]; i++`. Schema is the single source of truth (no hand-written map).
- Stuck on: `import type` erases the import so the schema module never loaded; `toUpperCase()` result discarded (strings immutable) and `segment[i]` indexed a letter, not the segment; ternary used as a statement with an assignment inside.
- Solved by: explanation of type erasure; traced `"tokens"[1]` → "o"; ternary as the returned expression of an arrow without braces.
- Lesson: `import type` disappears at runtime — anything used as a value (a zod schema for `.shape`/`.safeParse`) needs a normal import. String methods never modify the string, they return a new one, so their result must be returned or stored. A ternary is an expression that produces a value: put it where the value goes (`return`, arrow body), never use it to run assignments. Spot it when a ternary's result isn't used by anything.

## Where it lives in the repo

- `src/labs/02/command-line.ts`, `src/types/cli-options.type.ts`, `src/models/*.ts`, `src/types/providers-params.types.ts`

## Assets

- MDN — in operator: https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Operators/in (official)
- MDN — Array.prototype.map: https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Array/map (official)
- MDN — Conditional (ternary) operator: https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Operators/Conditional_operator (official)
- Zod — defaults / coercion / objects / extend: https://zod.dev/api (official)

- Node — process.argv: https://nodejs.org/api/process.html#processargv (official)
- commander.js README: https://github.com/tj/commander.js/blob/master/Readme.md (official) — explained, not used
