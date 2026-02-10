# Changelog

All notable changes to the SysML v2.0 Language Support extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.15.0]

### Added

- Worker thread for ANTLR parsing — heavy lexer/parser/visitor work now runs off the extension host thread, eliminating ~4s UI freezes on large files
- `parseAsync()` method on `SysMLParser` with automatic fallback to synchronous parsing if the worker is unavailable
- 300ms debounce on document change events to avoid parse-per-keystroke

### Fixed

- Cytoscape SVG plugin registered twice — removed duplicate `cytoscape.use()` calls; UMD bundles already self-register on script load
- Removed unsupported `<meta http-equiv>` cache tags from visualization webview HTML (stripped by VS Code sandbox)
- Release workflow now installs Java and downloads the ANTLR jar so `vscode:prepublish` succeeds in CI

## [0.14.0]

### Added

- BNF-based grammar generation pipeline from official OMG SysML v2 KEBNF spec
- SLL prediction mode with DFA cache reuse for faster parsing
- `Clear Parse Cache` command
- Parse-error diagnostics from ANTLR4
- Centralised parse entry point with cancellation and progress notifications
- 12 targeted grammar fixes for spec ambiguities

### Changed

- Migrated from `antlr4ts` to official `antlr4` runtime (v4.13.2)
- Parser and lexer grammars regenerated from spec
- Validator rewritten with two-phase semantic resolution approach

### Fixed

- State transition source/target extraction
- Subclassification extraction from definition declarations
- Extension activation reliability
- TreeView node size & spacing improvements

## [0.13.0]

### Added

- ANTLR-based SysML v2 parser with full grammar support
- Interactive diagram visualizations (BDD, IBD, Activity, Sequence, State, Use Case)
- Model Explorer tree view
- Code formatting and validation
- Go-to-definition and symbol navigation
- Completion provider with context-aware suggestions
- Standard SysML v2 library support
- D3.js and Cytoscape.js based rendering

### Changed

- Improved syntax highlighting coverage

### Fixed

- Initial release stability improvements

## [0.12.0]

### Added

- Configurable export resolution for diagram PNG export
- PNG export scale options (1×, 2×, 4×)

### Fixed

- Tree view export rendering issues

## [0.10.0]

### Added

- IntelliSense completion provider for SysML keywords and element references
- Multi-selection support in visualization commands
- Enhanced element navigation from diagrams

### Changed

- Improved validator with better duplicate detection and reference handling
- Nested action validation and visualization support

## [0.7.0]

### Added

- Fork and join node support in activity diagram parsing and rendering

## [0.6.0]

### Added

- Model Explorer registered as command palette entry (`SysML: Explorer`)

## [0.5.0]

### Added

- Keyword validation with typo detection and quick-fix suggestions
- CI workflow for automated testing
- Release workflow for automated VSIX packaging and publishing

## [0.4.0]

### Added

- Inline editing for element names in diagram views
- Enhanced element navigation from visualization panels
- Visualization interaction tests

### Changed

- Replaced `nyc` with `c8` for code coverage

## [0.3.1]

### Fixed

- Spurious re-render on first resize observer callback

## [0.3.0]

### Added

- Toggle for category headers in General View

### Changed

- Reduced debounce times for improved responsiveness
- Optimised update logic in visualization panel

## [0.2.1]

### Changed

- README screenshots and video assets updated to WebP format

## [0.2.0]

### Added

- Compact UI styling for buttons, menus, and toolbar
- Dropdown interaction improvements

### Changed

- Document loading performance improved with debounced parsing

### Fixed

- Release workflow conditional check for marketplace publishing

## [0.1.0]

### Added

- Initial release
- SysML v2.0 syntax highlighting via TextMate grammar
- Regex-based parser with element extraction
- Interactive diagram visualizations (General View)
- Model Explorer tree view
- Basic code formatting
- Extension activation on `.sysml` files
