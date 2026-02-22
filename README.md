# SysML v2 VS Code Extension

A Visual Studio Code extension for SysML v2.0 with syntax highlighting, formatting, validation, navigation, and interactive diagram visualization.

![SysML v2.0](https://img.shields.io/badge/SysML-v2.0-blue) ![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-green) ![License: MIT](https://img.shields.io/badge/License-MIT-yellow)

## Features

### Language Support (LSP)

All language features are provided by the [sysml-v2-lsp](https://www.npmjs.com/package/sysml-v2-lsp) language server.

- **Syntax Highlighting** — Full support for SysML v2.0 keywords, operators, and constructs via TextMate grammar and semantic tokens
- **Standard Library** — Built-in OMG standard library (Kernel, Domain, Systems libraries)
- **Completions** — Context-aware auto-complete with trigger characters (`.`, `:`, space)
- **Hover** — Type information and documentation on hover
- **Formatting** — Smart indentation and code formatting (document and range)
- **Validation** — Real-time syntax and semantic checking with VS Code Problems panel integration
- **Navigation** — Go to Definition (including standard library imports), Find References, Document Symbols, Workspace Symbols, Breadcrumbs
- **Rename** — Rename symbols with linked editing support across references
- **Code Actions** — Quick fixes for common issues
- **Code Lens** — Reference counts shown above definitions
- **Folding** — Collapsible regions for blocks and nested structures
- **Selection Ranges** — Smart expand/shrink selection
- **Signature Help** — Parameter hints for action/calc invocations
- **Document Links** — Clickable import paths that navigate to the target
- **Type Hierarchy** — View supertypes and subtypes of definitions
- **Call Hierarchy** — Trace incoming and outgoing action/state invocations
- **Inlay Hints** — Inline type annotations next to identifiers (opt-in, off by default)

### Tooling

- **Model Explorer** — Tree view showing packages and elements across your workspace
- **Interactive Diagrams** — General View, Interconnection View, Action Flow View, State Transition View, Sequence View, Case View and others with search/pan/zoom/export
- **Feature Inspector** — Interactive sidebar panel showing detailed type information, attributes, and relationships for the selected element
- **Model Dashboard** — Webview panel displaying model-wide statistics, element counts, and build timing metrics
- **MCP Server** — Built-in [Model Context Protocol](https://modelcontextprotocol.io/) server for Copilot agent mode integration, enabling AI-assisted SysML modelling

## Demo

![Demo](assets/visualiser.webp)

## Screenshots

### General View

![General View](assets/general_view.png)

### Interconnection View

![Interconnection View](assets/interconnection_view.png)

### Action Flow View

![Action Flow View](assets/action_flow_view.png)

### State Transition View

![State Transition View](assets/state_view.png)

### Hierarchy View

![Hierarchy View](assets/hierarchy_view.png)

### Graph View

![Graph View](assets/graph_view.png)

### Tree View

![Tree View](assets/tree_view.png)

## Installation

1. Open VS Code Extensions (Ctrl+Shift+X)
2. Search for "SysML v2"
3. Click Install

Or install manually from `.vsix`: Extensions → ⋯ → Install from VSIX

## Usage

Create `.sysml` or `.kerml` files:

```sysml
package MySystem {
    part def Vehicle {
        attribute mass : Real;
    }
    part car : Vehicle;
}
```

### Commands (Ctrl+Shift+P)

| Command                                 | Description                                                 |
| --------------------------------------- | ----------------------------------------------------------- |
| `SysML: Show Model Visualizer`          | Open interactive diagram for the current file               |
| `SysML: Show Model Explorer`            | Open the tree view showing packages and elements            |
| `SysML: Validate SysML Model`           | Run validation on the current file                          |
| `SysML: Format SysML Document`          | Format the current SysML file                               |
| `SysML: Export Visualization (PNG/SVG)` | Export the current diagram as PNG or SVG                    |
| `SysML: Change Visualizer View`         | Switch between diagram views (General, IBD, Activity, etc.) |
| `SysML: Refresh Visualization`          | Re-render the current diagram                               |
| `SysML: Jump to Definition`             | Navigate to the definition of the symbol under cursor       |
| `SysML: Show Type Hierarchy`            | View supertypes and subtypes of the current definition      |
| `SysML: Show Call Hierarchy`            | Trace incoming and outgoing action/state invocations        |
| `SysML: Show Feature Inspector`         | Inspect attributes, types, and relationships of an element  |
| `SysML: Show Model Dashboard`           | View model statistics and build timing metrics              |
| `SysML: Clear Parse Cache`              | Clear the cached parse results                              |
| `SysML: Refresh Model Tree`             | Refresh the Model Explorer tree view                        |
| `SysML: Restart Language Server`        | Restart the SysML LSP server                                |

### Context Menu

Right-click any folder in the Explorer → **Visualise with SysML** to aggregate and visualize all `.sysml` files in that folder. Choose **Visualise with SysML (Choose View)** to pick a specific diagram type.

Right-click in a SysML file editor → **Show Feature Inspector** to inspect the element at the cursor.

## Settings

| Setting                            | Default   | Description                                                                                                                                                  |
| ---------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sysml.validation.enabled`         | `true`    | Enable SysML model validation                                                                                                                                |
| `sysml.format.indentSize`          | `4`       | Number of spaces for indentation                                                                                                                             |
| `sysml.visualization.defaultView`  | `"sysml"` | Default view when opening the visualizer (`sysml`, `tree`, `elk`, `bdd`, `package`, `ibd`, `graph`, `hierarchy`, `sequence`, `activity`, `state`, `usecase`) |
| `sysml.export.defaultScale`        | `2`       | Default scale factor for PNG exports (1x–4x)                                                                                                                 |
| `sysml.library.path`               | `""`      | Path to SysML v2 standard library directory                                                                                                                  |
| `sysml.maxNumberOfProblems`        | `100`     | Maximum number of problems reported per file                                                                                                                 |
| `sysml.inlayHints.enabled`         | `false`   | Enable inlay hints (inline type annotations). May interfere with renaming — disable if you experience editing issues                                         |
| `sysmlLanguageServer.trace.server` | `"off"`   | Traces communication between VS Code and the language server (`off`, `messages`, `verbose`)                                                                  |

## Development

```bash
npm install && npm run compile && npm test
```

## License

MIT
