import * as vscode from 'vscode';
import { ModelExplorerProvider } from './explorer/modelExplorerProvider';
import { LibraryService } from './library/service';
import { startLanguageClient, stopLanguageClient } from './lsp/client';
import { SysMLParser } from './parser/sysmlParser';
import { VisualizationPanel } from './visualization/visualizationPanel';

let modelExplorerProvider: ModelExplorerProvider;
let parser: SysMLParser;
let outputChannel: vscode.OutputChannel;

let parseDebounceTimer: ReturnType<typeof setTimeout> | undefined;
let activeParseCancel: vscode.CancellationTokenSource | undefined;

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
 * Centralized parse entry point.  Shows a progress notification
 * **immediately** (before any ANTLR work), gates language providers so they
 * don't trigger their own parse, and supports cancellation when the user
 * navigates away or the document is closed.
 */
/**
 * Parse a SysML document for the **Model Explorer** and **Visualization**
 * panels only.  Language features (diagnostics, completions, hover,
 * go-to-def, formatting, etc.) are handled by the LSP server.
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

    const fileName = document.fileName.split('/').pop() || 'file';
    const cancelSource = new vscode.CancellationTokenSource();
    activeParseCancel = cancelSource;

    // Debounce (300 ms) — wait for the user to pause typing before
    // kicking off the expensive ANTLR parse.
    parseDebounceTimer = setTimeout(async () => {
        if (cancelSource.token.isCancellationRequested || document.isClosed) {
            return;
        }

        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Parsing ${fileName}…`,
                    cancellable: false
                },
                async (_progress) => {
                    // Yield twice so the toast is painted before the sync parse blocks.
                    await new Promise(resolve => setTimeout(resolve, 0));
                    await new Promise(resolve => setTimeout(resolve, 0));

                    if (cancelSource.token.isCancellationRequested || document.isClosed) {
                        return;
                    }

                    // --- Model explorer update (ANTLR parse + semantic resolution) ---
                    outputChannel?.appendLine(`parseSysMLDocument: loading ${fileName}`);
                    await modelExplorerProvider.loadDocument(document, cancelSource.token);

                    // --- Visualization panel update (cache-warm, no re-parse) ---
                    // The ANTLR cache is now warm from the model explorer parse above,
                    // so the visualization just does JSON serialization + postMessage.
                    if (VisualizationPanel.currentPanel) {
                        VisualizationPanel.currentPanel.notifyFileChanged(document.uri);
                    }
                }
            );
        } finally {
            if (activeParseCancel === cancelSource) {
                activeParseCancel = undefined;
            }
            cancelSource.dispose();
        }
    }, 300);
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
    startLanguageClient(context, outputChannel);

    // ─── MCP Server ────────────────────────────────────────────────
    // Register the sysml-v2-lsp MCP server so Copilot / agent mode
    // can discover SysML tools, resources, and prompts.
    try {
        const { mcpServerPath } = require('sysml-v2-lsp');
        const emitter = new vscode.EventEmitter<void>();
        context.subscriptions.push(emitter);
        context.subscriptions.push(
            vscode.lm.registerMcpServerDefinitionProvider('sysml-v2-mcp', {
                onDidChangeMcpServerDefinitions: emitter.event,
                provideMcpServerDefinitions: async () => [
                    new vscode.McpStdioServerDefinition(
                        'SysML v2 Model Context',
                        'node',
                        [mcpServerPath as string]
                    )
                ],
            })
        );
        outputChannel.appendLine(`MCP server registered: ${mcpServerPath}`);
    } catch (err) {
        outputChannel.appendLine(`Warning: MCP server registration failed: ${err instanceof Error ? err.message : err}`);
    }

    // ─── Standard Library ──────────────────────────────────────────
    const libraryService = LibraryService.getInstance(context.extensionPath);
    libraryService.initialize().catch(err => {
        outputChannel.appendLine(`Warning: Library initialization failed: ${err instanceof Error ? err.message : err}`);
    });

    // ─── Parser (visualization & model explorer only) ──────────────
    parser = new SysMLParser();

    // ─── Model Explorer ────────────────────────────────────────────
    modelExplorerProvider = new ModelExplorerProvider(parser);
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
                // Diagnostics are provided continuously by the LSP server.
                // This command now shows the current diagnostic count.
                const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
                vscode.window.showInformationMessage(
                    `Validation: ${diagnostics.length} issue(s) reported by language server`
                );
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.showVisualizer', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'sysml') {
                const fileName = editor.document.fileName.split('/').pop() || 'file';
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `Parsing ${fileName}...`,
                        cancellable: false
                    },
                    async () => {
                        // Yield so the progress notification renders before the sync parse blocks
                        await new Promise(resolve => setTimeout(resolve, 0));
                        VisualizationPanel.createOrShow(context.extensionUri, parser, editor.document);
                    }
                );
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
            const { parseEntries, resolutionEntries } = parser.clearCache();
            const total = parseEntries + resolutionEntries;
            vscode.window.showInformationMessage(
                `SysML cache cleared (${total} ${total === 1 ? 'entry' : 'entries'} removed)`
            );
            outputChannel.appendLine(`[Cache] Cleared ${parseEntries} parse + ${resolutionEntries} resolution entries`);
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
                    VisualizationPanel.createOrShow(context.extensionUri, parser, currentDocument);
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

                // Read and combine all SysML files
                let combinedContent = '';
                const fileNames: string[] = [];

                for (const fileUri of uniqueFiles) {
                    try {
                        const content = await vscode.workspace.fs.readFile(fileUri);
                        const fileName = fileUri.fsPath.substring(fileUri.fsPath.lastIndexOf('/') + 1);
                        fileNames.push(fileName);

                        combinedContent += `// === ${fileName} ===\n`;
                        combinedContent += Buffer.from(content).toString('utf8');
                        combinedContent += '\n\n';
                    } catch (error) {
                        outputChannel?.appendLine(`[warn] Failed to read SysML file ${fileUri.fsPath}: ${error}`);
                    }
                }

                if (combinedContent.trim() === '') {
                    vscode.window.showErrorMessage('Failed to read any SysML files');
                    return;
                }

                // Create a virtual document for the combined content
                // Use the first actual file as the base document to avoid untitled files
                const firstFileDocument = await vscode.workspace.openTextDocument(uniqueFiles[0]);

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
                VisualizationPanel.createOrShow(context.extensionUri, parser, combinedDocumentProxy, title);

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

    // Visualization updates are handled as part of the centralized parse flow
    // in parseSysMLDocument() — no need for a separate onDidSaveTextDocument
    // handler. The file system watcher below covers external changes.

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
    parser?.dispose();
    if (VisualizationPanel.currentPanel) {
        VisualizationPanel.currentPanel.dispose();
    }

    // Stop the language server
    return stopLanguageClient();
}
