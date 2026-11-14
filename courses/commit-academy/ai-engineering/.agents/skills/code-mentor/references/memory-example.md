# Memory file examples

Examples of how to write files in `.code-mentor/memory/` (see section 6 of `SKILL.md`).
This file is a reference only — never copy it into `.code-mentor/memory/` and never treat
it as the learner's real progress.

The rules (files in English, length of each log field) are in section 6 of
`SKILL.md`; these examples show them applied. Write real files in English too,
even if the user speaks another language.

---

## Example 1 — progress file, mode A, halfway

Path: `.code-mentor/memory/databases/0002-neon-likes-progress.md`

```markdown
---
status: in-progress
topic: Like button with Neon
concepts: [postgres, neon, db-connection, env-vars, sql-insert]
level: junior
mode: guided-feature
updated: 2026-10-13
---

## Agreement

Goal: like button on c12z.io, to learn databases.
You: Neon setup, connection, schema, insert and count queries.
Me (code in the console, you paste it): button UI, API route wiring, tests.
Done: click → the count goes up and survives a reload.
Explanations: more detail, with examples.

    [Button] ──click──▶ [API /likes] ──query──▶ [Neon DB]
       me                  me                    YOU

## Plan

- [x] 1. Neon project + connection string in .env
- [x] 2. Connect from the API
- [ ] 3. Schema: `likes` table ← current
- [ ] 4. Insert a like
- [ ] 5. Count likes per post
- [ ] 6. Wire button → API → DB

## Current step

Step 3: design the `likes` table.
Problem: the API connects, but nothing stores a like, so a reload loses the count.
Why this way: one row per like, not a counter column, so a user can undo their
like and cannot like the same post twice.
Next: decide the columns (`post_id`, `created_at`, `user_id`?).

## Log

### 1. Neon project + .env — 2026-10-12

- Did: created the Neon project and saved the connection string in `.env`.
- Stuck on: did not know what `?sslmode=require` meant and deleted it.
- Solved by: each part of the URL was explained; read Neon's "Connect" page.
- Lesson: a connection string is not just an address: it holds the user,
  password, host, database name and options. `sslmode=require` forces an
  encrypted connection; without it Neon rejects the connection because it
  does not accept unencrypted ones. Rule: do not remove parameters from a
  connection URL without knowing what they do. If the connection fails right
  after editing the URL, check first what you removed.

### 2. Connect from the API — 2026-10-13

- Did: `SELECT 1` from the Hono route with `@neondatabase/serverless`.
- Stuck on: imported the DB client in a browser component, so the
  connection string reached the client.
- Solved by: moved the query to the server route and read the environment
  variable there.
- Lesson: all code that runs in the browser is public: it gets downloaded
  and anyone can read it in devtools. The connection string contains the DB
  password, so it can only live on the server, and the client talks to the
  DB only through your API. Next time: before using a secret in a file, ask
  yourself where that file runs.

## Where it lives in the repo

- `src/pages/api/likes.ts`, `.env`

## Assets

- Neon — Connect from any app: <url> (official)
- Hono — Environment variables: <url> (official)
```

---

## Example 2 — finished, mode B (explain X)

Path: `.code-mentor/memory/realtime/0001-websockets-basics-2026-10-12.md`

No `## Agreement`, `## Plan` or `## Current step`: mode B is one short
explanation with a mini practice, so it has a single log entry.

```markdown
---
status: done
topic: What WebSockets are
concepts: [websockets, http, handshake, full-duplex]
level: trainee
mode: explain
updated: 2026-10-12
---

## Summary

Difference between HTTP (request → response) and WebSocket (a channel open
in both directions). Practiced in the console with `websocat` against an
echo server. Final multiple-choice question: correct.

## Log

### 1. WebSockets basics — 2026-10-12

- Did: opened a connection with `websocat`, sent messages and saw the echo.
- Stuck on: thought the server can only reply, not send on its own.
- Solved by: was shown a server that sends the time every second without
  the client asking.
- Lesson: in HTTP the server only speaks when the client asks. A WebSocket
  starts as an HTTP request (the handshake) and then stays open: both sides
  can send whenever they want. That is why it works for chats or real-time
  notifications. If you need the server to notify the client without being
  asked, plain HTTP is not enough.

## Assets

- MDN — WebSockets API: <url> (official)
- websocat README: <url> (unofficial)
```

---

## When a progress file is finished

1. `status: in-progress` → `status: done`, update `updated`.
2. Replace `## Current step` with `## Summary` (3 lines: what they learned,
   the final quiz result).
3. Rename `0002-neon-likes-progress.md` → `0002-neon-likes-YYYY-MM-DD.md`.
