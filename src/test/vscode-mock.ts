/**
 * Lightweight vscode module mock for running unit tests outside the
 * VS Code extension host (i.e. via mocha + ts-node).
 *
 * Only the APIs actually exercised by the "mockable" test files are
 * implemented here.  Integration tests that call real VS Code APIs
 * (executeCommand, openTextDocument, etc.) still require the full
 * extension host and should not be included in the `test:unit` glob.
 */

// ─── Core value types ────────────────────────────────────────────

export class Position {
    constructor(
        public readonly line: number,
        public readonly character: number
    ) {}

    isEqual(other: Position): boolean {
        return this.line === other.line && this.character === other.character;
    }

    isBefore(other: Position): boolean {
        if (this.line < other.line) return true;
        if (this.line === other.line && this.character < other.character) return true;
        return false;
    }

    isAfter(other: Position): boolean {
        return !this.isEqual(other) && !this.isBefore(other);
    }

    translate(lineDelta = 0, characterDelta = 0): Position {
        return new Position(this.line + lineDelta, this.character + characterDelta);
    }

    with(line?: number, character?: number): Position {
        return new Position(line ?? this.line, character ?? this.character);
    }

    compareTo(other: Position): number {
        if (this.isBefore(other)) return -1;
        if (this.isAfter(other)) return 1;
        return 0;
    }
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
            this.end = new Position(c ?? 0, d ?? 0);
        } else {
            this.start = a as Position;
            this.end = b as Position;
        }
    }

    get isEmpty(): boolean {
        return this.start.isEqual(this.end);
    }

    get isSingleLine(): boolean {
        return this.start.line === this.end.line;
    }

    contains(positionOrRange: Position | Range): boolean {
        if (positionOrRange instanceof Range) {
            return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
        }
        const pos = positionOrRange;
        if (pos.isBefore(this.start) || pos.isAfter(this.end)) return false;
        return true;
    }

    with(start?: Position, end?: Position): Range {
        return new Range(start ?? this.start, end ?? this.end);
    }

    intersection(other: Range): Range | undefined {
        const start = this.start.isBefore(other.start) ? other.start : this.start;
        const end = this.end.isBefore(other.end) ? this.end : other.end;
        if (start.isAfter(end)) return undefined;
        return new Range(start, end);
    }

    union(other: Range): Range {
        const start = this.start.isBefore(other.start) ? this.start : other.start;
        const end = this.end.isAfter(other.end) ? this.end : other.end;
        return new Range(start, end);
    }

    isEqual(other: Range): boolean {
        return this.start.isEqual(other.start) && this.end.isEqual(other.end);
    }
}

export class Selection extends Range {
    public readonly anchor: Position;
    public readonly active: Position;

    constructor(anchorLine: number, anchorChar: number, activeLine: number, activeChar: number);
    constructor(anchor: Position, active: Position);
    constructor(
        a: number | Position,
        b: number | Position,
        c?: number,
        d?: number
    ) {
        if (typeof a === 'number' && typeof b === 'number') {
            super(a, b, c ?? 0, d ?? 0);
            this.anchor = new Position(a, b);
            this.active = new Position(c ?? 0, d ?? 0);
        } else {
            super(a as Position, b as Position);
            this.anchor = a as Position;
            this.active = b as Position;
        }
    }

    get isReversed(): boolean {
        return this.anchor.isAfter(this.active);
    }
}

// ─── Uri ─────────────────────────────────────────────────────────

export class Uri {
    private constructor(
        public readonly scheme: string,
        public readonly authority: string,
        public readonly path: string,
        public readonly query: string,
        public readonly fragment: string
    ) {}

    get fsPath(): string {
        return this.path;
    }

    toString(): string {
        return `${this.scheme}://${this.path}`;
    }

    with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): Uri {
        return new Uri(
            change.scheme ?? this.scheme,
            change.authority ?? this.authority,
            change.path ?? this.path,
            change.query ?? this.query,
            change.fragment ?? this.fragment
        );
    }

    toJSON(): any {
        return { scheme: this.scheme, authority: this.authority, path: this.path, query: this.query, fragment: this.fragment };
    }

    static file(path: string): Uri {
        return new Uri('file', '', path, '', '');
    }

    static parse(value: string): Uri {
        const match = value.match(/^([^:]+):\/\/(.*)$/);
        if (match) {
            return new Uri(match[1], '', match[2], '', '');
        }
        return new Uri('file', '', value, '', '');
    }

    static from(components: { scheme: string; authority?: string; path?: string; query?: string; fragment?: string }): Uri {
        return new Uri(
            components.scheme,
            components.authority ?? '',
            components.path ?? '',
            components.query ?? '',
            components.fragment ?? ''
        );
    }

    static joinPath(base: Uri, ...pathSegments: string[]): Uri {
        const joined = [base.path, ...pathSegments].join('/').replace(/\/+/g, '/');
        return base.with({ path: joined });
    }
}

