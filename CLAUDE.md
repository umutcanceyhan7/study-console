# CLAUDE.md — LearningPlatform

Project rules for Claude Code when working in this repository.

## Ground rule: source of truth

Every factual claim about Claude, Claude Code, the Claude Agent SDK, the Anthropic API, or MCP that ends up in study notes, error analyses, quiz explanations, or commentary in this repo **must be verified against a primary source before it is written**. Nothing goes in on model recall alone.

Authoritative sources, in priority order:

1. **Official Anthropic / Claude documentation** — `platform.claude.com/docs`, `code.claude.com/docs`, `anthropic.com/engineering`, and the Anthropic Cookbook.
2. **`ClaudeCertifiedArchitectFoundationsGuide.pdf`** in this repo — the official Claude Certification Program exam guide (CCAR-F, version 1.0, effective July 2026, 39 pages). This is the authoritative statement of *what the exam tests*: the blueprint weights, the six scenarios, and the per-domain task statements with their Knowledge/Skills bullets. It is not a product-behavior reference — when a task statement names an API surface that current docs have since renamed, source 1 wins on behavior and the divergence gets written down. Cite by page and task statement.
3. **Official MCP specification and docs** — `modelcontextprotocol.io`.
4. **`exam-preparation-guide.md`** in this repo — the curated CCA-F/CCAR-F study guide. This file *is* Daron Yöndem's guide: it is byte-identical to `exam-preparation-guide.md` in [daronyondem/claude-architect-exam-guide](https://github.com/daronyondem/claude-architect-exam-guide) (blob `036e43c9`, verified 2026-08-12). The published PDF/EPUB are rendered from it, so there is no separate PDF to consult — cite the local file by section and line.

Before relying on the local guide, check whether upstream has moved:

```bash
git hash-object exam-preparation-guide.md
```

Compare against the upstream blob sha for that path. If they differ, refresh the local copy before citing it.

Practice-exam answer keys (Udemy or any other third-party course) are **not** a source of truth. They are inputs to be checked. When a practice exam's "correct" answer conflicts with a primary source, the primary source wins, and the conflict must be written down explicitly in the note rather than quietly resolved.

### Every claim ships with a clickable path back to its source

A citation the reader cannot follow is not a citation. Anything rendered in the app that asserts what the official documentation says — the `official` block on a mistake record, a note section, a `summary` line — must carry a link the reader can click to land on the passage it was derived from.

Rules:

- **Deep-link, don't page-link.** Use the section anchor, not the page root: `https://code.claude.com/docs/en/hooks#pretooluse`, not `.../hooks`. Anchors come from the page's own heading slugs — read them from the raw markdown (`curl -sL <page>.md`) rather than guessing.
- **The link goes where the claim is**, inside the same visual block. In `index.html` the `official` callout renders `srcJump(m.docs)`, which uses `docs[0]` and appends "(ilgili bölüm)" when the URL has a fragment. Note sections use the same `.srcline` markup.
- **No source, say so in the UI.** When a claim rests only on `exam-preparation-guide.md`, render the `.srcline none` variant naming the section and line range instead of a link. Never leave the claim looking documented when it is not.
- **Verify anchors resolve.** A fragment that no longer matches a heading silently drops the reader at the top of the page — recheck when refreshing citations.

### How this applies in practice

- Before writing an explanation, locate it in a source above. If it cannot be located, mark it `UNVERIFIED` and say which source was searched — do not paraphrase it as fact.
- Cite the anchor for each claim: a docs URL, or `exam-preparation-guide.md` section/line, or the PDF page.
- Flag disagreements between sources instead of picking one silently.
- Prefer current docs over the guide or the PDF when they conflict — the product surface moves; note the date of the check.
- Distinguish "the exam expects X" from "the docs say X" whenever the two diverge. Both belong in the note.

## Repository purpose

Static single-page study console for CCA-F / CCAR-F certification prep, deployed to GitHub Pages. `index.html` is the app; `exam-preparation-guide.md` is the curated study source.

## Conventions

