/**
 * Blueprint task statement'ları — tek kaynak.
 *
 * Başlıklar `ClaudeCertifiedArchitectFoundationsGuide.pdf` (CCAR-F v1.0, pp.5-23)
 * metninden harfi harfine alındı. CertSafari'nin soru başına verdiği
 * `subdomain` dizeleri ("Subdomain 2.4: <başlık>") bu başlıklarla birebir
 * aynı — 30/30 doğrulandı, kaydedilecek bir ayrışma yok.
 *
 * build-bank.mjs bankaya giren `subdomain` alanını buna karşı doğrular,
 * validate.mjs de index.html'deki `TASKS` kopyasının bununla aynı kaldığını
 * assert eder. Başlığı değiştirmek isteyen önce PDF'e bakar.
 */

export const TASK_STATEMENTS = {
  "1.1": { domain: 1, pdf: 5,  title: "Design and implement agentic loops for autonomous task execution" },
  "1.2": { domain: 1, pdf: 5,  title: "Orchestrate multi-agent systems with coordinator-subagent patterns" },
  "1.3": { domain: 1, pdf: 6,  title: "Configure subagent invocation, context passing, and spawning" },
  "1.4": { domain: 1, pdf: 7,  title: "Implement multi-step workflows with enforcement and handoff patterns" },
  "1.5": { domain: 1, pdf: 7,  title: "Apply Agent SDK hooks for tool call interception and data normalization" },
  "1.6": { domain: 1, pdf: 8,  title: "Design task decomposition strategies for complex workflows" },
  "1.7": { domain: 1, pdf: 8,  title: "Manage session state, resumption, and forking" },

  "2.1": { domain: 2, pdf: 9,  title: "Design effective tool interfaces with clear descriptions and boundaries" },
  "2.2": { domain: 2, pdf: 9,  title: "Implement structured error responses for MCP tools" },
  "2.3": { domain: 2, pdf: 10, title: "Distribute tools appropriately across agents and configure tool choice" },
  "2.4": { domain: 2, pdf: 11, title: "Integrate MCP servers into Claude Code and agent workflows" },
  "2.5": { domain: 2, pdf: 11, title: "Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively" },

  "3.1": { domain: 3, pdf: 12, title: "Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization" },
  "3.2": { domain: 3, pdf: 13, title: "Create and configure custom slash commands and skills" },
  "3.3": { domain: 3, pdf: 13, title: "Apply path-specific rules for conditional convention loading" },
  "3.4": { domain: 3, pdf: 14, title: "Determine when to use plan mode vs direct execution" },
  "3.5": { domain: 3, pdf: 14, title: "Apply iterative refinement techniques for progressive improvement" },
  "3.6": { domain: 3, pdf: 15, title: "Integrate Claude Code into CI/CD pipelines" },

  "4.1": { domain: 4, pdf: 16, title: "Design prompts with explicit criteria to improve precision and reduce false positives" },
  "4.2": { domain: 4, pdf: 16, title: "Apply few-shot prompting to improve output consistency and quality" },
  "4.3": { domain: 4, pdf: 17, title: "Enforce structured output using tool use and JSON schemas" },
  "4.4": { domain: 4, pdf: 18, title: "Implement validation, retry, and feedback loops for extraction quality" },
  "4.5": { domain: 4, pdf: 18, title: "Design efficient batch processing strategies" },
  "4.6": { domain: 4, pdf: 19, title: "Design multi-instance and multi-pass review architectures" },

  "5.1": { domain: 5, pdf: 19, title: "Manage conversation context to preserve critical information across long interactions" },
  "5.2": { domain: 5, pdf: 20, title: "Design effective escalation and ambiguity resolution patterns" },
  "5.3": { domain: 5, pdf: 21, title: "Implement error propagation strategies across multi-agent systems" },
  "5.4": { domain: 5, pdf: 21, title: "Manage context effectively in large codebase exploration" },
  "5.5": { domain: 5, pdf: 22, title: "Design human review workflows and confidence calibration" },
  "5.6": { domain: 5, pdf: 23, title: "Preserve information provenance and handle uncertainty in multi-source synthesis" },
};

/** "Subdomain 2.4: <başlık>" → "2.4". Biçim bozuksa null döner. */
export function parseSubdomain(s){
  const m = /^Subdomain ([1-5]\.\d+): (.+)$/.exec(String(s || "").trim());
  if (!m) return null;
  const [, id, title] = m;
  const t = TASK_STATEMENTS[id];
  if (!t || t.title !== title) return null;
  return id;
}
