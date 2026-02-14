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
    ServerOptions,
    TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

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
        },
    };

    client = new LanguageClient(
        'sysmlLanguageServer',
        'SysML v2 Language Server',
        serverOptions,
        clientOptions
    );

    client.start().then(
        () => outputChannel.appendLine('SysML v2 language server started successfully'),
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