- `index.html` is self-contained — no external runtime dependencies.
- Run `node scripts/validate.mjs` before committing changes to `index.html`.
- Study notes follow the existing note-card structure in `index.html`.
- Syntax cheat-sheet entries live in the `USAGE` array (`#/usage`), one card per blueprint task
  statement. A card is only worth adding when the exam can ask *which spelling is correct*: it must
  carry at least one `good` snippet **and** at least one `bad` lookalike, and `validate.mjs` fails
  the build if the `bad` list is empty. Prefer real competing syntax (OpenAI's `tool_choice`
  vocabulary, shell-style `$VAR`) over invented strawmen. `tasks` may span domains, but at least one
  entry must match the card's own `domain`.

### One claim, one owner

A note and a card are not two places to say the same thing. **A note decides; a card spells.** When
a fact appears in both, the note keeps only the sentence that changes an answer and links to the
card with `href="#/usage" onclick="return jumpTo('<card-id>')"`; the card keeps the table, the
values, and the wrong lookalikes. The same rule holds between two notes: the deeper treatment owns
the claim and the other one links to it in a sentence.

This is a maintenance rule, not a style preference. A duplicated claim gets updated in one copy when
the docs move, and the other copy goes quietly stale — which is the failure mode the source-of-truth
rule above exists to prevent.

`jumpTo(id)` scrolls when the target is on the current page and otherwise lets the `href` navigate,
stashing the id in `pendingJump` for `router()` to flush after render. Do not reintroduce
`requestAnimationFrame` there: rAF never fires while the tab is hidden and the jump silently drops.

### Notes without a blueprint task

`tasks: []` alone cannot distinguish "nobody wrote the task down" from "the blueprint has no task for
this". Notes in the second group carry `crosscut: true`, which renders as *No blueprint task —
cross-cutting note* on the detail page and `· cross-cutting` on the list. Only exam-technique and
cross-domain notes qualify (`distractor-axes`, `simplest-first`, `cost-levers`); anything with a real
home in the blueprint gets the task instead. Note `domain` must match every `tasks` prefix —
`validate.mjs` enforces it — so a note whose subject lives in another domain gets its `domain`
corrected rather than a mismatched task bolted on.

## Question bank (`#/bank`)

646 questions from three sources: 310 from the first Udemy course (Practice Exams 1–3 + BONUS Set 1
+ BONUS Set 2, exams 1/2/3/5/6), 276 from CertSafari across eleven attempts (exams 7 and 9–18), and 60
from a second Udemy course ("Claude Certified Architect Foundations - 6 Practice Exams", Practice
Test 1, exam 8).
Separate from `M_BUILTIN` in every way — do not merge them.
The scrape-to-embed pipeline for both platforms is written down in `INGEST.md` — read it before
adding another exam. The record schema itself — every field, and which violation kills the build —
lives in `SCHEMA.md`, and it is enforced, not advisory.

**Blueprint task statements and `#/tasks`.** A record's `subdomain` string
(`"Subdomain 2.4: Integrate MCP servers into Claude Code and agent workflows"`) is validated at build
time against `scripts/tasks.mjs` — the 30 task statements, titles taken verbatim from the PDF
(pp.5-23), which match CertSafari's strings 30/30. `build-bank.mjs` writes the bare id
(`task: "2.4"`) into the record and **drops the long string**: the title's single owner is the
`TASKS` table in `index.html`, whose copy `validate.mjs` asserts against `scripts/tasks.mjs`.

`#/tasks` (Alt konu sınavı) draws only from tagged records — **276 of 646 today, all CertSafari**;
Udemy questions carry no subdomain and are invisible there. A question leaves that pool permanently
once answered **correctly** (`BSTORE.taskSolved`, localStorage, exportable from the screen); a wrong
answer keeps it in rotation. Untagged questions are tagged by hand through
`scripts/bank-subdomains.json` (`{ id: { task, why } }`, committed, `why` mandatory because a hand
tag is an inference) — data, not code: add a line, rebuild, the question appears. The blob's meta
carries a `tasks` histogram so the picker shows real counts while the bank is still locked.
`NOTES[].tasks` and `USAGE[].tasks` are now checked for membership in that table, not just against a
regex. Full rules in `SCHEMA.md`.

