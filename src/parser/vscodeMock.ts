/**
 * Minimal vscode module mock for the parser Worker thread.
 *
 * The ANTLRSysMLParser imports `vscode` only for `Position` and `Range`.
 * This module provides lightweight clones that are serializable via the
 * structured-clone algorithm used by `worker_threads.postMessage()`.
 *
 * On the main thread the `ParserWorkerHost` reconstructs real
 * `vscode.Range` / `vscode.Position` instances from the plain objects.
 */

export class Position {
    constructor(
        public readonly line: number,
        public readonly character: number
    ) {}
}

export class Range {
    public readonly start: Position;
    public readonly end: Position;

    constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number);
    constructor(start: Position, end: Position);
    constructor(
        a: number | Position,
        b: number | Position,
        c?: number,
        d?: number
    ) {
        if (typeof a === 'number' && typeof b === 'number') {
            this.start = new Position(a, b);
            this.end = new Position(c!, d!);
        } else {
            this.start = a as Position;
            this.end = b as Position;
        }
    }
}
