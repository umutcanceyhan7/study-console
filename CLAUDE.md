# CLAUDE.md — LearningPlatform

Project rules for Claude Code when working in this repository.

## Ground rule: source of truth

Every factual claim about Claude, Claude Code, the Claude Agent SDK, the Anthropic API, or MCP that ends up in study notes, error analyses, quiz explanations, or commentary in this repo **must be verified against a primary source before it is written**. Nothing goes in on model recall alone.

Authoritative sources, in priority order:

1. **Official Anthropic / Claude documentation** — `platform.claude.com/docs`, `code.claude.com/docs`, `anthropic.com/engineering`, and the Anthropic Cookbook.
2. **Official MCP specification and docs** — `modelcontextprotocol.io`.
3. **`exam-preparation-guide.md`** in this repo — the curated CCA-F/CCAR-F study guide. This file *is* Daron Yöndem's guide: it is byte-identical to `exam-preparation-guide.md` in [daronyondem/claude-architect-exam-guide](https://github.com/daronyondem/claude-architect-exam-guide) (blob `036e43c9`, verified 2026-08-12). The published PDF/EPUB are rendered from it, so there is no separate PDF to consult — cite the local file by section and line.

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
