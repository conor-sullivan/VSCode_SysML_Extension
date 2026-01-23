/**
 * SysML v2 Completion Provider
 *
 * Provides IntelliSense/autocomplete for:
 * - SysML v2 keywords
 * - Element references after `.` or `::`
 * - Standard library types
 * - Local elements from the current document
 */

import * as vscode from 'vscode';
import { LibraryService } from '../library';
import { SysMLElement, SysMLParser } from '../parser/sysmlParser';

// SysML v2 keywords organized by category
const SYSML_KEYWORDS = {
    definitions: [
        { keyword: 'part def', detail: 'Part definition', documentation: 'Defines a type of part that can be instantiated' },
        { keyword: 'action def', detail: 'Action definition', documentation: 'Defines a type of action/behavior' },
        { keyword: 'state def', detail: 'State definition', documentation: 'Defines a state machine' },
        { keyword: 'requirement def', detail: 'Requirement definition', documentation: 'Defines a type of requirement' },
        { keyword: 'constraint def', detail: 'Constraint definition', documentation: 'Defines a reusable constraint' },
        { keyword: 'attribute def', detail: 'Attribute definition', documentation: 'Defines a type of attribute/value' },
        { keyword: 'item def', detail: 'Item definition', documentation: 'Defines a type of item that can flow' },
        { keyword: 'port def', detail: 'Port definition', documentation: 'Defines a type of port for connections' },
        { keyword: 'interface def', detail: 'Interface definition', documentation: 'Defines an interface contract' },
        { keyword: 'connection def', detail: 'Connection definition', documentation: 'Defines a type of connection' },
        { keyword: 'allocation def', detail: 'Allocation definition', documentation: 'Defines a type of allocation' },
        { keyword: 'use case def', detail: 'Use case definition', documentation: 'Defines a use case' },
        { keyword: 'view def', detail: 'View definition', documentation: 'Defines a view of the model' },
        { keyword: 'viewpoint def', detail: 'Viewpoint definition', documentation: 'Defines a viewpoint for stakeholders' },
        { keyword: 'rendering def', detail: 'Rendering definition', documentation: 'Defines how to render a view' },
        { keyword: 'metadata def', detail: 'Metadata definition', documentation: 'Defines custom metadata/stereotypes' },
        { keyword: 'enum def', detail: 'Enumeration definition', documentation: 'Defines an enumeration type' },
        { keyword: 'calc def', detail: 'Calculation definition', documentation: 'Defines a calculation/function' },
        { keyword: 'analysis case def', detail: 'Analysis case definition', documentation: 'Defines an analysis case' },
        { keyword: 'verification case def', detail: 'Verification case definition', documentation: 'Defines a verification case' },
    ],
    usages: [
        { keyword: 'part', detail: 'Part usage', documentation: 'Creates a part instance' },
        { keyword: 'action', detail: 'Action usage', documentation: 'Creates an action/behavior instance' },
        { keyword: 'state', detail: 'State usage', documentation: 'Creates a state instance' },
        { keyword: 'requirement', detail: 'Requirement usage', documentation: 'Creates a requirement instance' },
        { keyword: 'constraint', detail: 'Constraint usage', documentation: 'Creates a constraint instance' },
        { keyword: 'attribute', detail: 'Attribute usage', documentation: 'Creates an attribute/value' },
        { keyword: 'item', detail: 'Item usage', documentation: 'Creates an item instance' },
        { keyword: 'port', detail: 'Port usage', documentation: 'Creates a port' },
        { keyword: 'interface', detail: 'Interface usage', documentation: 'Creates an interface' },
        { keyword: 'connection', detail: 'Connection usage', documentation: 'Creates a connection between parts' },
        { keyword: 'allocation', detail: 'Allocation usage', documentation: 'Creates an allocation relationship' },
        { keyword: 'use case', detail: 'Use case usage', documentation: 'Creates a use case instance' },
        { keyword: 'view', detail: 'View usage', documentation: 'Creates a view instance' },
        { keyword: 'ref', detail: 'Reference usage', documentation: 'Creates a reference to another element' },
    ],
    relationships: [
        { keyword: 'connect', detail: 'Connection', documentation: 'Connects two endpoints' },
        { keyword: 'bind', detail: 'Binding', documentation: 'Binds two features together' },
        { keyword: 'flow', detail: 'Flow connection', documentation: 'Defines item flow between parts' },
        { keyword: 'allocate', detail: 'Allocation', documentation: 'Allocates one element to another' },
        { keyword: 'satisfy', detail: 'Satisfaction', documentation: 'Indicates requirement satisfaction' },
        { keyword: 'verify', detail: 'Verification', documentation: 'Indicates requirement verification' },
        { keyword: 'dependency', detail: 'Dependency', documentation: 'Creates a dependency relationship' },
    ],
    modifiers: [
        { keyword: 'abstract', detail: 'Abstract modifier', documentation: 'Makes element abstract (cannot be instantiated directly)' },
        { keyword: 'readonly', detail: 'Readonly modifier', documentation: 'Makes attribute readonly' },
        { keyword: 'derived', detail: 'Derived modifier', documentation: 'Indicates value is derived/calculated' },
        { keyword: 'private', detail: 'Private visibility', documentation: 'Element is only visible within its namespace' },
        { keyword: 'protected', detail: 'Protected visibility', documentation: 'Element is visible to specializations' },
        { keyword: 'public', detail: 'Public visibility', documentation: 'Element is visible everywhere (default)' },
        { keyword: 'in', detail: 'Input direction', documentation: 'Port/parameter receives input' },
        { keyword: 'out', detail: 'Output direction', documentation: 'Port/parameter provides output' },
        { keyword: 'inout', detail: 'Bidirectional', documentation: 'Port/parameter is bidirectional' },
    ],
    structure: [
        { keyword: 'package', detail: 'Package', documentation: 'Creates a namespace container' },
        { keyword: 'import', detail: 'Import', documentation: 'Imports elements from another namespace' },
        { keyword: 'alias', detail: 'Alias', documentation: 'Creates an alias for an element' },
        { keyword: 'comment', detail: 'Comment', documentation: 'Creates a comment element' },
        { keyword: 'doc', detail: 'Documentation', documentation: 'Creates documentation' },
    ],
    behavior: [
        { keyword: 'first', detail: 'First (succession)', documentation: 'Defines the first action in a sequence' },
        { keyword: 'then', detail: 'Then (succession)', documentation: 'Defines succession between actions' },
        { keyword: 'fork', detail: 'Fork node', documentation: 'Splits control flow into parallel paths' },
        { keyword: 'join', detail: 'Join node', documentation: 'Joins parallel paths back together' },
        { keyword: 'decision', detail: 'Decision node', documentation: 'Conditional branching point' },
        { keyword: 'merge', detail: 'Merge node', documentation: 'Merges alternative paths' },
        { keyword: 'entry', detail: 'Entry action', documentation: 'Action performed on state entry' },
        { keyword: 'exit', detail: 'Exit action', documentation: 'Action performed on state exit' },
        { keyword: 'do', detail: 'Do action', documentation: 'Action performed while in state' },
        { keyword: 'transition', detail: 'Transition', documentation: 'Transition between states' },
        { keyword: 'accept', detail: 'Accept action', documentation: 'Accepts a signal/event' },
        { keyword: 'send', detail: 'Send action', documentation: 'Sends a signal/event' },
        { keyword: 'perform', detail: 'Perform action', documentation: 'Performs an action' },
        { keyword: 'exhibit', detail: 'Exhibit state', documentation: 'Exhibits state behavior' },
    ],
    requirements: [
        { keyword: 'subject', detail: 'Requirement subject', documentation: 'The subject of a requirement' },
        { keyword: 'actor', detail: 'Actor', documentation: 'An actor in a use case' },
        { keyword: 'stakeholder', detail: 'Stakeholder', documentation: 'A stakeholder with concerns' },
        { keyword: 'concern', detail: 'Concern', documentation: 'A stakeholder concern' },
        { keyword: 'objective', detail: 'Objective', documentation: 'An objective for a use case' },
        { keyword: 'require', detail: 'Require constraint', documentation: 'Required constraint/condition' },
        { keyword: 'assume', detail: 'Assume constraint', documentation: 'Assumed constraint/condition' },
    ],
    types: [
        { keyword: 'Boolean', detail: 'Boolean type', documentation: 'true or false value' },
        { keyword: 'String', detail: 'String type', documentation: 'Text value' },
        { keyword: 'Integer', detail: 'Integer type', documentation: 'Whole number value' },
        { keyword: 'Real', detail: 'Real type', documentation: 'Decimal number value' },
        { keyword: 'Natural', detail: 'Natural type', documentation: 'Non-negative integer' },
    ],
    values: [
        { keyword: 'true', detail: 'Boolean true', documentation: 'Boolean true value' },
        { keyword: 'false', detail: 'Boolean false', documentation: 'Boolean false value' },
        { keyword: 'null', detail: 'Null value', documentation: 'Null/empty value' },
    ],
};

