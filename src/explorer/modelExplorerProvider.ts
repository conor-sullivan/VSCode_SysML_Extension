import * as vscode from 'vscode';
import { LspModelProvider, toVscodeRange } from '../providers/lspModelProvider';
import type { SysMLElementDTO } from '../providers/sysmlModelTypes';
import type { Relationship, SysMLElement } from '../types/sysmlTypes';

/**
 * Convert an `SysMLElementDTO` (plain objects, Record attributes) into a
 * `SysMLElement` (vscode.Range, Map attributes) so the tree-item code
 * can work identically regardless of source.
 */
function dtoToSysMLElement(dto: SysMLElementDTO): SysMLElement {
    const attrs = new Map<string, string | number | boolean>();
    if (dto.attributes) {
        for (const [k, v] of Object.entries(dto.attributes)) {
            attrs.set(k, v);
        }
    }
    return {
        type: dto.type,
        name: dto.name,
        range: toVscodeRange(dto.range),
        children: (dto.children ?? []).map(dtoToSysMLElement),
        attributes: attrs,
        relationships: (dto.relationships ?? []).map(r => ({
            type: r.type,
            source: r.source,
            target: r.target,
            name: r.name,
        })),
        errors: dto.errors,
    };
}

export class ModelExplorerProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private currentDocument: vscode.TextDocument | undefined;
    private pendingDocument: vscode.TextDocument | undefined;
    private rootElements: SysMLElement[] = [];
    private isLoading: boolean = false;

    /** Stats from the most recent LSP `sysml/model` response. */
    private _lastStats: { totalElements: number; resolvedElements: number; unresolvedElements: number; parseTimeMs: number; modelBuildTimeMs: number } | undefined;

    constructor(private _lspModelProvider: LspModelProvider) {}

    /** Return stats from the most recent LSP model response, if available. */
    getLastStats(): { totalElements: number; resolvedElements: number; unresolvedElements: number; parseTimeMs: number; modelBuildTimeMs: number } | undefined {
        return this._lastStats;
    }

    refresh(): void {
        if (this.currentDocument) {
            this.loadDocument(this.currentDocument);
        }
        this._onDidChangeTreeData.fire();
    }

    /**
     * Clear the model explorer when no SysML files are open
     */
    clear(): void {
        this.currentDocument = undefined;
        this.pendingDocument = undefined;
        this.rootElements = [];
        this._onDidChangeTreeData.fire();
    }

    async loadDocument(document: vscode.TextDocument, cancellationToken?: vscode.CancellationToken): Promise<void> {
        this.currentDocument = document;

        // If we're already loading, queue the new document so it isn't silently dropped
        if (this.isLoading) {
            this.pendingDocument = document;
            try {
                const { getOutputChannel } = require('../extension');
                getOutputChannel()?.appendLine('ModelExplorer: loadDocument queued (already loading)');
            } catch { /* ignore */ }
            return;
        }

        // Check cancellation / closed before doing expensive work
        if (cancellationToken?.isCancellationRequested || document.isClosed) {
            try {
                const { getOutputChannel } = require('../extension');
                getOutputChannel()?.appendLine(`ModelExplorer: cancelled/closed before parse for ${document.fileName}`);
            } catch { /* ignore */ }
            return;
        }

        this.isLoading = true;

        try {
            const { getOutputChannel } = require('../extension');
            getOutputChannel()?.appendLine(`ModelExplorer: Starting LSP model request for ${document.fileName}`);
        } catch { /* ignore */ }

        try {
            // ── LSP path ──────────────────────────────────────
            const result = await this._lspModelProvider.getModel(
                document.uri.toString(),
                ['elements', 'relationships'],
                cancellationToken,
            );

            if (cancellationToken?.isCancellationRequested || document.isClosed) {
                return;
            }

            // Capture stats for the status-bar metrics feature
            this._lastStats = result.stats;

            // Convert DTOs → SysMLElement so tree items work unchanged
            this.rootElements = (result.elements ?? []).map(dtoToSysMLElement);

            try {
                const { getOutputChannel } = require('../extension');
                getOutputChannel()?.appendLine(`ModelExplorer: LSP returned ${result.elements?.length ?? 0} elements`);
            } catch { /* ignore */ }

            try {
                const { getOutputChannel } = require('../extension');
                getOutputChannel()?.appendLine(`ModelExplorer: Converted to ${this.rootElements.length} tree root elements, firing change event`);
            } catch { /* ignore */ }

            this._onDidChangeTreeData.fire();
        } finally {
            this.isLoading = false;

            // If a new document was queued while we were loading, process it now
            if (this.pendingDocument) {
                const pending = this.pendingDocument;
                this.pendingDocument = undefined;
                this.loadDocument(pending);
            }
        }
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (!this.currentDocument) {
            return Promise.resolve([]);
        }

        if (!element) {
            return Promise.resolve(this.rootElements.map(e => new ModelTreeItem(e, this.currentDocument as vscode.TextDocument)));
        } else {
            const children: vscode.TreeItem[] = [];

            // Only SysML elements can have children (use property-based check instead of instanceof)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const anyElement = element as any;

            if (anyElement.itemType === 'sysml-element' && anyElement.element) {
                const sysmlElement = anyElement.element as SysMLElement;

                // Check if this is a part/item with a type reference that needs lazy resolution
                const partType = sysmlElement.attributes.get('partType') as string;
                if ((sysmlElement.type === 'part' || sysmlElement.type === 'item') && partType && sysmlElement.children.length === 0) {
                    const resolvedChildren = this.resolveTypeReference(sysmlElement, partType);
                    children.push(...resolvedChildren);
                } else {
                    // Add SysML child elements (normal case)
                    children.push(...sysmlElement.children.map((e: SysMLElement) => new ModelTreeItem(e, this.currentDocument as vscode.TextDocument)));
                }

                // Add attributes as property nodes (but filter out partType to reduce clutter)
                const attributesToShow = Array.from(sysmlElement.attributes.entries()).filter(([key]) => key !== 'partType');
                if (attributesToShow.length > 0) {
                    children.push(...attributesToShow.map(([key, value]) =>
                        new PropertyTreeItem(key, value, sysmlElement, this.currentDocument as vscode.TextDocument)
                    ));
                }

                // Add relationships as relationship nodes
                if (sysmlElement.relationships.length > 0) {
                    children.push(...sysmlElement.relationships.map((rel: Relationship) =>
                        new RelationshipTreeItem(rel, sysmlElement, this.currentDocument as vscode.TextDocument)
                    ));
                }
            }

            return Promise.resolve(children);
        }
    }

    /**
     * Lazily resolve type reference for a part/item
     */
    private resolveTypeReference(element: SysMLElement, partType: string): vscode.TreeItem[] {
        // Find the type definition in the parsed elements
        const typeDefinition = this.findTypeDefinition(partType, this.rootElements);

        if (!typeDefinition) {
            return [];
        }

        const children: vscode.TreeItem[] = [];

        // Add child elements from type definition
        children.push(...typeDefinition.children.map((e: SysMLElement) => new ModelTreeItem(e, this.currentDocument as vscode.TextDocument)));

        // Add attributes from type definition as property nodes
        const attributesToShow = Array.from(typeDefinition.attributes.entries()).filter(([key]) => key !== 'partType' && key !== 'modifier');
        children.push(...attributesToShow.map(([key, value]) =>
            new PropertyTreeItem(key, value, typeDefinition, this.currentDocument as vscode.TextDocument)
        ));

        // Add relationships from type definition
        children.push(...typeDefinition.relationships.map((rel: Relationship) =>
            new RelationshipTreeItem(rel, typeDefinition, this.currentDocument as vscode.TextDocument)
        ));

        return children;
    }

    /**
     * Find a type definition by name in the element tree
     */
    private findTypeDefinition(typeName: string, elements: SysMLElement[]): SysMLElement | null {
        for (const element of elements) {
            if ((element.type === 'part def' || element.type === 'item def') && element.name === typeName) {
                return element;
            }

            // Recursively search in children
            const found = this.findTypeDefinition(typeName, element.children);
            if (found) {
                return found;
            }
        }

        return null;
    }
}

