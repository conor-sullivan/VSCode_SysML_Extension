/**
 * LspModelProvider — fetches parsed model data from the sysml-v2-lsp
 * language server via the custom `sysml/model` request.
 */

import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import {
    PositionDTO,
    RangeDTO,
    SysMLElementDTO,
    SysMLModelParams,
    SysMLModelResult,
    SysMLModelScope,
} from './sysmlModelTypes';

// Re-export for consumer convenience
export type { SysMLModelResult, SysMLModelScope };

/**
 * Convert a 0-based LSP PositionDTO to a `vscode.Position`.
 */
function toVscodePosition(p: PositionDTO): vscode.Position {
    return new vscode.Position(p.line, p.character);
}

/**
 * Convert a 0-based LSP RangeDTO to a `vscode.Range`.
 */
export function toVscodeRange(r: RangeDTO): vscode.Range {
    return new vscode.Range(toVscodePosition(r.start), toVscodePosition(r.end));
}

/**
 * Recursively stamp `vscode.Range` objects onto every element in the
 * tree so consumers can use `.range` directly without manual conversion.
 * The original `RangeDTO` is preserved for serialisation.
 */
function convertRangesInPlace(elements: SysMLElementDTO[]): void {
    for (const el of elements) {
        // Stamp a vscode.Range as a non-enumerable property so JSON
        // serialisation (for webview postMessage) still works.
        Object.defineProperty(el, 'vscodeRange', {
            value: toVscodeRange(el.range),
            configurable: true,
            writable: true,
        });
        if (el.children?.length) {
            convertRangesInPlace(el.children);
        }
    }
}

export class LspModelProvider {
    constructor(private readonly _client: LanguageClient) {}

    /**
     * Request the parsed model from the LSP server.
     *
     * On cold start the server may still be warming up its DFA /
     * parsing the file, so it can return 0 elements.  We retry a
     * few times with exponential back-off before giving up.
     *
     * @param uri       Document URI to query
     * @param scopes    Optional subset of data to return — defaults to all
     * @param token     Cancellation token forwarded to `sendRequest`
     */
    async getModel(
        uri: string,
        scopes?: SysMLModelScope[],
        token?: vscode.CancellationToken,
    ): Promise<SysMLModelResult> {
        const params: SysMLModelParams = {
            textDocument: { uri },
        };
        if (scopes && scopes.length > 0) {
            params.scope = scopes;
        }

        // Retry with exponential back-off when the server hasn't
        // finished parsing yet (returns 0 elements).
        const retryDelays = [1000, 3000, 8000]; // ms
        let result: SysMLModelResult;

        for (let attempt = 0; ; attempt++) {
            if (token?.isCancellationRequested) {
                return { version: 0, elements: [], relationships: [] };
            }

            result = await this._client.sendRequest<SysMLModelResult>(
                'sysml/model',
                params,
                token,
            );

            const hasData = (result.elements?.length ?? 0) > 0;
            if (hasData || attempt >= retryDelays.length) {
                break;
            }

            // Wait before retrying
            await new Promise<void>((resolve) => {
                const timer = setTimeout(resolve, retryDelays[attempt]);
                // Cancel the delay if the token fires
                token?.onCancellationRequested(() => {
                    globalThis.clearTimeout(timer);
                    resolve();
                });
            });
        }

        // Stamp vscode.Range onto every element for convenient consumer use
        if (result.elements) {
            convertRangesInPlace(result.elements);
        }

        return result;
    }

    /**
     * Find an element by name in the model.  Performs a depth-first
     * search over `.elements` returned by the last `getModel` call
     * with `scope: ['elements']`.
     */
    async findElement(
        uri: string,
        elementName: string,
        parentContext?: string,
        token?: vscode.CancellationToken,
    ): Promise<SysMLElementDTO | undefined> {
        const result = await this.getModel(uri, ['elements'], token);
        if (!result.elements) {
            return undefined;
        }

        if (parentContext) {
            const parent = this._findRecursive(parentContext, result.elements);
            if (parent?.children) {
                const found = this._findRecursive(elementName, parent.children);
                if (found) return found;
            }
        }

        return this._findRecursive(elementName, result.elements);
    }

    private _findRecursive(name: string, elements: SysMLElementDTO[]): SysMLElementDTO | undefined {
        for (const el of elements) {
            if (el.name === name) return el;
            if (el.children?.length) {
                const found = this._findRecursive(name, el.children);
                if (found) return found;
            }
        }
        return undefined;
    }
}
