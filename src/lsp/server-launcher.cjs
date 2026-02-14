/**
 * CJS launcher for the sysml-v2-lsp language server.
 *
 * The sysml-v2-lsp server bundle (server.js) is ESM — it starts with
 * `import { createRequire } from 'node:module'`.  When vscode-
 * languageclient forks this module, it runs under Electron's Node
 * with ELECTRON_RUN_AS_NODE=1.  Depending on the Electron / Node
 * version, the runtime may or may not auto-detect ESM for `.js`
 * files whose package.json lacks `"type": "module"`.
 *
 * This tiny CJS wrapper side-steps the issue entirely by using a
 * dynamic `import()` — which is available in every Node ≥ 14 and
 * in every Electron build — to load the ESM bundle.
 */

const path = require('path');

// Resolve the real server.js from the sysml-v2-lsp package
const { serverPath } = require('sysml-v2-lsp');

// ── Diagnostic IPC interception ────────────────────────────────────
// Log a summary of key LSP messages flowing through the IPC channel.
// This runs BEFORE the server loads so we can observe everything.
const DEBUG_LSP = process.env.SYSML_DEBUG_LSP === '1';

if (DEBUG_LSP) {
    const origSend = process.send.bind(process);
    process.send = function(msg, ...args) {
        if (msg && typeof msg === 'object') {
            // Log responses to key requests
            if (msg.id !== undefined && msg.result !== undefined) {
                const resultSummary = Array.isArray(msg.result)
                    ? `Array(${msg.result.length})`
                    : typeof msg.result === 'object' && msg.result !== null
                        ? JSON.stringify(msg.result).substring(0, 150)
                        : String(msg.result);
                process.stderr.write(`[LSP ←] id=${msg.id} result=${resultSummary}\n`);
            }
            if (msg.error) {
                process.stderr.write(`[LSP ←] id=${msg.id} ERROR: ${JSON.stringify(msg.error)}\n`);
            }
        }
        return origSend(msg, ...args);
    };

    const origOn = process.on.bind(process);
    let messageListenerWrapped = false;
    process.on = function(event, listener) {
        if (event === 'message' && !messageListenerWrapped) {
            messageListenerWrapped = true;
            const wrappedListener = function(msg) {
                if (msg && typeof msg === 'object') {
                    if (msg.method) {
                        // Notifications and requests
                        const paramsSummary = msg.params && msg.params.textDocument
                            ? `uri=${msg.params.textDocument.uri}`
                            : '';
                        process.stderr.write(`[LSP →] ${msg.method} ${paramsSummary}${msg.id !== undefined ? ` id=${msg.id}` : ''}\n`);
                    }
                }
                return listener.call(this, msg);
            };
            return origOn.call(this, event, wrappedListener);
        }
        return origOn.call(this, event, listener);
    };

    process.stderr.write('[sysml-v2-lsp launcher] DEBUG_LSP message tracing enabled\n');
}

// Log process.argv so we can verify --node-ipc is present
process.stderr.write('[sysml-v2-lsp launcher] argv: ' + JSON.stringify(process.argv) + '\n');

// Dynamic import() works for both CJS and ESM targets
import(serverPath).then(mod => {
    // The server auto-starts via $.listen() at module scope.
    // Nothing to do here — the import triggers all initialization.
    // Log that the server loaded successfully for diagnosability.
    process.stderr.write('[sysml-v2-lsp launcher] Server module loaded\n');
}).catch(err => {
    console.error('[sysml-v2-lsp launcher] Failed to load server:', err);
    process.exit(1);
});
