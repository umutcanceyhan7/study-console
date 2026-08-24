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

## Question bank (`#/bank`)

430 questions from three sources: 310 from the first Udemy course (Practice Exams 1–3 + BONUS Set 1
+ BONUS Set 2, exams 1/2/3/5/6), 60 from CertSafari (exam 7), and 60 from a second Udemy course
("Claude Certified Architect Foundations - 6 Practice Exams", Practice Test 1, exam 8).
Separate from `M_BUILTIN` in every way — do not merge them.
The scrape-to-embed pipeline for both platforms is written down in `INGEST.md` — read it before
adding another exam.

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
the bare Udemy names — still no inference. The blueprint `subdomain` string is kept per record, and
`source: "certsafari"` marks the platform. Text arrives as markdown, not HTML, so
`data/certsafari/merge-into-raw.mjs` escapes it and converts `` `code` ``/`**bold**` before it
reaches the bank (which renders with `innerHTML`). Every question carries an explanation for all
four options; the UI already shows the correct option's and the picked option's.
Counts (exam 7): agent 14 · cc 12 · pe 12 · ctx 12 · tool 10.

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
