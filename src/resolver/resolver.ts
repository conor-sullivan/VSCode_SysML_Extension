/**
 * Semantic resolver that validates and enriches parsed elements against standard library
 */

import * as vscode from 'vscode';
import { LibraryService } from '../library/service';
import { DiagnosticFactory } from './diagnostics';
import {
    DiagnosticSeverity,
    EnrichedElement,
    ResolutionResult,
    ResolvedFeature,
    ResolvedType,
    SemanticDiagnostic,
    ValidatedConnection
} from './types';

/**
 * Main semantic resolver class
 */
export class SemanticResolver {
    private libraryService: LibraryService;

    constructor(libraryService: LibraryService) {
        this.libraryService = libraryService;
    }

    /**
     * Resolve and validate parsed elements.
     * @param elements  Parsed AST elements
     * @param uri       Document URI
     * @param documentText  Optional full document text — enables import / enum-keyword checks
     */
    public async resolve(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        elements: any[],
        uri: vscode.Uri,
        documentText?: string
    ): Promise<ResolutionResult> {
        const enrichedElements: EnrichedElement[] = [];
        const allDiagnostics: SemanticDiagnostic[] = [];

        for (const element of elements) {
            // Debug: log elements with doc attribute
            if (element.attributes) {
                const hasDoc = element.attributes instanceof Map
                    ? element.attributes.has('doc')
                    : element.attributes.doc !== undefined;
                if (hasDoc) {
                    // Doc attribute found - no logging needed
                }
            }
            const enriched = await this.enrichElement(element, uri);
            enrichedElements.push(enriched);
            allDiagnostics.push(...enriched.diagnostics);

            // Recursively process children
            if (element.children && element.children.length > 0) {
                const childResult = await this.resolve(element.children, uri, documentText);
                enriched.children = childResult.elements;
                allDiagnostics.push(...childResult.diagnostics);
            }
        }

        // ── Additional validation passes (require document text) ──
        if (documentText) {
            // Check for enum literals missing the 'enum' keyword prefix
            const enumDiags = this.validateEnumLiterals(elements, documentText);
            allDiagnostics.push(...enumDiags);

            // Check for standard library types used without an import statement
            const importDiags = this.validateStandardImports(elements, documentText);
            allDiagnostics.push(...importDiags);
        }

        const stats = this.calculateStats(enrichedElements, allDiagnostics);

        return {
            elements: enrichedElements,
            diagnostics: allDiagnostics,
            stats
        };
    }

    /**
     * Enrich a single element with semantic information
     */
    private async enrichElement(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        element: any,
        _uri: vscode.Uri
    ): Promise<EnrichedElement> {
        // Debug: trace unnamed connections
        if (element.name === 'unnamed' && element.type === 'connection') {
            // eslint-disable-next-line no-console
            console.log(`[resolver] Connection at line ${element.range?.start?.line} is unnamed in input`);
        }

        const diagnostics: SemanticDiagnostic[] = [];
        let resolvedType: ResolvedType | null = null;

        // Extract typing from attributes (e.g., "part vehicle : Vehicle" has typing="Vehicle")
        const typing = this.getTyping(element);

        // Only attempt type resolution if element has explicit typing
        if (typing) {
            try {
                resolvedType = await this.resolveType(typing, element.name);

                // Validate specialization if specified
                const specializes = this.getSpecializes(element);
                if (specializes && specializes.length > 0 && resolvedType) {
                    const specializationErrors = await this.validateSpecialization(
                        element.name,
                        typing,
                        specializes,
                        this.createRange(element)
                    );
                    diagnostics.push(...specializationErrors);
                }

                // Validate ports if applicable
                if (element.ports && resolvedType) {
                    const portErrors = await this.validatePorts(
                        element.name,
                        element.ports,
                        resolvedType
                    );
                    diagnostics.push(...portErrors);
                }
            } catch {
                // Type resolution failed - this is expected for user-defined types
                // Only report as error if it looks like a standard library type
                if (this.looksLikeStandardType(typing)) {
                    diagnostics.push(
                        DiagnosticFactory.unresolvedType(
                            element.name,
                            typing,
                            this.createRange(element)
                        )
                    );
                }
            }
        }

        // Convert attributes to Map - handle both Map and Object input
        const attributes = new Map<string, string | number | boolean>();
        if (element.attributes) {
            if (element.attributes instanceof Map) {
                // If it's already a Map, iterate over it directly
                for (const [key, value] of element.attributes) {
                    attributes.set(key, value as string | number | boolean);
                }
            } else {
                // If it's an Object, use Object.entries
                for (const [key, value] of Object.entries(element.attributes)) {
                    attributes.set(key, value as string | number | boolean);
                }
            }
        }

        // Debug: verify doc attribute was copied
        // (logging disabled for performance)

        return {
            name: element.name,
            type: element.type || 'unknown',
            range: this.createRange(element),
            resolvedType,
            children: [],
            relationships: element.relationships || [],
            diagnostics,
            attributes
        };
    }