**Id namespace.** Bank ids are `b<udemyAssessmentId>`; mistake records are `e<exam>q<n>`. They must
never collide. The course rewrote its entire bank in August 2026 (`EXAMS v2`), so `M_BUILTIN`'s
records come from a **revision that no longer exists upstream**: spot-checked signature questions
(`updatedToolOutput`, batch `custom_id`, `permissionDecision: "ask"`) return zero hits in the current
bank, and every quiz now serves exactly 60 questions where the old logs say 65/60/65/70. There is no
per-question mapping between the two sets, and none should be invented. The only shared axis is
`topic`.

**Domain tags are not inferred — with one recorded exception.** They come from the API's own
`section` field, mapped 1:1 to `TOPICS` in `scripts/build-bank.mjs`. The exception is BONUS Set 2
(`exam: 6`, quiz 7599280): that quiz's `section` field carries the *scenario* name ("Scenario 1 -
Customer Support Resolution Agent"), not a blueprint domain, so there is nothing to map. Its 70
domains are hand-assigned per question and written out literally in the `TOPIC` table in
`data/exam6/merge-into-raw.mjs`; `build-bank.mjs` accepts a record-level `topic` only when `section`
is absent, and refuses records that carry both. The scenario name survives in a `scenario` field.
Counts (Udemy only): cc 77 · agent 76 · tool 59 · pe 49 · ctx 49.

**CertSafari (`exam: 7`, ids `bcs-<questionId>`).** Free platform, no account — identity is an
anonymous UUID in `localStorage.certsafari_user_id`. Domains come from the API's own `domain`
field (`"Domain 3: Claude Code Configuration & Workflows"`), mapped in `SECTION_TO_TOPIC` alongside
the bare Udemy names — still no inference. The blueprint `subdomain` string is kept per record (it
becomes the normalized `task` field, see below), and `source: "certsafari"` marks the platform. Text arrives as markdown, not HTML, so
`data/certsafari/merge-into-raw.mjs` escapes it and converts `` `code` ``/`**bold**` before it
reaches the bank (which renders with `innerHTML`). Every question carries an explanation for all
four options; the UI already shows the correct option's and the picked option's.
Counts (exam 7): agent 14 · cc 12 · pe 12 · ctx 12 · tool 10.

**CertSafari attempts 2–6 (`exam: 9`–`13`).** Five more attempts, added 2026-08-31. Numbering is
chronological so that dedup's "first seen keeps the question" rule prefers the older attempt:
9 = `K61jtZxsjC3BKZK` (10q, 10/10) · 10 = `xsJm04ZKoTWREkR` (10q, 10/10) ·
11 = `vMmftdbfaJwIlIP` (30q, 27/30) · 12 = `ikWTR1dzO1pkmRp` (30q, 26/30, one unanswered) ·
13 = `Ed0mjtDTP3YGkaq` (30q, 22/30).

The pool serves questions at random, so attempts overlap: 109 attempt rows → 105 distinct questions →
**99 fresh** after dropping the six already in exam 7. Dedup is by `cs-<questionId>` and skipped
records are printed by the merge script, never silently dropped. A question's `q` is its position in
the attempt that first served it, so numbering inside an exam has gaps — that is deliberate.
Counts: E9 9 · E10 9 · E11 27 · E12 27 · E13 27.

**CertSafari attempts 7–11 (`exam: 14`–`18`).** Five more, added 2026-09-03, same chronological rule:
14 = `v7sye6iaTWhzBDL` (60q, 57/60) · 15 = `M027Ujgzxp796Sj` (20q, 18/20) ·
16 = `Zeo8yTels878A1f` (10q, 10/10) · 17 = `ntMcV59HYcOP6qI` (20q, 19/20) ·
18 = `RO8Ojd9pDbZc6B6` (20q, 20/20). 130 attempt rows → **117 fresh** after 24 dedup skips; none of
the new records is `stale`. Counts: E14 54 · E15 18 · E16 9 · E17 18 · E18 18. Domains across all
CertSafari records: ctx 87 · tool 54 · agent 48 · cc 45 · pe 42.

