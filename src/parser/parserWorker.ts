/**
 * Worker thread for ANTLR SysML parsing.
 *
 * Runs the heavyweight ANTLR lexer/parser/visitor off the extension host
 * thread to prevent ~4 s UI blocks on large files.
 *
 * IMPORTANT: This file uses only `require()` calls — no `import` statements —
 * so that the vscode module mock is installed *before* any dependent module
 * (antlrSysMLParser) is loaded.  TypeScript hoists `import` to the top of the
 * compiled output, which would cause `require('vscode')` to run before the
 * mock is ready.
 */

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */

// ── Step 1: Intercept `require('vscode')` ────────────────────────────
// Must happen before ANY module that `import * as vscode from 'vscode'`.
const nodeModule = require('module');
const nodePath   = require('path');

const _origResolve = (nodeModule as any)._resolveFilename;
(nodeModule as any)._resolveFilename = function (request: string, ...args: unknown[]) {
    if (request === 'vscode') {
        return nodePath.join(__dirname, 'vscodeMock.js');
    }
    return _origResolve.call(this, request, ...args);
};

// ── Step 2: Load the ANTLR parser (now uses vscodeMock for 'vscode') ─
const { parentPort }       = require('worker_threads');
const { ANTLRSysMLParser } = require('./antlrSysMLParser');

// ── Minimal TextDocument mock ─────────────────────────────────────────
// ANTLRSysMLParser.parseDocument() reads:
//   • getText()          – full text
//   • getText(range)     – text within a Range
//   • lineCount          – number of lines
//   • uri / fileName     – for error reporting

interface RangeLike {
    start: { line: number; character: number };
    end:   { line: number; character: number };
}

function createMockDocument(text: string, uri: string) {
    const lines = text.split('\n');
    return {
        getText(range?: RangeLike): string {
            if (!range) { return text; }
            const sl = range.start.line;
            const sc = range.start.character;
            const el = range.end.line;
            const ec = range.end.character;
            if (sl === el) {
                return (lines[sl] || '').substring(sc, ec);
            }
            const parts: string[] = [];
            parts.push((lines[sl] || '').substring(sc));
            for (let i = sl + 1; i < el; i++) {
                parts.push(lines[i] || '');
            }
            parts.push((lines[el] || '').substring(0, ec));
            return parts.join('\n');
        },
        get lineCount()  { return lines.length; },
        get uri()        { return { toString: () => uri, fsPath: uri }; },
        get languageId() { return 'sysml'; },
        get fileName()   { return uri; },
        get isClosed()   { return false; },
    };
}

// ── Worker message handling ───────────────────────────────────────────
// One parser instance lives for the worker's lifetime so the ANTLR DFA
// prediction cache is reused across parse requests.
const antlrParser = new ANTLRSysMLParser();

parentPort?.on('message', (msg: any) => {
    if (msg.type === 'parse') {
        try {
            const doc = createMockDocument(msg.text, msg.uri);
            const elements      = antlrParser.parseDocument(doc, msg.includeErrors ?? false);
            const relationships = antlrParser.getRelationships();
            parentPort!.postMessage({ id: msg.id, type: 'result', elements, relationships });
        } catch (err: unknown) {
            parentPort!.postMessage({
                id: msg.id,
                type: 'error',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
});
