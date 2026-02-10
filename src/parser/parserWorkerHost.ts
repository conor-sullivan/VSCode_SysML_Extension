/**
 * Manages a Worker thread for ANTLR SysML parsing.
 *
 * Provides an async parse API that runs the heavyweight ANTLR
 * lexer / parser / visitor off the extension host thread, preventing
 * the ~4 s UI block that occurs on large files.
 */

import { Worker } from 'worker_threads';
import * as vscode from 'vscode';
import * as path from 'path';
import type { SysMLElement, Relationship } from './sysmlParser';

interface PendingRequest {
    resolve: (result: ParseWorkerResult) => void;
    reject: (error: Error) => void;
}

export interface ParseWorkerResult {
    elements: SysMLElement[];
    relationships: Relationship[];
}

export class ParserWorkerHost {
    private worker: Worker | null = null;
    private nextId = 0;
    private pending = new Map<number, PendingRequest>();

    // ── Worker lifecycle ──────────────────────────────────────────────

    private ensureWorker(): Worker {
        if (this.worker) { return this.worker; }

        const workerPath = path.join(__dirname, 'parserWorker.js');
        this.worker = new Worker(workerPath);

        this.worker.on('message', (msg: any) => {
            const req = this.pending.get(msg.id);
            if (!req) { return; } // stale / cancelled
            this.pending.delete(msg.id);

            if (msg.type === 'error') {
                req.reject(new Error(msg.error));
            } else {
                const elements = this.reconstructRanges(msg.elements);
                req.resolve({ elements, relationships: msg.relationships });
            }
        });

        this.worker.on('error', (err) => {
            for (const req of this.pending.values()) { req.reject(err); }
            this.pending.clear();
            this.worker = null;           // respawn on next request
        });

        this.worker.on('exit', (code) => {
            if (code !== 0) {
                const err = new Error(`Parser worker exited with code ${code}`);
                for (const req of this.pending.values()) { req.reject(err); }
                this.pending.clear();
            }
            this.worker = null;
        });

        return this.worker;
    }

    // ── Public API ────────────────────────────────────────────────────

    /**
     * Parse a SysML document in a Worker thread.
     * Returns the parsed elements and relationships with proper
     * `vscode.Range` objects reconstructed from the worker's output.
     */
    async parseDocument(
        text: string,
        uri: string,
        includeErrors: boolean
    ): Promise<ParseWorkerResult> {
        const worker = this.ensureWorker();
        const id = ++this.nextId;

        return new Promise<ParseWorkerResult>((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            worker.postMessage({ type: 'parse', id, text, uri, includeErrors });
        });
    }

    /**
     * Cancel all in-flight parse requests (e.g. when the user switches files).
     */
    cancelAll(): void {
        for (const req of this.pending.values()) {
            req.reject(new Error('Parse cancelled'));
        }
        this.pending.clear();
    }

    /**
     * Terminate the worker thread and release resources.
     */
    dispose(): void {
        this.cancelAll();
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }

    // ── Deserialization ───────────────────────────────────────────────

    /**
     * Recursively converts plain `{start, end}` range objects that came
     * through `structuredClone` into proper `vscode.Range` instances.
     */
    private reconstructRanges(elements: any[]): SysMLElement[] {
        for (const el of elements) {
            if (el.range?.start != null && el.range?.end != null) {
                el.range = new vscode.Range(
                    el.range.start.line,  el.range.start.character,
                    el.range.end.line,    el.range.end.character
                );
            }
            if (el.children?.length) {
                this.reconstructRanges(el.children);
            }
        }
        return elements;
    }
}