The `get-quizzes` endpoint lists every attempt for a `user_id`, so "which of these is new" is a
set difference against `data/certsafari/attempts.json`, not a guess. The only thing that has to come
from the browser is the `user_id` itself (`localStorage.certsafari_user_id`), once.

**Three CertSafari-only record fields.** `note` carries the user's own study notes from the platform,
bound by `question_id` and therefore independent of which attempt's record survived dedup — a note
written during exam 13 lands on an exam 7 record when that is where the question lives. `miss` marks
a question answered wrong in *any* attempt. `stale` plus `successor` marks a question CertSafari has
retired upstream (`is_active: false`), which happens often enough to matter: 7 of the 99 records added
on 2026-08-31, and none of the 117 added on 2026-09-03.
Retired questions are kept, because they are what was actually answered. The `#/qnotes` screen reads
`note`; it is gated on the bank being unlocked, because the notes ride inside the ciphertext.

**Second Udemy course (`exam: 8`, ids `bx8-<order>`).** Quiz 7570481, "Practice Test 1", 60 questions,
scraped **entirely from the result DOM** — its `assessments` API revision serves 60 questions whose
text matches the attempt on 0 of 60, so those questions no longer exist upstream and there are no
real `aid`s to attach. Domains are still not inferred: this course's result page prints the blueprint
domain per question in a `domain-pane` ("Domain 3: …"), the same naming CertSafari uses, so
`SECTION_TO_TOPIC` already covers it. Per-option explanations come from the DOM's feedback panes.
`source: "udemy-6exams"` marks the course. Counts (exam 8): agent 16 · cc 12 · pe 12 · tool 11 · ctx 9.

**Do not re-ingest quiz 7599280.** A result link for that quiz is BONUS Set 2, already stored as
exam 6: the 60 current API records match the stored `aid`s and correct letters 60/60, and a fresh
attempt link scored the same 61/9 on the same 70 questions. Checked 2026-08-25.

**Exam 6 was scraped from the result DOM, not the API.** The attempt (Deneme 2, 70 questions) predates
the August 2026 `EXAMS v2` rewrite; the quiz's current API revision serves only 60. Questions 1–60
matched their API records by question text and carry real `aid`s; 61–70 no longer exist upstream and
get synthetic ids (`bx6-61` … `bx6-70`) plus an empty `explanation` — their per-option `feedbacks`
came from the DOM and are intact.

**Course explanations are not a source of truth.** They render inside a `.srcline none` block that
says so, with no doc link attached. This is the same rule as everywhere else in this repo — a
practice-exam answer key is an input to be checked, not an authority. If you verify one against a
primary source, that belongs in a note or an `M_BUILTIN` record, not in the bank payload.