export class SysMLCompletionProvider implements vscode.CompletionItemProvider {
    private parser: SysMLParser;
    private libraryService: LibraryService | null = null;

    constructor(parser: SysMLParser) {
        this.parser = parser;
        try {
            this.libraryService = LibraryService.getInstance();
        } catch {
            // Library service not yet initialized
        }
    }

    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const lineText = document.lineAt(position.line).text;
        const linePrefix = lineText.substring(0, position.character);

        // Check for member access (. or ::)
        const memberAccessMatch = linePrefix.match(/(\w+(?:\.\w+)*)(\.|\:\:)(\w*)$/);
        if (memberAccessMatch) {
            return this.provideMemberCompletions(document, memberAccessMatch[1], memberAccessMatch[2], memberAccessMatch[3]);
        }

        // Check for type specialization (:> or :>>)
        const specializationMatch = linePrefix.match(/:\>+\s*(\w*)$/);
        if (specializationMatch) {
            return this.provideTypeCompletions(document, specializationMatch[1]);
        }

        // Check for import statement
        const importMatch = linePrefix.match(/import\s+(\S*)$/);
        if (importMatch) {
            return this.provideImportCompletions(document, importMatch[1]);
        }

        // Check if we're after a type declaration (: Type)
        const typeMatch = linePrefix.match(/:\s*(\w*)$/);
        if (typeMatch && !linePrefix.match(/:\s*>/)) {
            return this.provideTypeCompletions(document, typeMatch[1]);
        }

