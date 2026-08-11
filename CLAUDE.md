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
