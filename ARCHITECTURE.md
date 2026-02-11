# SysML v2.0 Extension Architecture

## Overview

A VS Code extension providing SysML v2.0 language support: syntax highlighting, parsing, validation, navigation, and interactive visualization.

## High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         VS Code Extension Host                            │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐       │
│  │ extension.ts │──▶│    Parser    │──▶│    Semantic Resolver    │       │
│  │   (entry)    │   │   (ANTLR4)   │   │    (type validation)     │       │
│  └──────┬───────┘   └──────┬───────┘   └────────────┬─────────────┘       │
│         │                  │                        │                     │
│         │                  ▼                        ▼                     │
│         │            ┌──────────────┐     ┌──────────────────────────┐    │
│         │            │  Library     │     │      Diagnostics         │    │
│         │            │  Service     │     │   (errors / warnings)    │    │
│         │            └──────────────┘     └──────────────────────────┘    │
│         │                                                           ▲     │
│         ├──────────────┬──────────────┬──────────────┬──────────────┤     │
│         ▼              ▼              ▼              ▼              │     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │     │
│  │ Formatter  │  │ Navigation │  │ Validator  │  │ Model Tree │     │     │
│  └────────────┘  │ (symbols)  │  └────────────┘  │  Explorer  │     │     │
│                  └────────────┘                  └────────────┘     │     │
│                                                                     │     │
│  ┌──────────────────────────────────────────────────────────────────┴─────┴┐
│  │                   Visualization Panel (Webview)                         │
│  │  ┌────────┬────────┬────────┬────────┬────────┬────────┬────────┐       │
│  │  │  BDD   │  IBD   │  ELK   │Package │Activity│Sequence│ State  │       │
│  │  └────────┴────────┴────────┴────────┴────────┴────────┴────────┘       │
│  │          ▲                                   ▲                          │
│  │          │         Cytoscape.js + ELK        │            D3.js         │
│  └──────────┴───────────────────────────────────┴──────────────────────────┘
└───────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Parser (`src/parser/`)

- **ANTLR4-based** parser generated from `grammar/SysMLv2Parser.g4`
- Parses `.sysml` and `.kerml` files into AST (Abstract Syntax Tree), leveraging the ANTLR-generated lexer/parser pipeline to normalize tokens, build concrete syntax trees, and emit analyzer-ready element nodes
- Caches parse results by content hash for performance
- Extracts structural, behavioral, and requirement elements

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
 .sysml File                                              Webview
      │                                                      ▲
      ▼                                                      │
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌────────┴────────┐
│  TextDoc  │───▶│   ANTLR   │───▶│   SysML   │───▶│    Renderer     │
│           │    │  Lexer/   │    │  Elements │    │ (view-specific) │
│           │    │  Parser   │    │   (AST)   │    │                 │
└───────────┘    └───────────┘    └─────┬─────┘    └─────────────────┘
                                        │
                                        ▼
                                  ┌───────────┐    ┌─────────────┐
                                  │ Semantic  │───▶│  Enriched   │
                                  │ Resolver  │    │  Elements   │
                                  └─────┬─────┘    └─────────────┘
                                        │
                                        ▼
                                  ┌───────────┐
                                  │  Library  │
                                  │  Service  │
                                  └───────────┘
```

## Key Dependencies

| Dependency      | Purpose                           |
| --------------- | --------------------------------- |
| `antlr4ts`      | TypeScript ANTLR4 runtime         |
| `elkjs`         | ELK graph layout algorithm        |
| `cytoscape`     | Graph visualization library       |
| `cytoscape-elk` | ELK layout adapter for Cytoscape  |
| `d3`            | Data-driven document manipulation |

## Module Structure

```
src/
├── extension.ts          # Entry point, command registration
├── parser/
│   ├── sysmlParser.ts    # High-level parser API
│   ├── antlrSysMLParser.ts # ANTLR wrapper
│   └── generated/        # ANTLR-generated lexer/parser
├── resolver/
│   ├── resolver.ts       # Type resolution logic
│   └── diagnostics.ts    # Diagnostic message factory
├── library/
│   ├── service.ts        # Library indexing & lookup
│   └── cacheManager.ts   # Index persistence
├── validation/
│   ├── validator.ts      # Document validation
│   └── codeActions.ts    # Quick fixes
├── navigation/
│   ├── definitionProvider.ts  # Go-to-definition
│   └── symbolProvider.ts      # Document symbols
├── visualization/
│   ├── visualizationPanel.ts  # Webview host
│   └── renderers/             # View-specific renderers
├── explorer/
│   └── modelExplorerProvider.ts # Tree view
└── formatting/
    └── formatter.ts      # Code formatter
```

## Extension Activation

1. Triggered by `onLanguage:sysml` or command invocation
2. Creates `SysMLParser`, `SysMLValidator`, `ModelExplorerProvider`
3. Registers language providers (formatting, navigation, code actions)
4. Initializes `LibraryService` asynchronously (non-blocking)
5. Sets up file watchers and document change handlers

## Webview Communication

```
  Extension Host                      Webview (Browser)
        │                                    │
        │───── { command: 'update',  ───────▶│
        │        data: elements }            │
        │                                    │
        │◀──── { command: 'select',  ───────│
        │        element: name }             │
        │                                    │
        │───── { command: 'highlight' ──────▶│
        │        name: string }              │
```

Messages are serialized JSON passed via `postMessage()`.