        // Default: provide keyword and local element completions
        return this.provideKeywordAndElementCompletions(document, linePrefix, context);
    }

    private provideMemberCompletions(
        document: vscode.TextDocument,
        basePath: string,
        separator: string,
        prefix: string
    ): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];

        // Parse document to find the base element
        const elements = this.parser.parse(document);
        const baseElement = this.findElementByPath(elements, basePath);

        if (baseElement && baseElement.children) {
            for (const child of baseElement.children) {
                if (!prefix || child.name.toLowerCase().startsWith(prefix.toLowerCase())) {
                    const item = new vscode.CompletionItem(child.name, this.getCompletionKind(child.type));
                    item.detail = child.type;
                    item.documentation = new vscode.MarkdownString(`**${child.type}** \`${child.name}\``);
                    completions.push(item);
                }
            }
        }

        // Also check library for known types
        if (this.libraryService?.isInitialized()) {
            const symbols = this.libraryService.searchSymbols(basePath, 5);
            for (const symbol of symbols) {
                if (symbol.qualifiedName === basePath) {
                    // Add features from the library symbol
                    for (const feature of symbol.features) {
                        if (!prefix || feature.name.toLowerCase().startsWith(prefix.toLowerCase())) {
                            const item = new vscode.CompletionItem(feature.name, this.getFeatureCompletionKind(feature.kind));
                            item.detail = feature.type || feature.kind;
                            item.documentation = new vscode.MarkdownString(`**${feature.kind}** from \`${symbol.name}\``);
                            completions.push(item);
                        }
                    }
                }
            }
        }

        return completions;
    }

    private provideTypeCompletions(document: vscode.TextDocument, prefix: string): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        const lowerPrefix = prefix.toLowerCase();

        // Add local definitions from the document
        const elements = this.parser.parse(document);
        this.collectDefinitions(elements, completions, lowerPrefix);

        // Add standard library types
        if (this.libraryService?.isInitialized()) {
            const symbols = this.libraryService.searchSymbols(prefix || '', 30);
            for (const symbol of symbols) {
                if (symbol.kind.endsWith('def') || symbol.kind === 'package') {
                    const item = new vscode.CompletionItem(symbol.name, vscode.CompletionItemKind.Class);
                    item.detail = `${symbol.kind} (${symbol.packagePath})`;
                    item.documentation = new vscode.MarkdownString(
                        `**${symbol.kind}** \`${symbol.qualifiedName}\`\n\n${symbol.documentation || ''}`
                    );
                    item.insertText = symbol.name;
                    completions.push(item);
                }
            }
        }

        // Add built-in types
        for (const typeInfo of SYSML_KEYWORDS.types) {
            if (!lowerPrefix || typeInfo.keyword.toLowerCase().startsWith(lowerPrefix)) {
                const item = new vscode.CompletionItem(typeInfo.keyword, vscode.CompletionItemKind.TypeParameter);
                item.detail = typeInfo.detail;
                item.documentation = new vscode.MarkdownString(typeInfo.documentation);
                completions.push(item);
            }
        }

        return completions;
    }

    private provideImportCompletions(document: vscode.TextDocument, prefix: string): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];

        // Get local packages
        const elements = this.parser.parse(document);
        this.collectPackages(elements, completions, prefix, '');

        // Add standard library packages
        if (this.libraryService?.isInitialized()) {
            const packages = this.libraryService.getSymbolsByKind('package');
            for (const pkg of packages) {
                if (!prefix || pkg.qualifiedName.toLowerCase().startsWith(prefix.toLowerCase())) {
                    const item = new vscode.CompletionItem(pkg.qualifiedName, vscode.CompletionItemKind.Module);
                    item.detail = 'Standard library package';
                    item.documentation = new vscode.MarkdownString(pkg.documentation || `Package \`${pkg.qualifiedName}\``);
                    item.insertText = `${pkg.qualifiedName}::*`;
                    completions.push(item);
                }
            }
        }

        // Add common import patterns
        const commonImports = ['SI::*', 'ISQ::*', 'SysML::*', 'ScalarValues::*', 'Collections::*'];
        for (const imp of commonImports) {
            if (!prefix || imp.toLowerCase().startsWith(prefix.toLowerCase())) {
                const item = new vscode.CompletionItem(imp, vscode.CompletionItemKind.Module);
                item.detail = 'Common import';
                completions.push(item);
            }
        }

        return completions;
    }

    private provideKeywordAndElementCompletions(
        document: vscode.TextDocument,
        linePrefix: string,
        _context: vscode.CompletionContext
    ): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        const wordMatch = linePrefix.match(/(\w*)$/);
        const prefix = wordMatch ? wordMatch[1].toLowerCase() : '';

        // Add keyword completions
        for (const category of Object.values(SYSML_KEYWORDS)) {
            for (const keywordInfo of category) {
                if (!prefix || keywordInfo.keyword.toLowerCase().startsWith(prefix)) {
                    const item = new vscode.CompletionItem(keywordInfo.keyword, vscode.CompletionItemKind.Keyword);
                    item.detail = keywordInfo.detail;
                    item.documentation = new vscode.MarkdownString(keywordInfo.documentation);

                    // Add snippet for definitions
                    if (keywordInfo.keyword.endsWith(' def')) {
                        item.insertText = new vscode.SnippetString(`${keywordInfo.keyword} \${1:Name} {\n\t$0\n}`);
                        item.kind = vscode.CompletionItemKind.Snippet;
                    }

                    completions.push(item);
                }
            }
        }

        // Add local element completions (for referencing existing elements)
        const elements = this.parser.parse(document);
        this.collectAllElements(elements, completions, prefix);

        return completions;
    }

    private collectDefinitions(elements: SysMLElement[], completions: vscode.CompletionItem[], prefix: string): void {
        for (const element of elements) {
            const typeLower = element.type.toLowerCase();
            if (typeLower.includes('def')) {
                if (!prefix || element.name.toLowerCase().startsWith(prefix)) {
                    const item = new vscode.CompletionItem(element.name, vscode.CompletionItemKind.Class);
                    item.detail = element.type;
                    item.documentation = new vscode.MarkdownString(`**${element.type}** defined in current document`);
                    completions.push(item);
                }
            }
            if (element.children) {
                this.collectDefinitions(element.children, completions, prefix);
            }
        }
    }

    private collectPackages(elements: SysMLElement[], completions: vscode.CompletionItem[], prefix: string, parentPath: string): void {
        for (const element of elements) {
            if (element.type.toLowerCase() === 'package') {
                const fullPath = parentPath ? `${parentPath}::${element.name}` : element.name;
                if (!prefix || fullPath.toLowerCase().startsWith(prefix.toLowerCase())) {
                    const item = new vscode.CompletionItem(fullPath, vscode.CompletionItemKind.Module);
                    item.detail = 'Local package';
                    item.insertText = `${fullPath}::*`;
                    completions.push(item);
                }
                if (element.children) {
                    this.collectPackages(element.children, completions, prefix, fullPath);
                }
            }
        }
    }

    private collectAllElements(elements: SysMLElement[], completions: vscode.CompletionItem[], prefix: string): void {
        for (const element of elements) {
            if (element.name && element.name !== 'unnamed') {
                if (!prefix || element.name.toLowerCase().startsWith(prefix)) {
                    const item = new vscode.CompletionItem(element.name, this.getCompletionKind(element.type));
                    item.detail = element.type;
                    item.documentation = new vscode.MarkdownString(`**${element.type}** \`${element.name}\``);
                    completions.push(item);
                }
            }
            if (element.children) {
                this.collectAllElements(element.children, completions, prefix);
            }
        }
    }

    private findElementByPath(elements: SysMLElement[], path: string): SysMLElement | undefined {
        const parts = path.split(/\.|::/);
        let current: SysMLElement | undefined;
        let searchList = elements;

        for (const part of parts) {
            current = searchList.find(e => e.name === part);
            if (!current) {
                return undefined;
            }
            searchList = current.children || [];
        }

        return current;
    }

    private getCompletionKind(type: string): vscode.CompletionItemKind {
        const typeLower = type.toLowerCase();
        if (typeLower.includes('package')) return vscode.CompletionItemKind.Module;
        if (typeLower.includes('def')) return vscode.CompletionItemKind.Class;
        if (typeLower.includes('attribute')) return vscode.CompletionItemKind.Field;
        if (typeLower.includes('action')) return vscode.CompletionItemKind.Function;
        if (typeLower.includes('port')) return vscode.CompletionItemKind.Interface;
        if (typeLower.includes('state')) return vscode.CompletionItemKind.Enum;
        if (typeLower.includes('requirement')) return vscode.CompletionItemKind.Event;
        if (typeLower.includes('constraint')) return vscode.CompletionItemKind.Constant;
        if (typeLower.includes('part')) return vscode.CompletionItemKind.Struct;
        return vscode.CompletionItemKind.Variable;
    }

    private getFeatureCompletionKind(kind: string): vscode.CompletionItemKind {
        switch (kind) {
            case 'attribute': return vscode.CompletionItemKind.Field;
            case 'port': return vscode.CompletionItemKind.Interface;
            case 'reference': return vscode.CompletionItemKind.Reference;
            case 'action': return vscode.CompletionItemKind.Function;
            case 'state': return vscode.CompletionItemKind.Enum;
            default: return vscode.CompletionItemKind.Property;
        }
    }
}