export class ModelTreeItem extends vscode.TreeItem {
    public readonly itemType = 'sysml-element';

    constructor(
        public readonly element: SysMLElement,
        private document: vscode.TextDocument
    ) {
        super(
            element.name,
            // Make expandable if has children/attributes OR if it's a part/item with a type reference
            element.children.length > 0 || element.attributes.size > 0 || element.relationships.length > 0 ||
            ((element.type === 'part' || element.type === 'item') && element.attributes.has('partType'))
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None
        );

        // Debug: trace unnamed elements
        if (element.name === 'unnamed' && element.type === 'connection') {
            // eslint-disable-next-line no-console
            console.log(`[TreeView] Connection at line ${element.range?.start?.line} showing as unnamed`);
        }

        // Enhanced tooltip with more information
        const partType = element.attributes.get('partType') as string;
        const tooltipSuffix = partType ? ` : ${partType}` : (element.children.length > 0 ? ` (${element.children.length} children)` : '');
        this.tooltip = `${element.type}: ${element.name}${tooltipSuffix}`;

        // Use shorter descriptions to prevent overlap and add type info for parts
        const typePrefix = this.getTypePrefix(element.type);
        this.description = partType ? `${typePrefix}: ${partType}` : `${typePrefix}${element.type}`;

        this.iconPath = this.getIconForType(element.type);

        this.command = {
            command: 'sysml.jumpToDefinition',
            title: 'Jump to Definition',
            arguments: [document.uri, element.range]
        };

        if (element.relationships.length > 0) {
            this.contextValue = 'elementWithRelationships';
        }
    }