**Verified so far (exam 7).** The seven questions missed on the 2026-08-25 CertSafari attempt were
checked against primary docs: `custom_id` `^[a-zA-Z0-9_-]{1,64}$` ✓
([batch-processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing#prepare-and-create-your-batch)),
`${VAR:-default}` expanding in `command`/`args`/`env`/`url`/`headers` ✓
([mcp](https://code.claude.com/docs/en/mcp#environment-variable-expansion-in-mcp-json)), backticks
keeping an `@path` literal ✓ and `.claude/rules/` recursive discovery ✓
([memory](https://code.claude.com/docs/en/memory#import-additional-files),
[#set-up-rules](https://code.claude.com/docs/en/memory#set-up-rules)).
**One divergence:** exam 7 q60 keys "Write requires the file to have been read in this conversation"
as flatly true. [tools-reference#write-tool-behavior](https://code.claude.com/docs/en/tools-reference#write-tool-behavior)
says it depends on the model — Opus 4.6/Haiku 4.5 and older always require the read, newer models may
overwrite an unread file under the read-before-edit conditions, and every model required it before
v2.1.228. The keyed option is still the best of the four (Grep does **not** satisfy the requirement;
viewing with Bash does), but the flat claim is stale. Checked 2026-08-25. All seven are now
`M_BUILTIN` records (`e7q3` … `e7q60`), q60 carrying `verdict: "dated"`.

**Verified so far (exams 9–13).** All 14 questions missed across attempts 2–6, plus 6 answered
correctly but carrying a study note, were checked against primary docs on 2026-08-31 and written as
`M_BUILTIN` records (`e11q5` … `e13q29`). The six noted-but-correct records carry `hit: true`: they
are not mistakes, so every "wrong" counter in the UI and the per-exam check in `validate.mjs`
excludes them, while `#/mistakes` still lists them. `renderQuestion` swaps its labels on the flag
("Neden not aldın" instead of "Neden kaçırdın"), except when the record is also a `conflict` — there
the answer matched the key but not the docs, so both answer boxes stay visible.

**Four divergences found, three of them hard conflicts.**

- **`headersHelper` and Kerberos** (`e13q15`, exam 13 q15). The course keys "don't configure Kerberos
  in Claude Code, put an intermediary service in front" and justifies it by claiming the helper's
  output "is cached for the transport lifetime", citing bug reports. The docs name Kerberos as a
  `headersHelper` use case and say the opposite about caching: "Claude Code runs the helper fresh on
  each connection… It doesn't cache the result."
  ([mcp#use-dynamic-headers-for-custom-authentication](https://code.claude.com/docs/en/mcp#use-dynamic-headers-for-custom-authentication))
- **`${CLAUDE_PROJECT_DIR}` in `.mcp.json`** (`e11q21`, exam 11 q21). The course keys "it resolves
  correctly, Claude Code injects the variable". The docs draw the opposite conclusion for exactly the
  configuration in the question: the variable is set in the *server's* environment, not Claude Code's,
  so a project-scoped entry "requires a default such as `${CLAUDE_PROJECT_DIR:-.}`". **All four options
  are wrong** — an unset variable with no default is passed through as the literal `${VAR}` text with a
  warning in `claude mcp list`, so it is neither the path nor an empty string.
  ([mcp#option-3-add-a-local-stdio-server](https://code.claude.com/docs/en/mcp#option-3-add-a-local-stdio-server))
- **Subagent nesting depth** (`e13q8`, exam 13 q8). The course keys "five levels, including the main
  agent". The docs say three layers below the main conversation, by default, and the limit is
  configurable with `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` (`1` turns nesting off). No option states
  this. ([sub-agents#let-subagents-spawn-their-own-subagents](https://code.claude.com/docs/en/sub-agents#let-subagents-spawn-their-own-subagents))
- **`updatedInput` without `permissionDecision`** (`e12q9`, exam 12 q9). The keyed answer is right,
  but its stated reason is not in the docs; that the normal permission flow applies follows from what
  `permissionDecision: "allow"` is defined to do. The scenario itself is also broken: `updatedInput`
  replaces a tool's *input parameters*, so it cannot redirect a call to a different tool.
  Recorded as `verdict: "ok"` with the gap named in the record.

Three records rest on `exam-preparation-guide.md` alone and render the `.srcline none` variant with
no doc link: `e12q1` (what a self-correction turn should contain), `e13q26` (retry limits) and
`e13q27` (per-field confidence).

**Verified so far (exams 14–18).** All 6 questions missed across attempts 7–11, plus the 17 answered
correctly but carrying a study note, were checked against primary docs on 2026-09-03 and written as
`M_BUILTIN` records (`e14q7` … `e18q12`); the 17 carry `hit: true`. Six of the 23 rest on the guide
or the blueprint alone and render `.srcline none`: `e14q38`, `e15q3`, `e15q6`, `e15q8`, `e17q13`,
`e17q17`.

**One hard conflict, and it is the exam's own subject.** `e14q41` (exam 14 q41) keys "offer to explain
and resolve the overage, escalate only if the customer repeats the request" for a customer who wrote
"connect me to a human agent right now". The blueprint splits exactly this into two Skills bullets
under Task Statement 5.2 (PDF pp.20-21): *"Honoring explicit customer requests for human agents
immediately without first attempting investigation"* and, separately, *"Acknowledging frustration
while offering resolution when the issue is within the agent's capability, escalating only if the
customer reiterates their preference."* The key applies the second branch to a first-branch stem, and
justifies it by citing Anthropic's own help centre (Fin, the support bot) — a description of
Anthropic's support queue, not design guidance. **The same pool keys the opposite ten days later**:
`e17q13` (exam 17 q13), same explicit demand, keys immediate escalation. `e14q41` is `verdict:
"conflict"`, `e17q13` is `verdict: "ok"`, and each record points at the other.

**Two records where the key is right and its stated reason is not.** `e18q2` credits "the SDK's
automatic retry mechanism" for a subagent retrying a transient database reset; no docs page describes
SDK-level auto-retry of tool failures — the answer follows from subagent context isolation plus the
guide's retryable/non-retryable error taxonomy. `e14q56` (orchestrator surfaces conflicting subagent
findings with sources) is supported by the provenance guidance, not by any quotable orchestration
rule: the multi-agent engineering post documents synthesis and a `CitationAgent`, not "present the
conflict to the user".

`support.claude.com` was added to `ALLOWED_DOC_HOSTS` in `scripts/validate.mjs` for `e14q41` and
`e17q19` (Persona identity verification). It is Anthropic's help centre — official, but product
support rather than developer documentation, and a record leaning on it says so in its `why`.

One new note came out of these attempts: `compaction-server` (Server-Side Compaction — What Survives
the Summary, tasks 5.1/5.6). Three existing notes grew a claim each — `builtin-tools` (Grep
`multiline` versus output modes), `mcp-primitives` (Claude Code auto-refreshes on `list_changed`),
`escalation-ambiguity` (now links both sides of the conflict above).

**Dropping questions.** Some bank questions are far off exam format or teach nothing; they are
removed in two stages. Stage A is in the browser: the "Bu soruyu ele" button (drill, review card, or
`X`) puts the id in `BSTORE.excluded` in `localStorage`, and the question leaves every pool and
count immediately — one click on `#/bank` → "Elenenler" puts it back. Stage B is in the repo: the
same screen's copy button emits the id list for `scripts/bank-excluded.json` (`ids`), and
`build-bank.mjs` filters those ids out after normalize and before writing `data/bank.json`, so the
questions never reach the ciphertext — gone on every device. `data/bank-raw.json` is **never**
pruned: deleting an id from the exclusion file and rebuilding restores the question. An id in the
file with no match in the bank fails the build rather than being ignored. Every Stage B rebuild
changes the counts above — update them here in the same commit.

**Encryption, and its limits.** The site is public and the content is a paid course's, so the bank
ships as ciphertext, not behind a JS password check (which would hide nothing — view source). The
build gzips the JSON, derives a key with PBKDF2-SHA256 (210k iterations), encrypts with AES-256-GCM,
and splices `salt|iv|tag|ciphertext` as base64 between `/* BANK:BEGIN */` and `/* BANK:END */` in
`index.html`. The browser reverses it with WebCrypto + `DecompressionStream`. The password is in no
committed file. What this does **not** protect against: anyone given the password can decrypt and
redistribute the bank, and rotating it requires a re-encrypt plus redeploy while any already-downloaded
copy stays openable with the old password.

```bash
BANK_PASSWORD='...' node scripts/build-bank.mjs
```

Omit `BANK_PASSWORD` to generate a fresh password — it is printed once and stored nowhere.

**Plaintext stays local.** `data/` is gitignored; `data/bank-raw.json` (API response) and
`data/bank.json` (normalized) never get committed. `validate.mjs` checks the blob's shape and, when
`data/bank.json` is present, asserts that a sample of real question text does **not** appear
unencrypted in `index.html`. That canary is the check that matters — keep it working.
