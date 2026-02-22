import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ModelExplorerProvider } from './explorer/modelExplorerProvider';
import { startLanguageClient, stopLanguageClient } from './lsp/client';
import { FeatureInspectorPanel } from './panels/featureInspectorPanel';
import { ModelDashboardPanel } from './panels/modelDashboardPanel';
import { LspModelProvider } from './providers/lspModelProvider';
import { VisualizationPanel } from './visualization/visualizationPanel';

let modelExplorerProvider: ModelExplorerProvider;
let outputChannel: vscode.OutputChannel;
let lspModelProvider: LspModelProvider;

let parseDebounceTimer: ReturnType<typeof setTimeout> | undefined;
let activeParseCancel: vscode.CancellationTokenSource | undefined;
let modelMetricsItem: vscode.StatusBarItem | undefined;
let parseProgressItem: vscode.StatusBarItem | undefined;

/** Available visualization views — matches the webview's dropdown options */
const visualizationViews = [
    { id: 'elk',       label: '◆ General',          description: 'ELK auto-layout diagram' },
    { id: 'ibd',       label: '▦ Interconnection',  description: 'Internal block diagram' },
    { id: 'activity',  label: '▶ Activity',         description: 'Activity diagram' },
    { id: 'state',     label: '⌘ State',            description: 'State machine diagram' },
    { id: 'sequence',  label: '⇄ Sequence',         description: 'Sequence diagram' },
    { id: 'usecase',   label: '◎ Case',             description: 'Use case diagram' },
    { id: 'tree',      label: '▲ Tree',             description: 'Tree layout' },
    { id: 'package',   label: '▤ Package',          description: 'Package diagram' },
    { id: 'graph',     label: '● Graph',            description: 'Force-directed graph' },
    { id: 'hierarchy', label: '■ Hierarchy',        description: 'Hierarchical block diagram' },
];

/**
 * Parse a SysML document for the **Model Explorer** and **Visualization**
 * panels only.  Language features (diagnostics, completions, hover,
 * go-to-def, formatting, etc.) are handled by the LSP server.
 *
 * All parsing is performed by the LSP server via `sysml/model` requests.
 */
function parseSysMLDocument(document: vscode.TextDocument): void {
    // Cancel any in-flight parse for a previous file
    if (parseDebounceTimer) {
        globalThis.clearTimeout(parseDebounceTimer);
    }
    if (activeParseCancel) {
        activeParseCancel.cancel();
        activeParseCancel.dispose();
        activeParseCancel = undefined;
    }

    const cancelSource = new vscode.CancellationTokenSource();
    activeParseCancel = cancelSource;

    // Debounce (300 ms) — wait for the user to pause typing before
    // kicking off the model request.
    parseDebounceTimer = setTimeout(async () => {
        if (cancelSource.token.isCancellationRequested || document.isClosed) {
            return;
        }

        try {
            if (cancelSource.token.isCancellationRequested || document.isClosed) {
                return;
            }

            // --- Model explorer update ---
            const fileName = document.fileName.split('/').pop() || 'file';
            outputChannel?.appendLine(`parseSysMLDocument: loading ${fileName} (LSP)`);
            try {
                await modelExplorerProvider.loadDocument(document, cancelSource.token);
            } catch {
                // Model explorer failure is non-critical — continue to
                // update the visualizer so it always gets a chance to
                // fetch fresh data from the LSP server.
            }

            // Bail out if cancelled or closed during model explorer parse
            if (cancelSource.token.isCancellationRequested || document.isClosed) {
                outputChannel?.appendLine(`parseSysMLDocument: cancelled after model explorer update`);
                return;
            }

            // --- Status-bar model metrics ---
            const stats = modelExplorerProvider.getLastStats();
            if (stats) {
                updateModelMetrics(stats, document.uri);
            }

            // Push resolved types to Feature Inspector if it's open
            if (FeatureInspectorPanel.currentPanel && lspModelProvider) {
                try {
                    const typeResult = await lspModelProvider.getModel(
                        document.uri.toString(), ['resolvedTypes'], cancelSource.token,
                    );
                    if (typeResult.resolvedTypes) {
                        FeatureInspectorPanel.currentPanel.updateResolvedTypes(
                            typeResult.resolvedTypes, document.uri.toString(),
                        );
                    }
                } catch {
                    // Non-critical — inspector will fetch on next cursor move
                }
            }

            // Bail out if cancelled or closed
            if (cancelSource.token.isCancellationRequested || document.isClosed) {
                return;
            }

            // --- Visualization panel update ---
            if (VisualizationPanel.currentPanel) {
                VisualizationPanel.currentPanel.notifyFileChanged(document.uri);
            }
        } finally {
            if (activeParseCancel === cancelSource) {
                activeParseCancel = undefined;
            }
            cancelSource.dispose();
        }
    }, 300);
}

