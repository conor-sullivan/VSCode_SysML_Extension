import * as vscode from 'vscode';
import { SysMLElement, SysMLParser } from '../parser/sysmlParser';
import { DiagnosticFormatter } from '../resolver/diagnostics';
import { getSysMLKeywordIndex, suggestSysMLKeywords } from './keywords';

export class SysMLValidator {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private semanticDiagnostics: DiagnosticFormatter;


    constructor(private _parser: SysMLParser) {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('sysml');
        this.semanticDiagnostics = new DiagnosticFormatter('sysml-semantic');
    }

    async validate(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
        const diagnostics: vscode.Diagnostic[] = [];

        try {
            // Phase 3: Use semantic resolution for enhanced validation
            const resolutionResult = await this._parser.parseWithSemanticResolution(document);

            // Publish semantic diagnostics (type errors, validation errors)
            this.semanticDiagnostics.publish(document.uri, resolutionResult.diagnostics);

            // Convert enriched elements back to SysML elements for legacy validation
            const elements = this._parser.convertEnrichedToSysMLElements(resolutionResult.elements);

            // Run basic validation checks
            this.validateElements(elements, diagnostics, document);
            this.validateRelationships(diagnostics, document);
            this.validateSyntax(document, diagnostics);
            this.validateKeywordTypos(document, diagnostics);

            this.diagnosticCollection.set(document.uri, diagnostics);
        } catch (error) {
            // Log error but don't crash the extension
            const message = `Error during SysML validation: ${error instanceof Error ? error.message : 'Unknown error'}`;
            try {
                const { getOutputChannel } = require('../extension');
                getOutputChannel()?.appendLine(message);
            } catch {
                // Silently fail if output channel not available
            }
            vscode.window.showErrorMessage(`SysML validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return diagnostics;
    }


    /**
     * Validates if a name is a valid SysML v2 identifier.
     *
     * Per SysML v2 spec, there are two types of valid names:
     * 1. Regular identifiers: start with letter or underscore, contain only letters/digits/underscores
     * 2. Unrestricted names: any non-empty string (originally wrapped in single quotes in source)
     *    - May not contain raw non-printable characters (backspace, tab, newline)
     *    - Single quotes and backslashes must be escaped in the source
     *    - After parsing, quotes are stripped, so we see the unescaped name
     *
     * Since the parser strips quotes, we can't definitively know if a name was quoted.
     * We use heuristics: if a name doesn't match regular identifier rules but is otherwise
     * valid (non-empty, no control characters), it was likely an unrestricted name.
     */
    private isValidSysMLName(name: string): { valid: boolean; reason?: string } {
        // Empty names are never valid
        if (!name || name.length === 0) {
            return { valid: false, reason: 'Name cannot be empty' };
        }

        // Check for regular identifier pattern
        const isValidRegularIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
        if (isValidRegularIdentifier) {
            return { valid: true };
        }

        // For unrestricted names (after quote stripping):
        // - Non-printable characters (except space) are not allowed directly
        // - The spec says: backspace (\b), tab (\t), newline (\n) not allowed without escaping
        // eslint-disable-next-line no-control-regex
        const hasControlCharacters = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(name);
        if (hasControlCharacters) {
            return { valid: false, reason: 'Name contains invalid control characters' };
        }

        // Tab and newline specifically mentioned as needing escapes
        // After parsing, these would appear as literal \t or \n if properly escaped
        // Raw tabs/newlines in the parsed name indicate improper source
        if (name.includes('\t') || name.includes('\n') || name.includes('\r')) {
            return { valid: false, reason: 'Name contains unescaped tab or newline characters' };
        }

        // If we get here, it's a valid unrestricted name
        // Examples: '15_External_Interfaces', 'On/Off Switch', 'Ångström', 'circuits in line'
        return { valid: true };
    }

    private validateElements(elements: SysMLElement[], diagnostics: vscode.Diagnostic[], _document: vscode.TextDocument): void {
        // In SysML v2, names only need to be unique within their owning namespace (parent element).
        // Different packages, parts, or definitions can have members with the same name.
        // Redefinitions (redefines keyword) also allow "duplicate" names intentionally.
        // Transitions reference existing states/pseudo-states and should not be checked for duplicates.

        // Element types that should not participate in duplicate name checking
        // These are either references to other elements or behavioral elements that share namespace
        const excludedFromDuplicateCheck = new Set([
            'transition',       // References source/target states, not declarations
            'succession',       // References source/target, not declarations
            'entry',            // Entry actions reference existing actions
            'exit',             // Exit actions reference existing actions
            'do',               // Do actions reference existing actions
            'send',             // Send actions reference signals/targets
            'accept',           // Accept actions reference signals
            'flow',             // Flows reference existing elements
            'connect',          // Connections reference existing elements
            'bind',             // Bindings reference existing elements
            'allocate',         // Allocations reference existing elements
            'message',          // Messages reference existing elements
            'first',            // Control flow references
            'then',             // Control flow references
            'perform',          // Perform references existing actions
            'exhibit',          // Exhibit references existing states
            'include',          // Include references existing use cases
            'satisfy',          // Satisfy references existing requirements
            'verify',           // Verify references existing requirements
            'expose',           // Expose references existing elements
            'import',           // Import references existing packages/elements
        ]);

        // Names that are SysML keywords - these are parser artifacts when the real name
        // couldn't be extracted (e.g., metadata def <alias> name patterns)
        const keywordNames = new Set([
            'metadata', 'occurrence', 'individual', 'snapshot', 'timeslice',
            'view', 'viewpoint', 'rendering', 'expose', 'filter', 'stakeholder',
            'concern', 'alias', 'comment', 'doc', 'rep', 'language', 'ref',
            'readonly', 'derived', 'end', 'abstract', 'variation', 'variant',
        ]);

        const checkElement = (element: SysMLElement, siblingNames: Set<string>) => {
            // Handle error elements from ANTLR syntax errors
            if (element.type === 'error') {
                const errorMessage = element.attributes.get('error') as string || element.name;

                // Check if this is an invalid identifier error and convert to the expected message
                if (errorMessage.includes('expecting IDENTIFIER') || errorMessage.includes('extraneous input') && /\d/.test(errorMessage)) {
                    diagnostics.push(new vscode.Diagnostic(
                        element.range,
                        'Invalid element name',
                        vscode.DiagnosticSeverity.Error
                    ));
                } else {
                    diagnostics.push(new vscode.Diagnostic(
                        element.range,
                        errorMessage,
                        vscode.DiagnosticSeverity.Error
                    ));
                }
                return;
            }

            // Skip duplicate checking for element types that are references, not declarations
            const elementTypeLower = element.type.toLowerCase();
            if (excludedFromDuplicateCheck.has(elementTypeLower)) {
                // Still validate children
                const childNames = new Set<string>();
                element.children.forEach(child => checkElement(child, childNames));
                return;
            }

            // Skip duplicate checking for elements whose name is a SysML keyword
            // These are parser artifacts when the real name couldn't be extracted
            // (e.g., metadata def <alias> name patterns)
            if (keywordNames.has(element.name)) {
                // Still validate children
                const childNames = new Set<string>();
                element.children.forEach(child => checkElement(child, childNames));
                return;
            }

            // Check for duplicates only among siblings (same namespace)
            // Skip redefinitions - these intentionally use the same name as the feature being redefined
            // Redefinitions can be indicated by:
            // - 'redefines' keyword
            // - ':>>' operator (shorthand for redefines)
            // - element type containing 'redefinition'
            const specializations = element.attributes.get('specializations');
            const specializationsList = Array.isArray(specializations) ? specializations :
                                        (typeof specializations === 'string' ? [specializations] : []);
            const isRedefinition = element.attributes.has('redefines') ||
                                   element.name.includes('redefines') ||
                                   element.type.toLowerCase().includes('redefinition') ||
                                   specializationsList.some((s: string) => s.includes('redefines') || s.includes(':>>'));

            // Also skip if this element has same name as a type it specializes (:>> pattern)
            // Pattern: requirement torqueGenerationRequirement :>> torqueGenerationRequirement
            const specializationChain = element.attributes.get('specializationChain') as string;
            const hasRedefinitionOperator = specializationChain?.includes(':>>') ||
                                           specializationsList.some((s: string) => s.includes(':>>'));

            if (!isRedefinition && !hasRedefinitionOperator && siblingNames.has(element.name)) {
                diagnostics.push(new vscode.Diagnostic(
                    element.range,
                    `Duplicate element name in namespace: ${element.name}`,
                    vscode.DiagnosticSeverity.Warning
                ));
            }
            if (!isRedefinition && !hasRedefinitionOperator) {
                siblingNames.add(element.name);
            }

            // Validate the element name according to SysML v2 rules
            const nameValidation = this.isValidSysMLName(element.name);
            if (!nameValidation.valid) {
                diagnostics.push(new vscode.Diagnostic(
                    element.range,
                    `Invalid element name: ${element.name}${nameValidation.reason ? ` (${nameValidation.reason})` : ''}`,
                    vscode.DiagnosticSeverity.Error
                ));
            }

            // Check children with a fresh set for their namespace
            const childNames = new Set<string>();
            element.children.forEach(child => checkElement(child, childNames));
        };

        // Check top-level elements with their own namespace set
        const topLevelNames = new Set<string>();
        elements.forEach(el => checkElement(el, topLevelNames));
    }

    private validateRelationships(diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        const relationships = this._parser.getRelationships();
        const elements = this._parser.getElements();
        const documentText = document.getText();

        // Well-known library prefixes that should not be flagged as missing
        // These are standard SysML/KerML libraries that may be imported
        const libraryPrefixes = new Set([
            'ISQ',              // International System of Quantities
            'SI',               // SI Units
            'USCustomaryUnits', // US Customary Units
            'Quantities',       // Quantities library
            'ScalarValues',     // Scalar values
            'Time',             // Time library
            'MeasurementReferences', // Measurement references
            'SIPrefixes',       // SI Prefixes
            'NumericalFunctions', // Numerical functions
            'Collections',      // Collections
            'ControlFunctions', // Control functions
            'BaseFunctions',    // Base functions
            'DataFunctions',    // Data functions
            'Occurrences',      // Occurrences
            'Objects',          // Objects
            'Performances',     // Performances
            'Links',            // Links
            'Transfers',        // Transfers
            'SequenceFunctions', // Sequence functions
            'StateSpaceDynamics', // State space dynamics
            'AnalysisTooling',  // Analysis tooling
            'ShapeItems',       // Shape items
            'Metaobjects',      // Metaobjects
            'ParametersOfInterestMetadata', // Parameters of interest
            'ModelingMetadata', // Modeling metadata
            'RequirementDerivation', // Requirement derivation
            'SysML',            // SysML namespace
            'KerML',            // KerML namespace
            'CartesianSpatial3dCoordinateFrame', // Coordinate frames
            'CartesianVelocity3dCoordinateFrame',
            'CartesianAcceleration3dCoordinateFrame',
        ]);

        // Build a set of simple (unqualified) names from all elements
        // This allows forward references to elements defined later in the file
        const simpleNames = new Set<string>();
        for (const qualifiedName of elements.keys()) {
            // Extract the simple name (last part after the last dot)
            const parts = qualifiedName.split('.');
            const simpleName = parts[parts.length - 1];
            if (simpleName) {
                simpleNames.add(simpleName);
            }
        }

        for (const rel of relationships) {
            if (!elements.has(rel.target)) {
                // Skip qualified names (containing ::) - these reference library or external elements
                // Example: ISQ::angularMeasure, Time::DateTime, SI::kg
                if (rel.target.includes('::')) {
                    // Check if it's a known library prefix
                    const prefix = rel.target.split('::')[0];
                    if (libraryPrefixes.has(prefix)) {
                        continue; // Known library reference, skip validation
                    }
                    // For unknown qualified names, we still skip as they may be from
                    // imported packages within the model that we haven't fully resolved
                    continue;
                }

                // Skip dotted path references - these access nested members of parts/elements
                // Example: vehicle_b_1.vehicleToRoadPort, fuelTank.fuel.fuelMass
                // These are member access expressions that we can't fully validate without
                // complete type resolution across the model hierarchy
                if (rel.target.includes('.')) {
                    continue; // Dotted path reference, skip validation
                }

                // Check if the target exists as a simple name anywhere in the document
                // This handles forward references to elements defined later in the file
                // Example: distancePerVolume used in RequirementDefinitions but defined in AttributeDefinitions
                if (simpleNames.has(rel.target)) {
                    continue; // Found as an unqualified name, skip validation
                }

                // Check if the target name appears in the document as a feature definition
                // This handles bare feature definitions like: distancePerVolume :> scalarQuantities = ...
                // These are valid SysML v2 but may not be fully parsed as named elements
                // Pattern: name :> type or name : type at the start of a statement
                const featureDefPattern = new RegExp(`\\b${rel.target}\\s*:>?\\s*\\w`, 'g');
                if (featureDefPattern.test(documentText)) {
                    continue; // Found as a feature definition in document text
                }

                const sourceElement = elements.get(rel.source);
                if (sourceElement) {
                    diagnostics.push(new vscode.Diagnostic(
                        sourceElement.range,
                        `Referenced element '${rel.target}' not found`,
                        vscode.DiagnosticSeverity.Error
                    ));
                }
            }
        }
    }

    private validateSyntax(document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const text = document.getText();
        let braceCount = 0;
        let lineNumber = 0;

        for (const line of text.split('\n')) {
            const openBraces = (line.match(/{/g) || []).length;
            const closeBraces = (line.match(/}/g) || []).length;

            braceCount += openBraces - closeBraces;

            if (braceCount < 0) {
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(lineNumber, 0, lineNumber, line.length),
                    'Unmatched closing brace',
                    vscode.DiagnosticSeverity.Error
                ));
            }

            lineNumber++;
        }

        if (braceCount > 0) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(lineNumber - 1, 0, lineNumber - 1, 0),
                'Unclosed braces in document',
                vscode.DiagnosticSeverity.Error
            ));
        }
    }

    private validateKeywordTypos(document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const { keywordSet } = getSysMLKeywordIndex();
        const text = document.getText();

        const lines = text.split('\n');
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber];
            const trimmed = line.trim();

            if (trimmed.length === 0) {
                continue;
            }
            if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('*/')) {
                continue;
            }
            if (trimmed.startsWith('}') || trimmed.startsWith('{')) {
                continue;
            }

            const match = line.match(/^[\s]*([A-Za-z_][A-Za-z0-9_]*)/);
            if (!match || !match[1]) {
                continue;
            }

            const firstWord = match[1];
            const wordLower = firstWord.toLowerCase();

            if (keywordSet.has(wordLower)) {
                continue;
            }

            // Only warn in places that *look like* a statement/decl start:
            // - keyword Name { ...
            // - keyword name : Type
            // - keyword def ...
            const after = line.slice(match[0].length);
            const looksLikeDecl =
                /^\s+def\b/.test(after) ||
                /^\s+[A-Za-z_][A-Za-z0-9_]*\s*(\{|:)/.test(after);

            if (!looksLikeDecl) {
                continue;
            }

            const suggestions = suggestSysMLKeywords(wordLower, 3);
            if (suggestions.length === 0) {
                continue;
            }

            const startChar = match.index ?? line.indexOf(firstWord);
            const range = new vscode.Range(lineNumber, startChar, lineNumber, startChar + firstWord.length);

            // Avoid duplicates if other validators already reported this exact range.
            if (diagnostics.some(d => d.range.isEqual(range))) {
                continue;
            }

            const best = suggestions[0];
            const diag = new vscode.Diagnostic(
                range,
                `Unknown keyword '${firstWord}'. Did you mean '${best}'?`,
                vscode.DiagnosticSeverity.Error
            );
            diag.source = 'sysml';
            diag.code = 'sysml.keywordTypo';
            diagnostics.push(diag);
        }
    }

    dispose(): void {
        this.diagnosticCollection.dispose();
        this.semanticDiagnostics.dispose();
    }
}