// ─── Enums ───────────────────────────────────────────────────────

export enum EndOfLine {
    LF = 1,
    CRLF = 2
}

export enum DiagnosticSeverity {
    Error = 0,
    Warning = 1,
    Information = 2,
    Hint = 3
}

export enum SymbolKind {
    File = 0,
    Module = 1,
    Namespace = 2,
    Package = 3,
    Class = 4,
    Method = 5,
    Property = 6,
    Field = 7,
    Constructor = 8,
    Enum = 9,
    Interface = 10,
    Function = 11,
    Variable = 12,
    Constant = 13,
    String = 14,
    Number = 15,
    Boolean = 16,
    Array = 17,
    Object = 18,
    Key = 19,
    Null = 20,
    EnumMember = 21,
    Struct = 22,
    Event = 23,
    Operator = 24,
    TypeParameter = 25
}

export enum CompletionItemKind {
    Text = 0,
    Method = 1,
    Function = 2,
    Constructor = 3,
    Field = 4,
    Variable = 5,
    Class = 6,
    Interface = 7,
    Module = 8,
    Property = 9,
    Unit = 10,
    Value = 11,
    Enum = 12,
    Keyword = 13,
    Snippet = 14,
    Color = 15,
    Reference = 17,
    File = 16,
    Folder = 18,
    EnumMember = 19,
    Constant = 20,
    Struct = 21,
    Event = 22,
    Operator = 23,
    TypeParameter = 24
}

export enum CodeActionKind {
    Empty = '',
    QuickFix = 'quickfix',
    Refactor = 'refactor',
    RefactorExtract = 'refactor.extract',
    RefactorInline = 'refactor.inline',
    RefactorRewrite = 'refactor.rewrite',
    Source = 'source',
    SourceOrganizeImports = 'source.organizeImports',
    SourceFixAll = 'source.fixAll'
}

export enum ConfigurationTarget {
    Global = 1,
    Workspace = 2,
    WorkspaceFolder = 3
}

// ─── Document types ──────────────────────────────────────────────

export class Diagnostic {
    constructor(
        public range: Range,
        public message: string,
        public severity: DiagnosticSeverity = DiagnosticSeverity.Error
    ) {}

    public source?: string;
    public code?: string | number;
}

export class DocumentSymbol {
    public children: DocumentSymbol[] = [];

    constructor(
        public name: string,
        public detail: string,
        public kind: SymbolKind,
        public range: Range,
        public selectionRange: Range
    ) {}
}

export class Location {
    constructor(
        public uri: Uri,
        public range: Range
    ) {}
}

export class CodeAction {
    constructor(
        public title: string,
        public kind?: any
    ) {}
}

export class CompletionList {
    constructor(
        public items: any[] = [],
        public isIncomplete = false
    ) {}
}

export class Hover {
    constructor(
        public contents: any,
        public range?: Range
    ) {}
}

// ─── Workspace / Window stubs ────────────────────────────────────

export const workspace = {
    openTextDocument: async (_uri: any): Promise<any> => {
        throw new Error('workspace.openTextDocument is not available in unit test mode');
    },
    getConfiguration: (_section?: string) => ({
        get: <T>(_key: string, defaultValue?: T) => defaultValue,
        has: (_key: string) => false,
        inspect: (_key: string) => undefined,
        update: async () => {},
    }),
    onDidChangeTextDocument: () => ({ dispose: () => {} }),
    onDidOpenTextDocument: () => ({ dispose: () => {} }),
    onDidCloseTextDocument: () => ({ dispose: () => {} }),
    onDidChangeConfiguration: () => ({ dispose: () => {} }),
    workspaceFolders: undefined as any,
    fs: {
        readFile: async () => Buffer.from(''),
        writeFile: async () => {},
        stat: async () => ({ type: 1, ctime: 0, mtime: 0, size: 0 }),
    },
};

