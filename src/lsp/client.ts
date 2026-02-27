/**
 * SysML v2 Language Client
 *
 * Manages the lifecycle of the LSP client that connects to the
 * sysml-v2-lsp language server.  The server is shipped as an npm
 * dependency and launched directly via IPC transport — matching
 * the approach used by the working sysml-v2-lsp extension.
 */

import * as vscode from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ProgressToken,
    ServerOptions,
    TransportKind,
    WorkDoneProgressBegin,
} from 'vscode-languageclient/node';
import type { SysMLStatusParams } from '../providers/sysmlModelTypes';

let client: LanguageClient | undefined;

// ── WorkDoneProgress timeout protection ──────────────────────────
// The LSP server creates a WorkDoneProgress token (begin → … → end)
// for each parse.  When a parse is cancelled mid-flight the promise
// never resolves, so progress.done() is never called and the
// "Parsing …" spinner gets stuck.  We track active "Parsing" tokens
// here and force-end them after a safety timeout.
const PROGRESS_TIMEOUT_MS = 30_000;
let activeParsingToken: ProgressToken | undefined;
let parsingTimeoutHandle: ReturnType<typeof setTimeout> | undefined;

/**
 * Resolve the absolute path to the sysml-v2-lsp server module.
 * Uses the package's exported `serverPath` which points to
 * `dist/server/server.mjs` inside node_modules.
 */
function resolveServerPath(): string {
    const { serverPath } = require('sysml-v2-lsp');
    return serverPath as string;
}

/**
 * Start the SysML v2 language server and return the running client.
 */
export function startLanguageClient(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
): LanguageClient {
    const serverModule = resolveServerPath();
    outputChannel.appendLine(`Starting SysML v2 language server: ${serverModule}`);

    const serverOptions: ServerOptions = {
        run: {
            module: serverModule,
            transport: TransportKind.ipc,
        },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: {
                execArgv: ['--nolazy', '--inspect=6009'],
            },
        },
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'sysml' },
            { scheme: 'untitled', language: 'sysml' },
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{sysml,kerml}'),
        },
        outputChannel,
        traceOutputChannel: outputChannel,

        // Tell the server whether a .code-workspace was opened so it
        // can decide whether to pre-parse workspace files on startup.
        initializationOptions: {
            isWorkspaceFile: !!(vscode.workspace.workspaceFile
                && vscode.workspace.workspaceFile.scheme === 'file'),
        },

        // Disable inlay hints by default — they interfere with renaming
        // and editing identifiers in SysML files.  Users can opt-in via
        // the "sysml.inlayHints.enabled" setting.
        middleware: {
            provideInlayHints: (document, range, token, next) => {
                const enabled = vscode.workspace
                    .getConfiguration('sysml')
                    .get<boolean>('inlayHints.enabled', false);
                if (!enabled) {
                    return undefined;
                }
                return next(document, range, token);
            },

            // Suppress the built-in VS Code "Parsing …" progress
            // indicator for "Parsing" tokens — our custom animated
            // status-bar item in extension.ts handles this instead.
            // We still track the token for timeout-safety but never
            // forward "Parsing" progress to VS Code's default UI.
            handleWorkDoneProgress: (token, params, next) => {
                if ('kind' in params && params.kind === 'begin') {
                    const beginParams = params as WorkDoneProgressBegin;
                    if (beginParams.title === 'Parsing') {
                        // Track this as active parsing token
                        if (parsingTimeoutHandle) {
                            clearTimeout(parsingTimeoutHandle);
                        }
                        activeParsingToken = token;
                        parsingTimeoutHandle = setTimeout(() => {
                            activeParsingToken = undefined;
                            parsingTimeoutHandle = undefined;
                        }, PROGRESS_TIMEOUT_MS);
                        // Don't forward to VS Code — our animation handles it
                        return;
                    }
                } else if ('kind' in params && params.kind === 'end') {
                    if (token === activeParsingToken) {
                        activeParsingToken = undefined;
                        if (parsingTimeoutHandle) {
                            clearTimeout(parsingTimeoutHandle);
                            parsingTimeoutHandle = undefined;
                        }
                        // Don't forward to VS Code
                        return;
                    }
                } else if (token === activeParsingToken) {
                    // Suppress report/progress for parsing tokens too
                    return;
                }
                next(token, params);
            },
        },
    };

    client = new LanguageClient(
        'sysmlLanguageServer',
        'SysML v2 Language Server',
        serverOptions,
        clientOptions
    );

    // Register the sysml/status notification handler BEFORE start()
    // so notifications sent during initial document sync (which
    // happens inside start()) are never dropped.  Previously the
    // handler was registered inside start().then(), creating a race
    // where the server's sysml/status 'end' notification arrived
    // before the handler was in place — causing notifyServerParseDone
    // to never fire and the status bar to stay empty.
    client.onNotification('sysml/status', (params: SysMLStatusParams) => {
        const ext = require('../extension');
        if (params.state === 'begin' || params.state === 'progress') {
            ext.showParseProgress(params.fileName ?? params.message ?? 'Working');
        } else if (params.state === 'end') {
            ext.hideParseProgress();
            // Re-trigger model fetch now that the server
            // has finished parsing this file.
            ext.notifyServerParseDone(params.uri);
        }
    });

    client.start().then(
        () => {
            outputChannel.appendLine('SysML v2 language server started successfully');
        },
        (err) => {
            const msg = `Failed to start SysML language server: ${err}`;
            outputChannel.appendLine(msg);
            outputChannel.show(true);
            vscode.window.showErrorMessage(msg);
        }
    );

    // Restart command
    context.subscriptions.push(
        vscode.commands.registerCommand('sysml.restartServer', async () => {
            if (client) {
                await client.restart();
                outputChannel.appendLine('Language server restarted');
                vscode.window.showInformationMessage('SysML Language Server restarted.');
            }
        })
    );

    // Bridge command for CodeLens "N references" — converts raw JSON
    // arguments from the server into proper vscode types.
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'sysml.findReferences',
            (rawUri: string, rawPos: { line: number; character: number }) => {
                const uri = vscode.Uri.parse(rawUri);
                const pos = new vscode.Position(rawPos.line, rawPos.character);
                return vscode.commands.executeCommand(
                    'editor.action.findReferences',
                    uri,
                    pos
                );
            }
        )
    );

    return client;
}

/**
 * Stop the language server.
 */
export function stopLanguageClient(): PromiseLike<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}

/**
 * Get the current language client instance (may be undefined if not started).
 */
export function getLanguageClient(): LanguageClient | undefined {
    return client;
}