    /**
     * Resolve type information from library
     */
    private async resolveType(
        typeName: string,
        _elementName: string
    ): Promise<ResolvedType> {
        // Try exact match first
        let symbol = this.libraryService.getSymbol(typeName);

        // Try searching by simple name if qualified lookup fails
        if (!symbol) {
            const candidates = this.libraryService.getSymbolsByName(typeName);
            if (candidates.length > 0) {
                symbol = candidates[0]; // Use first match
            }
        }

        if (!symbol) {
            throw new Error(`Type '${typeName}' not found in library`);
        }

        // Get specialization chain
        const specializationChain = this.libraryService.getSpecializationChain(symbol.qualifiedName);

        // Extract features
        const features: ResolvedFeature[] = symbol.features.map(f => ({
            name: f.name,
            kind: f.kind,
            type: f.type,
            multiplicity: f.multiplicity,
            direction: f.direction as 'in' | 'out' | 'inout' | undefined,
            visibility: 'public',
            isDerived: false,
            isReadonly: false
        }));

        return {
            qualifiedName: symbol.qualifiedName,
            simpleName: symbol.name,
            kind: symbol.kind,
            isLibraryType: true,
            specializationChain,
            specializes: symbol.specializes,
            features
        };
    }

    /**
     * Validate that specialization relationships are semantically valid
     */
    private async validateSpecialization(
        elementName: string,
        childType: string,
        parentTypes: string[],
        range: vscode.Range
    ): Promise<SemanticDiagnostic[]> {
        const diagnostics: SemanticDiagnostic[] = [];

        for (const parentType of parentTypes) {
            const isValid = this.libraryService.isSpecializationOf(childType, parentType);

            if (!isValid) {
                diagnostics.push(
                    DiagnosticFactory.invalidSpecialization(
                        elementName,
                        childType,
                        parentType,
                        range
                    )
                );
            }
        }

        return diagnostics;
    }

    /**
     * Validate port definitions
     */
    private async validatePorts(
        elementName: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ports: any[],
        _resolvedType: ResolvedType
    ): Promise<SemanticDiagnostic[]> {
        const diagnostics: SemanticDiagnostic[] = [];

        for (const port of ports) {
            // Check if port direction is valid
            if (port.direction && !['in', 'out', 'inout'].includes(port.direction)) {
                diagnostics.push(
                    DiagnosticFactory.invalidPort(
                        elementName,
                        port.name,
                        `Invalid direction '${port.direction}'`,
                        this.createRange(port)
                    )
                );
            }

            // Check if port type exists
            if (port.type) {
                try {
                    await this.resolveType(port.type, port.name);
                } catch {
                    diagnostics.push(
                        DiagnosticFactory.unresolvedType(
                            port.name,
                            port.type,
                            this.createRange(port)
                        )
                    );
                }
            }
        }

        return diagnostics;
    }

    /**
     * Validate connection between elements
     */
    public async validateConnection(
        source: string,
        target: string,
        connectionType: string
    ): Promise<ValidatedConnection> {
        const errors: SemanticDiagnostic[] = [];

        // Get source and target types from library
        const sourceSymbols = this.libraryService.getSymbolsByName(source);
        const targetSymbols = this.libraryService.getSymbolsByName(target);

        if (sourceSymbols.length === 0) {
            errors.push(
                DiagnosticFactory.unresolvedType(
                    source,
                    source,
                    new vscode.Range(0, 0, 0, 0)
                )
            );
        }

        if (targetSymbols.length === 0) {
            errors.push(
                DiagnosticFactory.unresolvedType(
                    target,
                    target,
                    new vscode.Range(0, 0, 0, 0)
                )
            );
        }

        // Basic validation: both must exist
        const isValid = errors.length === 0;

        return {
            source,
            target,
            type: connectionType,
            isValid,
            errors
        };
    }

