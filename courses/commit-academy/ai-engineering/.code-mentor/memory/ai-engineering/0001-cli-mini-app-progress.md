---
status: in-progress
topic: Lab 02 — CLI mini-app (summarizer)
concepts:
  [process-argv, stdin, system-prompt, finish-reason, token-usage, exit-codes]
level: trainee
mode: guided-feature
updated: 2026-11-16
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
- [x] 3. Validation + usage + exit: args[0] must be `--summary`/`--category`/`--extract` (else error); `--help`/`-h` only valid at [0] and alone (args.length === 1) → usage, exit 0; no args → usage, exit 1; `flags.safeParse(raw)` (zod, cli-flags.type.ts) → error msg; flag without value; every run prints a hint line "si necesita ayuda, usa --help o -h" (suggest stderr so it doesn't mix with result)
- [ ] 4. Text input ← current (decided 2026-11-14: stdin + path): args[1] existing file path → read with fs; args[1] other → it's the text; no args[1] → read stdin (`cli --summary < texto.txt`); none of them → usage + exit 1
     --- mentor scope ends here; steps below are user-solo (help only if asked) ---
- [ ] 5. One system prompt per tool (summary/category/extract) + send systemPrompt in openai + vercel clients
- [ ] 6. Build params and call provider; print result + usage
- [ ] 7. Length warning (finish_reason length / max_tokens)
- [ ] 8. pnpm script `lab:02`
- [ ] 9. Tests with short/medium/long texts + analisis.md
- [ ] 10. README + .env.example

## Current step

Step 4: text input from args[1] (file path or literal text) or stdin.
Problem: today args[1] is ignored; `cli --summary < texto.txt` has no args[1] and must read stdin; a path should be read with fs.
Why: the statement asks for both `cli "texto"` and `cli < texto.txt`; path support was the user's choice.
Next action: explain the 3 sources and their order (args[1] path? → file; args[1] other → text; none → stdin; still empty → error + usage, exit 1). The "no text" check must run after all sources.
Open: user removed `console.log(result.data)` at the end — ask if intentional (step 6 prep). Optional from plan: hint line "usa --help o -h" every run (not done).
Minor: zod error path shows `→ at maxTokens` (internal key) — `keyToFlag` can fix it.
Later notes: `providers-params.types.ts` imports `./ai-model-names.types` without `.ts` — fine for type-only imports, breaks if imported at runtime. Pending (user deferred 2026-11-14): update design comment in command-line.ts (help at [0] wins over other args; [1] optional/stdin).

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

### 3b. Flag without value + usage message — 2026-11-16

- Did: missing-value check + exit 1; `keyToFlag`; tools as union of described literals; `usageMessage()`.
- Stuck on: listing keys showed internal camelCase names; `z.object` fed an array (keys became "0","1","2"); description modeled as an input field (`z.object({tool, description: z.string()})`); `Object.keys` wrapped around an array → "0,1,2"; array in template without `.join` → leading commas.
- Solved by: inverse function from schema (single source of truth); `.describe()` metadata on each literal inside `z.union`; tracing what each call returns.
- Lesson: A zod schema describes the shape of incoming data; info _about_ a value (a description) is metadata (`.describe()`), not a field. `z.object` takes `{key: schema}`, `z.union` takes `[schemas]` — passing an array where an object is expected silently turns indices into keys, same as `Object.keys([...])` → "0","1","2". When "0,1,2" or stray commas appear, check where an array is treated as an object or stringified without `.join`. `.extract/.exclude` exist only on `z.enum`.

### 3c. --help / no args — 2026-11-16

- Did: `--help`/`-h` at [0] → `console.info(usage)`, exit 0 (help wins even with more args — user's design, like git); no args → `console.error(usage)`, exit 1; both before `flagToKey(args[0])`.
- Stuck on: used `console.warn` for help (goes to stderr); first merged no-args with help (exit 0).
- Solved by: stdout/stderr table + `> /dev/null` check; `cli $EMPTY && echo ok` scenario for exit codes.
- Lesson: `console.log/info` → stdout, `console.warn/error` → stderr. Requested output (help) goes to stdout with exit 0; the same text shown because of a usage error goes to stderr with exit 1, so scripts (`&&`, pipes) can tell success from failure. Guard checks must run before any code that assumes the input exists (`flagToKey(undefined)` crashed).

## Where it lives in the repo

- `src/labs/02/command-line.ts`, `src/types/cli-options.type.ts`, `src/models/*.ts`, `src/types/providers-params.types.ts`

## Assets

- MDN — in operator: https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Operators/in (official)
- MDN — Array.prototype.map: https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Array/map (official)
- MDN — Conditional (ternary) operator: https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Operators/Conditional_operator (official)
- Zod — defaults / coercion / objects / extend: https://zod.dev/api (official)

- MDN — String.replace: https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/String/replace (official)
- MDN — Array.from: https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Array/from (official)
- MDN — padEnd: https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd (official)
- TS — Indexed Access Types: https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html (official)
- TS — Record: https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type (official)
- Zod — Metadata: https://zod.dev/metadata ; Unions: https://zod.dev/api#unions (official)
- Node — process.argv: https://nodejs.org/api/process.html#processargv (official)
- commander.js README: https://github.com/tj/commander.js/blob/master/Readme.md (official) — explained, not used
