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

240 questions pulled from the Udemy course's own API (Practice Exams 1–3 + BONUS Set 1). Separate
from `M_BUILTIN` in every way — do not merge them.

**Id namespace.** Bank ids are `b<udemyAssessmentId>`; mistake records are `e<exam>q<n>`. They must
never collide. The course rewrote its entire bank in August 2026 (`EXAMS v2`), so `M_BUILTIN`'s
records come from a **revision that no longer exists upstream**: spot-checked signature questions
(`updatedToolOutput`, batch `custom_id`, `permissionDecision: "ask"`) return zero hits in the current
bank, and every quiz now serves exactly 60 questions where the old logs say 65/60/65/70. There is no
per-question mapping between the two sets, and none should be invented. The only shared axis is
`topic`.

**Domain tags are not inferred.** They come from the API's own `section` field, mapped 1:1 to
`TOPICS` in `scripts/build-bank.mjs`. Counts: agent 61 · tool 51 · cc 48 · pe 42 · ctx 38.

**Course explanations are not a source of truth.** They render inside a `.srcline none` block that
says so, with no doc link attached. This is the same rule as everywhere else in this repo — a
practice-exam answer key is an input to be checked, not an authority. If you verify one against a
primary source, that belongs in a note or an `M_BUILTIN` record, not in the bank payload.

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