export const window = {
    showInformationMessage: async (..._args: any[]) => undefined,
    showWarningMessage: async (..._args: any[]) => undefined,
    showErrorMessage: async (..._args: any[]) => undefined,
    createOutputChannel: (_name: string) => ({
        appendLine: () => {},
        append: () => {},
        show: () => {},
        hide: () => {},
        clear: () => {},
        dispose: () => {},
    }),
    withProgress: async (_options: any, task: any) => task({ report: () => {} }),
    activeTextEditor: undefined as any,
    showTextDocument: async () => undefined,
    createWebviewPanel: () => ({
        webview: { html: '', onDidReceiveMessage: () => ({ dispose: () => {} }), asWebviewUri: (u: any) => u },
        onDidDispose: () => ({ dispose: () => {} }),
        reveal: () => {},
        dispose: () => {},
    }),
};

export const commands = {
    executeCommand: async (..._args: any[]) => undefined,
    getCommands: async () => [] as string[],
    registerCommand: (_command: string, _callback: (...args: any[]) => any) => ({ dispose: () => {} }),
};

export const languages = {
    getDiagnostics: (_uri?: any) => [] as Diagnostic[],
    getLanguages: async () => ['sysml'] as string[],
    registerCodeActionsProvider: () => ({ dispose: () => {} }),
    createDiagnosticCollection: (_name?: string) => ({
        set: () => {},
        delete: () => {},
        clear: () => {},
        forEach: () => {},
        get: () => undefined,
        has: () => false,
        dispose: () => {},
    }),
};

export const extensions = {
    getExtension: (_id: string) => undefined,
};

// ─── Event constructors ─────────────────────────────────────────

export class EventEmitter {
    private _listeners: ((...args: any[]) => any)[] = [];

    get event() {
        return (listener: (...args: any[]) => any) => {
            this._listeners.push(listener);
            return { dispose: () => { this._listeners = this._listeners.filter(l => l !== listener); } };
        };
    }

    fire(data?: any): void {
        for (const listener of this._listeners) {
            listener(data);
        }
    }

    dispose(): void {
        this._listeners = [];
    }
}

export class CancellationTokenSource {
    token = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) };
    cancel(): void { this.token.isCancellationRequested = true; }
    dispose(): void {}
}

// ─── TreeItem (for explorer tests) ──────────────────────────────

export enum TreeItemCollapsibleState {
    None = 0,
    Collapsed = 1,
    Expanded = 2
}

export class TreeItem {
    public label?: string;
    public collapsibleState?: TreeItemCollapsibleState;
    public iconPath?: any;
    public description?: string;
    public tooltip?: string;
    public command?: any;
    public contextValue?: string;

    constructor(label: string, collapsibleState?: TreeItemCollapsibleState) {
        this.label = label;
        this.collapsibleState = collapsibleState;
    }
}

// ─── MarkdownString ─────────────────────────────────────────────

export class MarkdownString {
    public value: string;
    public isTrusted?: boolean;
    public supportThemeIcons?: boolean;

    constructor(value = '') {
        this.value = value;
    }

    appendText(value: string): MarkdownString {
        this.value += value;
        return this;
    }

    appendMarkdown(value: string): MarkdownString {
        this.value += value;
        return this;
    }

    appendCodeblock(value: string, language?: string): MarkdownString {
        this.value += `\n\`\`\`${language ?? ''}\n${value}\n\`\`\`\n`;
        return this;
    }
}

// ─── TextEdit ───────────────────────────────────────────────────

export class TextEdit {
    constructor(
        public range: Range,
        public newText: string
    ) {}

    static replace(range: Range, newText: string): TextEdit {
        return new TextEdit(range, newText);
    }

    static insert(position: Position, newText: string): TextEdit {
        return new TextEdit(new Range(position, position), newText);
    }

    static delete(range: Range): TextEdit {
        return new TextEdit(range, '');
    }
}

export class WorkspaceEdit {
    private _edits: Map<string, TextEdit[]> = new Map();

    replace(uri: Uri, range: Range, newText: string): void {
        const key = uri.toString();
        if (!this._edits.has(key)) this._edits.set(key, []);
        this._edits.get(key)?.push(TextEdit.replace(range, newText));
    }

    insert(uri: Uri, position: Position, newText: string): void {
        const key = uri.toString();
        if (!this._edits.has(key)) this._edits.set(key, []);
        this._edits.get(key)?.push(TextEdit.insert(position, newText));
    }

    delete(uri: Uri, range: Range): void {
        const key = uri.toString();
        if (!this._edits.has(key)) this._edits.set(key, []);
        this._edits.get(key)?.push(TextEdit.delete(range));
    }

    has(uri: Uri): boolean {
        return this._edits.has(uri.toString());
    }

    get size(): number {
        return this._edits.size;
    }
}
