# MCP readiness for SysML VS Code Extension

This note is scoped to **agents inside VS Code** (Copilot Chat / agentic workflows) and how making this project “MCP-ready” would help.

## What MCP gives you (value inside VS Code)

If your SysML capabilities are exposed as **MCP tools**, agents can call them with **typed inputs/outputs** instead of trying to:
- infer structure from UI state,
- re-run parsing implicitly,
- scrape webviews, or
- rely on long prompt context.

Concrete wins:
- **Deterministic SysML knowledge for agents**: parse/resolve/validate/explain become callable tools.
- **Better explanations**: the agent can fetch an element snapshot (path/signature/members/resolved type) and explain using that factual substrate.
- **Workspace-scale operations**: “find all unresolved types”, “list all requirements”, “summarize changes between commits” become tool calls.
- **Reusable across agent hosts**: while your current priority is VS Code, MCP keeps the interface portable.

## The key constraint in *this* repo today

Your parsing + validation stack is tightly coupled to VS Code types:
- `src/parser/sysmlParser.ts` imports `vscode` and uses `vscode.Range` / `vscode.TextDocument`.
- `src/parser/antlrSysMLParser.ts` also depends on `vscode.TextDocument`.
- `src/validation/validator.ts` uses `vscode.DiagnosticCollection` and `vscode.Diagnostic`.

That means:
- A standalone Node MCP server **cannot** directly reuse these modules (because `require('vscode')` only works inside the VS Code extension host).

So “MCP-ready” is primarily an **architecture refactor + tooling boundary** decision.

## Recommended approach (minimal risk)

### Phase 1 — Define tool contracts (no refactor yet)
Define stable MCP tool interfaces first, so you can evolve implementation behind them.

Suggested minimal toolset (read-only):
1. `sysml.parseFile`
   - Input: `{ path: string }`
   - Output: `{ elements: Element[], relationships: Relationship[] }`
2. `sysml.explainAt`
   - Input: `{ path: string, line: number, character: number }`
   - Output: snapshot similar to `ExplainElementSnapshot`
3. `sysml.validateFile`
   - Input: `{ path: string }`
   - Output: diagnostics list (code/message/severity/location)

Notes:
- Keep outputs small (truncate children/features lists) and make truncation explicit.
- Make locations 0-based or 1-based, but be consistent and document it.

### Phase 2 — Extract a VS Code–free core library
Create a new internal module that **does not import `vscode`**.

Target shape:
- `src/core/textTypes.ts`
  - `Position { line:number; character:number }`
  - `Range { start:Position; end:Position }`
- `src/core/parser.ts`
  - `parseText(text: string, filePath?: string): CoreElement[]`
- `src/core/validate.ts`
  - `validate(elements: CoreElement[]): CoreDiagnostic[]`
- `src/core/resolve.ts`
  - `resolve(elements: CoreElement[], library: LibraryFacade): ResolvedElement[]`

Then add adapters:
- `src/vscodeAdapters/range.ts` converts Core Range ↔ `vscode.Range`
- `src/vscodeAdapters/document.ts` wraps `vscode.TextDocument` → plain `{text, uri, path}`

This is the main work, but it’s the work that makes MCP possible *without hacks*.

### Phase 3 — Add an MCP server package (usable from VS Code agents)
Add a separate package (recommended) or a top-level script that starts an MCP server.

The server:
- reads files from the current workspace (or takes explicit paths),
- uses `src/core/*` (NOT `vscode`),
- exposes the tool contracts from Phase 1.

VS Code agents can then be configured to use this MCP server by launching it as a command.

## Why this still helps “agents inside VS Code”

Even though the MCP server is a separate process, the agent is still in VS Code.
The agent just calls tools via MCP instead of asking the extension to do things via UI.

This is the cleanest model because:
- you avoid mixing “agent tool protocol server” concerns into extension activation,
- you avoid brittle IPC between extension host and a tool server,
- you get CI/terminal reusability later almost for free.

## Security / guardrails (important)
For an MCP server, enforce:
- Workspace-root restriction: reject paths outside `workspaceFolder`.
- Read-only tools initially.
- Output size limits and truncation.
- No evaluation of SysML beyond parsing/resolution.

## Practical next step for this repo

If you want the smallest, highest-value MVP for agents:
1) Extract a **very small CoreRange/CorePosition** and push it downward into the parser output types.
2) Add a `parseText(text)` path that does not require `vscode.TextDocument`.
3) Implement MCP tools `parseFile` + `explainAt` first (validation can follow).

---

If you want, I can take the next step and implement Phase 1 + start Phase 2 by introducing `src/core/textTypes.ts` and adding a `parseText()` entrypoint in the parser layer (keeping existing VS Code APIs intact via adapters).