    private getTypePrefix(type: string): string {
        const prefixMap: { [key: string]: string } = {
            'package': '📦 ',
            'part': '🧩 ',
            'port': '🔌 ',
            'action': '⚡ ',
            'state': '🔄 ',
            'requirement': '✅ ',
            'use case': '👤 ',
            'constraint': '🔒 ',
            'attribute': '🏷️ ',
            'reference': '🔗 ',
            'connection': '🔀 ',
            'interface': '🔌 ',
            'flow def': '🔀 ',
            'flowProperty': '🔀 ',
            'item': '📋 ',
            'enum': '📚 ',
            'datatype': '🔢 ',
            'view': '👁️ ',
            'comment': '💬 ',
            'doc': '📖 '
        };
        return prefixMap[type] || '◦ ';
    }

    private getIconForType(type: string): vscode.ThemeIcon {
        const iconMap: { [key: string]: string } = {
            'package': 'package',
            'part': 'symbol-class',
            'port': 'symbol-interface',
            'action': 'symbol-method',
            'state': 'symbol-enum',
            'requirement': 'checklist',
            'use case': 'person',
            'constraint': 'lock',
            'attribute': 'symbol-property',
            'reference': 'references',
            'connection': 'link',
            'interface': 'symbol-interface',
            'flow def': 'link',
            'flowProperty': 'arrow-both',
            'item': 'symbol-struct',
            'enum': 'symbol-enum',
            'datatype': 'symbol-field',
            'view': 'eye',
            'comment': 'comment',
            'doc': 'book'
        };

        return new vscode.ThemeIcon(iconMap[type] || 'symbol-misc');
    }
}

export class PropertyTreeItem extends vscode.TreeItem {
    public readonly itemType = 'property';

    constructor(
        public readonly key: string,
        public readonly value: string | number | boolean,
        public readonly parentElement: SysMLElement,
        private document: vscode.TextDocument
    ) {
        super(
            `${key}: ${value}`,
            vscode.TreeItemCollapsibleState.None
        );

        this.tooltip = `Property: ${key} = ${value}`;
        this.description = `${typeof value}`;
        this.iconPath = new vscode.ThemeIcon('symbol-property');
        this.contextValue = 'property';

        // Make properties clickable to jump to parent element
        this.command = {
            command: 'sysml.jumpToDefinition',
            title: 'Jump to Parent Definition',
            arguments: [document.uri, parentElement.range]
        };
    }
}

export class RelationshipTreeItem extends vscode.TreeItem {
    public readonly itemType = 'relationship';

    constructor(
        public readonly relationship: Relationship,
        public readonly parentElement: SysMLElement,
        private document: vscode.TextDocument
    ) {
        super(
            `${relationship.type}: ${relationship.target}`,
            vscode.TreeItemCollapsibleState.None
        );

        this.tooltip = `${relationship.type} relationship from ${relationship.source} to ${relationship.target}`;
        this.description = relationship.type;
        this.iconPath = this.getRelationshipIcon(relationship.type);
        this.contextValue = 'relationship';

        // Make relationships clickable to jump to parent element
        this.command = {
            command: 'sysml.jumpToDefinition',
            title: 'Jump to Parent Definition',
            arguments: [document.uri, parentElement.range]
        };
    }

    private getRelationshipIcon(type: string): vscode.ThemeIcon {
        const iconMap: { [key: string]: string } = {
            'specializes': 'arrow-up',
            'features': 'symbol-property',
            'redefinition': 'replace',
            'subsetting': 'symbol-namespace',
            'typing': 'symbol-class',
            'conjugation': 'symbol-interface',
            'disjoining': 'circle-slash',
            'differencing': 'diff',
            'intersecting': 'symbol-operator',
            'unioning': 'symbol-operator',
            'allocation': 'arrow-both',
            'dependency': 'arrow-right',
            'succession': 'arrow-right',
            'connection': 'link'
        };

        return new vscode.ThemeIcon(iconMap[type] || 'arrow-right');
    }
}
