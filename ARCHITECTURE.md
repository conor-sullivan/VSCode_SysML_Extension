# SysML v2.0 Extension Architecture

## Overview

A VS Code extension providing SysML v2.0 language support with interactive visualization. Language intelligence (diagnostics, completions, hover, go-to-definition, formatting, etc.) is provided by the **[sysml-v2-lsp](https://github.com/daltskin/sysml-v2-lsp)** language server via the Language Server Protocol. The extension adds visualization, model exploration, and diagram rendering on top.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       VS Code Extension Host                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐          ┌──────────────────────────────────────┐ │
│  │ extension.ts │─────────>│          LSP Client                  │ │
│  │   (entry)    │          │   (vscode-languageclient)            │ │
│  └──────┬───────┘          └──────────────┬───────────────────────┘ │
│         │                                 │  IPC                    │
│         │                                 v                         │
│         │                  ┌──────────────────────────────────────┐ │
│         │                  │     sysml-v2-lsp Language Server     │ │
│         │                  │  (separate Node.js process)          │ │
│         │                  │                                      │ │
│         │                  │  * ANTLR4 parser (worker thread)     │ │
│         │                  │  * Diagnostics & keyword typos       │ │
│         │                  │  * Completions / signature help      │ │
│         │                  │  * Hover / go-to-def / references    │ │
│         │                  │  * Semantic tokens / CodeLens        │ │
│         │                  │  * Rename / linked editing           │ │
│         │                  │  * Inlay hints / document links      │ │
│         │                  │  * Type & call hierarchy             │ │
│         │                  │  * Formatting / folding / selection  │ │
│         │                  │  * Workspace symbols                 │ │
│         │                  └──────────────────────────────────────┘ │
│         │                                                           │
│         │  ┌──────────────┐   ┌──────────────────────────┐          │
│         +->│    Parser    │-->│    Semantic Resolver     │          │
│         │  │   (ANTLR4)   │   │  (visualization only)    │          │
│         │  └──────┬───────┘   └──────────────────────────┘          │
│         │         │                                                 │
│         +---------+----------------------------+                    │
│         v         v                            v                    │
│  ┌────────────┐  ┌────────────┐         ┌────────────┐              │
│  │ Model Tree │  │  Library   │         │ Webview    │              │
│  │  Explorer  │  │  Service   │         │ Visualizer │              │
│  └────────────┘  └────────────┘         └────────────┘              │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                 Visualization Panel (Webview)                  │ │
│  │  ┌────────┬────────┬────────┬────────┬────────┬────────┬─────┐ │ │
│  │  │  BDD   │  IBD   │  ELK   │Package │Activity│Sequence│State│ │ │
│  │  └────────┴────────┴────────┴────────┴────────┴────────┴─────┘ │ │
│  │        |           Cytoscape.js + ELK          |        D3.js  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. LSP Client (`src/lsp/`)

- Starts the **sysml-v2-lsp** language server as a child process (IPC transport)
- The server module is shipped as the `sysml-v2-lsp` npm dependency
- Provides all language intelligence: diagnostics, completions, hover, go-to-definition, references, rename, formatting, code actions, semantic tokens, CodeLens, inlay hints, type/call hierarchy, document symbols, folding ranges, selection ranges, workspace symbols
- Supports `sysml.restartServer` command for development

### 2. Parser (`src/parser/`) — Visualization & Explorer only

- **ANTLR4-based** parser generated from `grammar/SysMLv2Parser.g4`
- Parses `.sysml` and `.kerml` files into AST
- Used **only** for the Model Explorer tree view and Visualization panel
- Language features (diagnostics, navigation, etc.) are handled by the LSP server
- Caches parse results by content hash for performance

### 2. Semantic Resolver (`src/resolver/`)

- Validates types against SysML standard library
- Resolves references (part types, specializations)
- Produces enriched elements with resolved type info
- Generates semantic diagnostics

### 3. Library Service (`src/library/`)

- Indexes the SysML v2 standard library (`sysml.library/`)
- Provides symbol lookup for type resolution
- Caches index to `.sysml-cache/library.json`

### 4. Visualization (`src/visualization/`)

- Webview-based diagram rendering
- Multiple renderers: BDD, IBD, Package, Activity, Sequence, State, UseCase
- Uses **Cytoscape.js** + **ELK** for graph layout
- Uses **D3.js** for custom diagrams

## Data Flow

```
 .sysml File                                            Webview
      │                                                    ^
      v                                                    │
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────┴───────┐
│  TextDoc  │--->│   ANTLR   │--->│   SysML   │--->│   Renderer    │
│           │    │  Lexer/   │    │  Elements │    │(view-specific)│
│           │    │  Parser   │    │   (AST)   │    │               │
└───────────┘    └───────────┘    └─────┬─────┘    └───────────────┘
                                        │
                                        v
                                  ┌───────────┐    ┌─────────────┐
                                  │ Semantic  │--->│  Enriched   │
                                  │ Resolver  │    │  Elements   │
                                  └─────┬─────┘    └─────────────┘
                                        │
                                        v
                                  ┌───────────┐
                                  │  Library  │
                                  │  Service  │
                                  └───────────┘
```

## Key Dependencies

| Dependency              | Purpose                           |
| ----------------------- | --------------------------------- |
| `sysml-v2-lsp`          | Language server (LSP)             |
| `vscode-languageclient` | VS Code LSP client library        |
| `antlr4`                | TypeScript ANTLR4 runtime (viz)   |
| `elkjs`                 | ELK graph layout algorithm        |
| `cytoscape`             | Graph visualization library       |
| `cytoscape-elk`         | ELK layout adapter for Cytoscape  |
| `d3`                    | Data-driven document manipulation |

## Module Structure

```
src/
├── extension.ts          # Entry point, command registration
├── lsp/
│   └── client.ts         # LSP client (starts sysml-v2-lsp server)
├── parser/
│   ├── sysmlParser.ts    # High-level parser API (visualization only)
│   ├── antlrSysMLParser.ts # ANTLR wrapper
│   └── generated/        # ANTLR-generated lexer/parser
├── resolver/
│   ├── resolver.ts       # Type resolution logic (visualization)
│   └── diagnostics.ts    # Diagnostic message factory (visualization)
├── library/
│   ├── service.ts        # Library indexing & lookup
│   └── cacheManager.ts   # Index persistence
├── visualization/
│   ├── visualizationPanel.ts  # Webview host
│   └── renderers/             # View-specific renderers
├── explorer/
│   └── modelExplorerProvider.ts # Tree view
├── types/
│   └── sysml-v2-lsp.d.ts # Type declarations for LSP package
├── validation/           # Retained for reference (LSP handles validation)
├── navigation/           # Retained for reference (LSP handles navigation)
└── formatting/           # Retained for reference (LSP handles formatting)
```

## Extension Activation

1. Triggered by `onLanguage:sysml` or command invocation
2. Starts the **sysml-v2-lsp** language server via IPC (handles all language features)
3. Creates `SysMLParser`, `ModelExplorerProvider` (for visualization only)
4. Registers visualization, export, and model explorer commands
5. Sets up file watchers and document change handlers (for model explorer updates)

## Webview Communication

```
  Extension Host                      Webview (Browser)
        │                                    │
        │──── { command: 'update',  ────────>│
        │       data: elements }             │
        │                                    │
        │<─── { command: 'select',  ─────────│
        │       element: name }              │
        │                                    │
        │──── { command: 'highlight' ───────>│
        │       name: string }               │
```

Messages are serialized JSON passed via `postMessage()`.