/**
 * Update the status-bar model-metrics item with element counts and
 * parse time from the latest `sysml/model` response.
 *
 * "Resolved" here means elements that have an explicit type annotation
 * (e.g. `part engine : Engine`).  Elements without a type — like
 * packages, top-level definitions, and un-typed usages — are simply
 * "un-typed", **not** errors.  We show the actual diagnostic count
 * from the Problems panel instead.
 */
export function updateModelMetrics(stats: {
    totalElements: number;
    resolvedElements: number;
    unresolvedElements: number;
    parseTimeMs: number;
    modelBuildTimeMs: number;
}, documentUri?: vscode.Uri): void {
    if (!modelMetricsItem) {
        modelMetricsItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right, 100
        );
        modelMetricsItem.name = 'SysML Model Metrics';
        // Click opens the Problems panel so users can see actionable issues
        modelMetricsItem.command = 'workbench.actions.view.problems';
    }

    // Count real diagnostics (errors/warnings) for the current file
    const diagnostics = documentUri
        ? vscode.languages.getDiagnostics(documentUri)
        : [];
    const errorCount = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
    const warnCount = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length;
    const issueCount = errorCount + warnCount;

    // Icon reflects actual problems, not type-resolution status
    const icon = errorCount > 0 ? '$(error)' : warnCount > 0 ? '$(warning)' : '$(check)';
    const issuesSuffix = issueCount > 0 ? ` | $(alert) ${issueCount}` : '';
    modelMetricsItem.text = `${icon} SysML: ${stats.totalElements} elements${issuesSuffix} | ${stats.parseTimeMs}ms`;

    const tooltipLines = [
        `Total elements: ${stats.totalElements}`,
        `Typed: ${stats.resolvedElements}`,
        `Un-typed: ${stats.unresolvedElements} (packages, definitions — normal)`,
        `Parse time: ${stats.parseTimeMs}ms`,
    ];
    if (issueCount > 0) {
        tooltipLines.push('');
        tooltipLines.push(`${errorCount} error(s), ${warnCount} warning(s)`);
        tooltipLines.push('Click to open Problems panel');
    }
    modelMetricsItem.tooltip = tooltipLines.join('\n');

    modelMetricsItem.backgroundColor = errorCount > 0
        ? new vscode.ThemeColor('statusBarItem.errorBackground')
        : warnCount > 0
            ? new vscode.ThemeColor('statusBarItem.warningBackground')
            : undefined;

    modelMetricsItem.show();
}

/** Hide the model-metrics status bar item (e.g. when no SysML file is open). */
export function hideModelMetrics(): void {
    modelMetricsItem?.hide();
}

/**
 * Show a "Parsing …" indicator in the status bar while the LSP
 * server is processing a file.  Called from `client.ts` when the
 * server sends `sysml/status` `begin` / `progress` notifications.
 */
export function showParseProgress(label: string): void {
    if (!parseProgressItem) {
        parseProgressItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left, 50,
        );
        parseProgressItem.name = 'SysML Parse Progress';
    }
    parseProgressItem.text = `$(sync~spin) Parsing ${label}…`;
    parseProgressItem.show();
}

/**
 * Hide the parse-progress status bar item.  Called from `client.ts`
 * when the server sends `sysml/status` `end`.
 */
export function hideParseProgress(): void {
    parseProgressItem?.hide();
}

/**
 * Called when the LSP server signals that it has finished parsing a
 * file (`sysml/status` → `end`).  Re-triggers `parseSysMLDocument`
 * so the Model Explorer and Visualization panels pick up the newly
 * available model data — prevents the "0 elements" problem on cold
 * start when the DFA warm-up delays initial parsing.
 */