    /**
     * Validate cardinality constraints
     */
    private validateCardinality(
        elementName: string,
        featureName: string,
        multiplicity: string,
        actualCount: number,
        range: vscode.Range
    ): SemanticDiagnostic | null {
        // Parse multiplicity (e.g., "1", "0..1", "1..*", "*")
        const parts = multiplicity.split('..');

        if (parts.length === 1) {
            // Exact count
            const expected = parts[0] === '*' ? Infinity : parseInt(parts[0]);
            if (actualCount !== expected) {
                return DiagnosticFactory.cardinalityViolation(
                    elementName,
                    featureName,
                    multiplicity,
                    actualCount,
                    range
                );
            }
        } else if (parts.length === 2) {
            // Range
            const min = parseInt(parts[0]);
            const max = parts[1] === '*' ? Infinity : parseInt(parts[1]);

            if (actualCount < min || actualCount > max) {
                return DiagnosticFactory.cardinalityViolation(
                    elementName,
                    featureName,
                    multiplicity,
                    actualCount,
                    range
                );
            }
        }

        return null;
    }

    /**
     * Calculate resolution statistics
     */
    private calculateStats(
        elements: EnrichedElement[],
        diagnostics: SemanticDiagnostic[]
    ): ResolutionResult['stats'] {
        let totalElements = 0;
        let resolvedElements = 0;
        let unresolvedElements = 0;

        const countElements = (elements: EnrichedElement[]) => {
            for (const element of elements) {
                totalElements++;
                if (element.resolvedType) {
                    resolvedElements++;
                } else {
                    unresolvedElements++;
                }
                countElements(element.children);
            }
        };

        countElements(elements);

        const errorCount = diagnostics.filter(d => d.severity === DiagnosticSeverity.Error).length;
        const warningCount = diagnostics.filter(d => d.severity === DiagnosticSeverity.Warning).length;

        return {
            totalElements,
            resolvedElements,
            unresolvedElements,
            errorCount,
            warningCount
        };
    }

    /**
     * Create a range from element position data
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private createRange(element: any): vscode.Range {
        // First, check if the element already has a proper range object from the parser
        if (element.range && element.range instanceof vscode.Range) {
            return element.range;
        }
        // Check for range-like object with start/end positions
        if (element.range && element.range.start && element.range.end) {
            return new vscode.Range(
                element.range.start.line,
                element.range.start.character,
                element.range.end.line,
                element.range.end.character
            );
        }
        // Fallback to line/column if available (legacy support)
        if (element.line !== undefined && element.column !== undefined) {
            return new vscode.Range(
                element.line,
                element.column,
                element.line,
                element.column + (element.name?.length || 0)
            );
        }
        return new vscode.Range(0, 0, 0, 0);
    }

    /**
     * Extract typing information from element attributes
     * (e.g., "part vehicle : Vehicle" has typing="Vehicle")
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getTyping(element: any): string | null {
        if (!element.attributes) {
            return null;
        }

        // Check if attributes is a Map or plain object
        if (element.attributes instanceof Map) {
            return element.attributes.get('typing') as string || null;
        } else if (typeof element.attributes === 'object') {
            return element.attributes.typing || null;
        }

        return null;
    }

    /**
     * Extract specialization list from element attributes
     * (e.g., "part vehicle :> BaseVehicle" has specializes=["BaseVehicle"])
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getSpecializes(element: any): string[] | null {
        if (!element.attributes) {
            return null;
        }

        let specializesStr: string | null = null;

        if (element.attributes instanceof Map) {
            specializesStr = element.attributes.get('specializes') as string || null;
        } else if (typeof element.attributes === 'object') {
            specializesStr = element.attributes.specializes || null;
        }

        if (specializesStr) {
            // Parse comma-separated list
            return specializesStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }

        return null;
    }

    /**
     * Check if a type name looks like it should be in the standard library
     * Standard types typically start with uppercase or contain :: namespace separator
     */
    private looksLikeStandardType(typeName: string): boolean {
        if (!typeName) {
            return false;
        }

        // Check for known standard library patterns
        const standardPrefixes = [
            'Base::',
            'ISQ::',
            'SI::',
            'Metadata::',
            'ScalarValues::',
            'Collections::',
            'Occurrences::'
        ];

        // Check if it starts with a standard library prefix
        if (standardPrefixes.some(prefix => typeName.startsWith(prefix))) {
            return true;
        }

        // Check for common standard library types
        const commonTypes = [
            'Anything', 'Performance', 'Feature', 'Type', 'Class',
            'DataType', 'Structure', 'Association', 'Connector',
            'PortDefinition', 'PortUsage', 'ProxyPort',
            'Boolean', 'String', 'Integer', 'Real', 'Number'
        ];

        return commonTypes.includes(typeName);
    }

    // ── Enum-literal validation ────────────────────────────────────
    /**
     * Walk all `enumeration def` elements and verify that each child
     * (enumeration literal) is prefixed with the `enum` keyword in the
     * source text.  The ANTLR grammar accepts `ENUM?` (optional), but the
     * SysML v2 spec requires it, and some downstream parsers (incl. the
     * visualizer) may reject the bare form.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private validateEnumLiterals(elements: any[], documentText: string): SemanticDiagnostic[] {
        const diagnostics: SemanticDiagnostic[] = [];
        const lines = documentText.split('\n');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const walk = (elems: any[]) => {
            for (const el of elems) {
                if (el.type === 'enumeration def' && el.children) {
                    for (const child of el.children) {
                        // Children of an enum def are enumeration literals
                        if (child.type === 'enumeration' || child.type === 'entry' || child.type === 'attribute' || child.name) {
                            const line = child.range?.start?.line;
                            if (line !== undefined && line < lines.length) {
                                const srcLine = lines[line].trim();
                                // Check whether the source line starts with 'enum '
                                if (!srcLine.startsWith('enum ') && !srcLine.startsWith('enum\t')) {
                                    diagnostics.push(
                                        DiagnosticFactory.missingEnumKeyword(
                                            child.name || 'unnamed',
                                            el.name,
                                            this.createRange(child)
                                        )
                                    );
                                }
                            }
                        }
                    }
                }
                if (el.children) {
                    walk(el.children);
                }
            }
        };

        walk(elements);
        return diagnostics;
    }

    // ── Standard-library import validation ─────────────────────────
    /** Map of unqualified type names to the import that provides them. */
    private static readonly IMPORT_SUGGESTIONS: Record<string, string> = {
        'String':   'ScalarValues::*',
        'Integer':  'ScalarValues::*',
        'Boolean':  'ScalarValues::*',
        'Real':     'ScalarValues::*',
        'Natural':  'ScalarValues::*',
        'Number':   'NumericalValues::*',
        'Complex':  'ScalarValues::*',
    };

    /**
     * Scan the document for use of well-known standard library types and
     * verify that the corresponding import is present.  Emits a warning
     * when, e.g., `String` is referenced but `ScalarValues::*` is not
     * imported.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private validateStandardImports(elements: any[], documentText: string): SemanticDiagnostic[] {
        const diagnostics: SemanticDiagnostic[] = [];

        // Collect all import statements from the source text
        const importRegex = /import\s+(\S+)\s*;/g;
        const imports = new Set<string>();
        let m;
        while ((m = importRegex.exec(documentText)) !== null) {
            imports.add(m[1]);
        }
        // Also handle `private import ...;`
        const privateImportRegex = /private\s+import\s+(\S+)\s*;/g;
        while ((m = privateImportRegex.exec(documentText)) !== null) {
            imports.add(m[1]);
        }

        // Collect type names that appear as attribute types or element typings
        const usedTypes = new Set<string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const collectTypes = (elems: any[]) => {
            for (const el of elems) {
                const typing = this.getTyping(el);
                if (typing) {
                    usedTypes.add(typing);
                }
                // Also check dataType attribute (used by attribute elements)
                const dataType = el.attributes instanceof Map
                    ? el.attributes.get('dataType') as string
                    : el.attributes?.dataType;
                if (dataType) {
                    usedTypes.add(dataType);
                }
                if (el.children) {
                    collectTypes(el.children);
                }
            }
        };
        collectTypes(elements);

        // For each used type, check if it needs an import
        const alreadyWarned = new Set<string>();
        for (const typeName of usedTypes) {
            const suggestedImport = SemanticResolver.IMPORT_SUGGESTIONS[typeName];
            if (!suggestedImport) {
                continue; // Not a known standard library type
            }
            if (imports.has(suggestedImport)) {
                continue; // Already imported
            }
            // Check if the fully-qualified form is used (e.g. ScalarValues::String)
            if (imports.has(`ScalarValues::${typeName}`)) {
                continue;
            }
            // Avoid duplicate warnings for the same import suggestion
            if (alreadyWarned.has(suggestedImport)) {
                continue;
            }
            alreadyWarned.add(suggestedImport);

            diagnostics.push(
                DiagnosticFactory.missingImport(
                    typeName,
                    suggestedImport,
                    new vscode.Range(0, 0, 0, 0) // Top-of-file range for import suggestion
                )
            );
        }

        return diagnostics;
    }
}