export function notifyServerParseDone(uri?: string): void {
    // Find a matching open editor to re-parse
    const editors = vscode.window.visibleTextEditors.filter(
        e => e.document.languageId === 'sysml' && !e.document.isClosed,
    );
    let target: vscode.TextDocument | undefined;
    if (uri) {
        target = editors.find(e => e.document.uri.toString() === uri)?.document;
    }
    // Fallback: re-parse whichever SysML editor is active
    if (!target && editors.length > 0) {
        target = vscode.window.activeTextEditor?.document.languageId === 'sysml'
            ? vscode.window.activeTextEditor.document
            : editors[0].document;
    }
    if (target) {
        outputChannel?.appendLine(`notifyServerParseDone: re-parsing ${target.fileName.split('/').pop()}`);
        parseSysMLDocument(target);

        // Also notify the visualizer directly — the server has finished
        // parsing so sysml/model will return fresh data.  This avoids
        // waiting for the 300 ms debounce inside parseSysMLDocument.
        if (VisualizationPanel.currentPanel) {
            VisualizationPanel.currentPanel.notifyFileChanged(target.uri);
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    // Create dedicated output channel for logging
    outputChannel = vscode.window.createOutputChannel('SysML');
    context.subscriptions.push(outputChannel);

    outputChannel.appendLine('SysML v2.0 extension is now active');
    outputChannel.show(true);  // Auto-show so the user can see LSP status

    // ─── LSP Client ────────────────────────────────────────────────
    // The language server (sysml-v2-lsp) provides all core language
    // features: diagnostics, completions, hover, go-to-definition,
    // references, rename, formatting, code actions, semantic tokens,
    // CodeLens, inlay hints, document symbols, folding ranges, etc.
    const client = startLanguageClient(context, outputChannel);

    // ─── LSP Model Provider ───────────────────────────────────────
    // The model explorer and visualization panels query the LSP
    // server's `sysml/model` custom request.  All parsing is handled
    // by the language server — no extension-side parser.
    lspModelProvider = new LspModelProvider(client);
    outputChannel.appendLine('LSP model provider initialised');

    // ─── MCP Server ────────────────────────────────────────────────
    // Register the sysml-v2-lsp MCP server so Copilot / agent mode
    // can discover SysML tools, resources, and prompts.
    // NOTE: We resolve the path directly rather than require('sysml-v2-lsp')
    // because the upstream package's "main" field points to a non-existent
    // file, causing CJS require to fail even though "exports" is correct.
    const mcpServerPath = path.join(
        context.extensionPath, 'node_modules', 'sysml-v2-lsp',
        'dist', 'server', 'mcpServer.mjs'
    );
    if (fs.existsSync(mcpServerPath)) {
        const emitter = new vscode.EventEmitter<void>();
        context.subscriptions.push(emitter);
        context.subscriptions.push(
            vscode.lm.registerMcpServerDefinitionProvider('sysml-v2-mcp', {
                onDidChangeMcpServerDefinitions: emitter.event,
                provideMcpServerDefinitions: async () => [
                    new vscode.McpStdioServerDefinition(
                        'SysML v2 Model Context',
                        'node',
                        [mcpServerPath]
                    )
                ],
            })
        );
        outputChannel.appendLine(`MCP server registered: ${mcpServerPath}`);
    } else {
        outputChannel.appendLine(`Warning: MCP server not found at ${mcpServerPath}`);
    }

    // ─── Model Explorer ────────────────────────────────────────────
    modelExplorerProvider = new ModelExplorerProvider(lspModelProvider);
    vscode.window.registerTreeDataProvider('sysmlModelExplorer', modelExplorerProvider);

    // ─── Commands ──────────────────────────────────────────────────

    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.formatDocument', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'sysml') {
                await vscode.commands.executeCommand('editor.action.formatDocument');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.validateModel', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'sysml') {
                // Diagnostics are provided by the LSP server.
                const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
                vscode.window.showInformationMessage(
                    `Validation: ${diagnostics.length} issue(s) found`
                );
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.showVisualizer', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'sysml') {
                VisualizationPanel.createOrShow(context.extensionUri, editor.document, undefined, lspModelProvider);
            }
        })
    );


    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.refreshModelTree', () => {
            modelExplorerProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.clearCache', () => {
            vscode.window.showInformationMessage('SysML cache cleared');
            outputChannel.appendLine('[Cache] Cleared');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.showModelExplorer', async () => {
            // Set context to make the view visible
            await vscode.commands.executeCommand('setContext', 'sysml.modelLoaded', true);
            // Focus the Model Explorer view in the sidebar
            await vscode.commands.executeCommand('sysmlModelExplorer.focus');

            // If there's an active SysML document, load it into the explorer
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'sysml') {
                modelExplorerProvider.loadDocument(editor.document);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.refreshVisualization', () => {
            if (VisualizationPanel.currentPanel) {
                // Get the document from the current panel
                const currentDocument = VisualizationPanel.currentPanel.getDocument();

                if (currentDocument && currentDocument.languageId === 'sysml') {
                    VisualizationPanel.currentPanel.dispose();
                    VisualizationPanel.createOrShow(context.extensionUri, currentDocument, undefined, lspModelProvider);
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.visualizeFolder', async (uri: vscode.Uri, selectedUris?: vscode.Uri[]) => {
            try {
                // Handle multi-selection: when multiple items are selected in explorer,
                // VS Code passes the right-clicked item as first arg and all selected items as second arg
                let targetUris: vscode.Uri[] = [];

                if (selectedUris && selectedUris.length > 0) {
                    // Multi-selection case
                    targetUris = selectedUris;
                } else if (uri) {
                    // Single selection case
                    targetUris = [uri];
                } else {
                    // No URI provided, try to get from active editor
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        targetUris = [editor.document.uri];
                    }
                }

                if (targetUris.length === 0) {
                    vscode.window.showErrorMessage('No folder or file selected for SysML visualization');
                    return;
                }

                // Collect all .sysml files from all selected folders/files
                const allSysmlFiles: vscode.Uri[] = [];
                const folderNames: string[] = [];

                for (const targetUri of targetUris) {
                    const stat = await vscode.workspace.fs.stat(targetUri);

                    if (stat.type === vscode.FileType.Directory) {
                        // Handle folder - find all .sysml files recursively
                        const folderName = targetUri.fsPath.substring(targetUri.fsPath.lastIndexOf('/') + 1);
                        folderNames.push(folderName);

                        const sysmlFiles = await vscode.workspace.findFiles(
                            new vscode.RelativePattern(targetUri, '**/*.sysml'),
                            '**/node_modules/**'
                        );
                        allSysmlFiles.push(...sysmlFiles);
                    } else if (targetUri.fsPath.endsWith('.sysml')) {
                        // Handle single .sysml file
                        allSysmlFiles.push(targetUri);
                    }
                }

                // Remove duplicates (in case same file is in multiple selected folders)
                const uniqueFiles = [...new Map(allSysmlFiles.map(f => [f.fsPath, f])).values()];

                if (uniqueFiles.length === 0) {
                    vscode.window.showInformationMessage('No SysML files found in the selected folders/files');
                    return;
                }

                // Open ALL files via openTextDocument so the LSP server
                // receives textDocument/didOpen for each and can parse them.
                const openDocs: vscode.TextDocument[] = [];
                let combinedContent = '';
                const fileNames: string[] = [];

                for (const fileUri of uniqueFiles) {
                    try {
                        const doc = await vscode.workspace.openTextDocument(fileUri);
                        openDocs.push(doc);
                        const fileName = fileUri.fsPath.substring(fileUri.fsPath.lastIndexOf('/') + 1);
                        fileNames.push(fileName);

                        combinedContent += `// === ${fileName} ===\n`;
                        combinedContent += doc.getText();
                        combinedContent += '\n\n';
                    } catch (error) {
                        outputChannel?.appendLine(`[warn] Failed to open SysML file ${fileUri.fsPath}: ${error}`);
                    }
                }

                if (openDocs.length === 0) {
                    vscode.window.showErrorMessage('Failed to read any SysML files');
                    return;
                }

                // Use the first opened document as the base document
                const firstFileDocument = openDocs[0];

                // Create a wrapper that provides combined content but uses the real file URI
                // This avoids creating an untitled document
                const combinedDocumentProxy = {
                    getText: () => combinedContent,
                    uri: firstFileDocument.uri,
                    languageId: 'sysml',
                    version: firstFileDocument.version,
                    lineCount: combinedContent.split('\n').length,
                    lineAt: (line: number) => firstFileDocument.lineAt(Math.min(line, firstFileDocument.lineCount - 1)),
                    offsetAt: (position: vscode.Position) => firstFileDocument.offsetAt(position),
                    positionAt: (offset: number) => firstFileDocument.positionAt(offset),
                    getWordRangeAtPosition: (position: vscode.Position) => firstFileDocument.getWordRangeAtPosition(position),
                    validateRange: (range: vscode.Range) => firstFileDocument.validateRange(range),
                    validatePosition: (position: vscode.Position) => firstFileDocument.validatePosition(position),
                    fileName: firstFileDocument.fileName,
                    isUntitled: false,
                    isDirty: false,
                    isClosed: false,
                    eol: firstFileDocument.eol,
                    encoding: 'utf8',
                    save: () => Promise.resolve(false)
                } as unknown as vscode.TextDocument;

                // Build title based on selection
                let title: string;
                if (folderNames.length > 0) {
                    title = `SysML Visualization - ${fileNames.length} files from ${folderNames.length} folder(s)`;
                } else {
                    title = `SysML Visualization - ${fileNames.length} file(s)`;
                }

                // Show ONLY the visualization panel, not the text document
                VisualizationPanel.createOrShow(context.extensionUri, combinedDocumentProxy, title, lspModelProvider, uniqueFiles);

                // Update the Model Explorer with the combined document
                await modelExplorerProvider.loadDocument(combinedDocumentProxy);

                vscode.window.showInformationMessage(
                    `Visualizing ${fileNames.length} SysML files: ${fileNames.join(', ')}`
                );

            } catch (error) {
                vscode.window.showErrorMessage(`Failed to visualize SysML: ${error}`);
                outputChannel?.appendLine(`[error] Error in sysml.visualizeFolder: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.visualizeFolderWithView', async (uri: vscode.Uri, selectedUris?: vscode.Uri[]) => {
            const items = visualizationViews.map(v => ({
                label: v.label,
                description: v.description,
                viewId: v.id
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select visualization view'
            });

            if (selected) {
                // Execute visualizeFolder with the selected view, passing multi-selection
                await vscode.commands.executeCommand('sysml.visualizeFolder', uri, selectedUris);
                // Then switch to the selected view
                if (VisualizationPanel.currentPanel) {
                    await vscode.commands.executeCommand('sysml.changeVisualizerView', selected.viewId);
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.changeVisualizerView', async (viewId?: string) => {
            if (!VisualizationPanel.currentPanel) {
                vscode.window.showWarningMessage('No visualization panel is currently open');
                return;
            }

            let selectedViewId = viewId;

            // If no view ID provided, show picker
            if (!selectedViewId) {
                const items = visualizationViews.map(v => ({
                    label: v.label,
                    description: v.description,
                    viewId: v.id
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select visualization view'
                });

                if (!selected) {
                    return;
                }

                selectedViewId = selected.viewId;
            }

            // Change the view
            VisualizationPanel.currentPanel.changeView(selectedViewId);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.exportVisualization', async () => {
            const format = await vscode.window.showQuickPick(['PNG', 'SVG'], {
                placeHolder: 'Select export format'
            });
            if (!format) {
                return;
            }

            let scale = 2; // default
            if (format === 'PNG') {
                const config = vscode.workspace.getConfiguration('sysml');
                const defaultScale = config.get<number>('export.defaultScale', 2);

                interface ScaleOption extends vscode.QuickPickItem {
                    scale: number;
                }

                const scaleOptions: ScaleOption[] = [
                    { label: '1x - Original size', scale: 1, description: 'Smallest file size' },
                    { label: '2x - Double size', scale: 2, description: 'Good quality (default)' },
                    { label: '3x - Triple size', scale: 3, description: 'High quality' },
                    { label: '4x - Quadruple size', scale: 4, description: 'Very high quality, larger file' }
                ];

                // Mark the default option
                const optionsWithDefault: ScaleOption[] = scaleOptions.map(opt => ({
                    ...opt,
                    label: opt.scale === defaultScale ? `${opt.label} ✓` : opt.label
                }));

                const selectedScale = await vscode.window.showQuickPick<ScaleOption>(optionsWithDefault, {
                    placeHolder: `Select export resolution (default: ${defaultScale}x)`
                });

                if (!selectedScale) {
                    return;
                }
                scale = selectedScale.scale;
            }

            VisualizationPanel.currentPanel?.exportVisualization(format, scale);
        })
    );

    // ─── Type Hierarchy / Call Hierarchy ───────────────────────
    // The LSP server implements typeHierarchy & callHierarchy. These
    // commands surface VS Code's built-in hierarchy views from the
    // command palette for SysML files.
    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.showTypeHierarchy', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'sysml') {
                vscode.commands.executeCommand('editor.showTypeHierarchy');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.showCallHierarchy', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'sysml') {
                vscode.commands.executeCommand('editor.showCallHierarchy');
            }
        })
    );

    // ─── Feature Inspector ──────────────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.showFeatureInspector', () => {
            FeatureInspectorPanel.createOrShow(context.extensionUri, lspModelProvider);
        })
    );

    // ─── Model Dashboard ────────────────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.showModelDashboard', async (fileUri?: vscode.Uri) => {
            // When invoked from the file explorer, open the file first
            if (fileUri) {
                await vscode.window.showTextDocument(fileUri, { preview: false });
            }
            ModelDashboardPanel.createOrShow(context.extensionUri, lspModelProvider);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.jumpToDefinition', (uri: vscode.Uri, range: vscode.Range) => {
            if (!uri || !range) {
                vscode.window.showWarningMessage('Cannot navigate: missing location information');
                return;
            }

            vscode.window.showTextDocument(uri, {
                preserveFocus: false,
                preview: false
            }).then(editor => {
                // Set selection and reveal the range
                editor.selection = new vscode.Selection(range.start, range.end);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

                // Create a prominent highlight for the selected element
                const decorationType = vscode.window.createTextEditorDecorationType({
                    backgroundColor: 'rgba(255, 215, 0, 0.4)', // Gold background
                    border: '2px solid #FFD700', // Gold border
                    borderRadius: '3px',
                    isWholeLine: false,
                    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
                });

                editor.setDecorations(decorationType, [range]);

                // Clear the highlight after 3 seconds
                setTimeout(() => {
                    decorationType.dispose();
                }, 3000);
            });
        })
    );

    // Try to parse any already-open SysML file.  When VS Code restores a
    // session, activeTextEditor may still be undefined at the time activate()
    // runs, and onDidChangeActiveTextEditor won't fire because there's no
    // *change*.  We therefore retry with increasing delays.
    function tryParseActiveEditor(): boolean {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'sysml') {
            outputChannel.appendLine(`Parsing active SysML editor: ${editor.document.fileName}`);
            vscode.commands.executeCommand('setContext', 'sysml.modelLoaded', true);
            parseSysMLDocument(editor.document);
            return true;
        }
        return false;
    }

    const activeEditor = vscode.window.activeTextEditor;
    outputChannel.appendLine(`Active editor on activation: ${activeEditor ? activeEditor.document.fileName : 'none'}`);
    outputChannel.appendLine(`Language ID: ${activeEditor?.document.languageId ?? 'N/A'}`);
    if (!tryParseActiveEditor()) {
        // Editor not ready yet — retry a few times with increasing delays
        const retryDelays = [100, 500, 1500];
        let retryIndex = 0;
        const retryTimer = globalThis.setInterval(() => {
            if (tryParseActiveEditor() || retryIndex >= retryDelays.length) {
                globalThis.clearInterval(retryTimer);
                if (retryIndex >= retryDelays.length) {
                    outputChannel.appendLine('No active SysML editor found after retries');
                }
                return;
            }
            retryIndex++;
        }, retryDelays[Math.min(retryIndex, retryDelays.length - 1)]);
    }

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            outputChannel.appendLine(`onDidChangeActiveTextEditor: ${editor ? editor.document.fileName : 'none'} (lang: ${editor?.document.languageId ?? 'N/A'})`);
            if (editor && editor.document.languageId === 'sysml') {
                vscode.commands.executeCommand('setContext', 'sysml.modelLoaded', true);
                parseSysMLDocument(editor.document);
            }
        })
    );

    // Cancel active parse when a document is closed mid-flight
    // Also clear Model Explorer if no SysML files remain open
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(document => {
            if (document.languageId === 'sysml') {
                // Clear debounce timer so a pending parse doesn't start
                // after the document is already gone
                if (parseDebounceTimer) {
                    globalThis.clearTimeout(parseDebounceTimer);
                    parseDebounceTimer = undefined;
                }

                if (activeParseCancel) {
                    outputChannel.appendLine(`onDidCloseTextDocument: cancelling parse for ${document.fileName.split('/').pop()}`);
                    activeParseCancel.cancel();
                    activeParseCancel.dispose();
                    activeParseCancel = undefined;
                }

                // Check if any SysML files remain open
                const remainingSysmlEditors = vscode.window.visibleTextEditors.filter(
                    e => e.document.languageId === 'sysml' && !e.document.isClosed && e.document !== document
                );
                if (remainingSysmlEditors.length === 0) {
                    outputChannel.appendLine('onDidCloseTextDocument: no SysML files open, clearing Model Explorer');
                    vscode.commands.executeCommand('setContext', 'sysml.modelLoaded', false);
                    modelExplorerProvider.clear();
                    hideModelMetrics();
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'sysml') {
                // Re-parse for model explorer / visualization only.
                // Language features are handled by the LSP server.
                parseSysMLDocument(event.document);
            }
        })
    );

    // Trigger a visualization refresh on save — the LSP server may
    // need a moment to re-parse, so we add a short delay.  This
    // complements the onDidChangeTextDocument handler above which
    // covers typing, and the file system watcher below which covers
    // external changes.
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(document => {
            if (document.languageId === 'sysml' && VisualizationPanel.currentPanel) {
                // Short delay gives the LSP server time to process the save
                setTimeout(() => {
                    VisualizationPanel.currentPanel?.notifyFileChanged(document.uri);
                }, 500);
            }
        })
    );

    // Watch for file system changes to SysML files
    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*.sysml');

    context.subscriptions.push(fileSystemWatcher);

    context.subscriptions.push(
        fileSystemWatcher.onDidChange(uri => {
            outputChannel.appendLine(`SysML file changed: ${uri.fsPath}`);
            if (VisualizationPanel.currentPanel) {
                VisualizationPanel.currentPanel.notifyFileChanged(uri);
            }
        })
    );

    context.subscriptions.push(
        fileSystemWatcher.onDidCreate(uri => {
            outputChannel.appendLine(`SysML file created: ${uri.fsPath}`);
            if (VisualizationPanel.currentPanel) {
                VisualizationPanel.currentPanel.notifyFileChanged(uri);
            }
        })
    );

    context.subscriptions.push(
        fileSystemWatcher.onDidDelete(uri => {
            outputChannel.appendLine(`SysML file deleted: ${uri.fsPath}`);
            if (VisualizationPanel.currentPanel) {
                VisualizationPanel.currentPanel.notifyFileChanged(uri);
            }
        })
    );
}

export function getOutputChannel(): vscode.OutputChannel {
    return outputChannel;
}

export function deactivate(): PromiseLike<void> | undefined {
    outputChannel?.appendLine('SysML v2.0 extension is now deactivated');

    // Clean up resources
    modelMetricsItem?.dispose();
    modelMetricsItem = undefined;
    parseProgressItem?.dispose();
    parseProgressItem = undefined;
    if (VisualizationPanel.currentPanel) {
        VisualizationPanel.currentPanel.dispose();
    }
    if (FeatureInspectorPanel.currentPanel) {
        FeatureInspectorPanel.currentPanel.dispose();
    }
    if (ModelDashboardPanel.currentPanel) {
        ModelDashboardPanel.currentPanel.dispose();
    }

    // Stop the language server
    return stopLanguageClient();
}
