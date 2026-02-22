/**
 * DTO types for the `sysml/model` custom LSP request and `sysml/status` notification.
 *
 * These mirror the types defined in the sysml-v2-lsp server
 * (`server/src/model/sysmlModelTypes.ts`).  All ranges use LSP-style
 * 0-based positions — the LspModelProvider converts them to
 * `vscode.Range` before consumers see them.
 */

// ---------------------------------------------------------------------------
// Status Notification
// ---------------------------------------------------------------------------

export interface SysMLStatusParams {
    state: 'begin' | 'progress' | 'end';
    message: string;
    uri: string;
    fileName?: string;
}

// ---------------------------------------------------------------------------
// Request / Response
// ---------------------------------------------------------------------------

export type SysMLModelScope =
    | 'elements'
    | 'relationships'
    | 'sequenceDiagrams'
    | 'activityDiagrams'
    | 'resolvedTypes'
    | 'diagnostics';

export interface SysMLModelParams {
    textDocument: { uri: string };
    scope?: SysMLModelScope[];
}

export interface SysMLModelResult {
    version: number;
    elements?: SysMLElementDTO[];
    relationships?: RelationshipDTO[];
    sequenceDiagrams?: SequenceDiagramDTO[];
    activityDiagrams?: ActivityDiagramDTO[];
    resolvedTypes?: Record<string, ResolvedTypeDTO>;
    diagnostics?: SemanticDiagnosticDTO[];
    stats?: {
        totalElements: number;
        resolvedElements: number;
        unresolvedElements: number;
        /** Actual ANTLR parse time (worker or lazy main-thread). */
        parseTimeMs: number;
        /** Time to build symbol table + extract DTOs for the requested scopes. */
        modelBuildTimeMs: number;
    };
}

// ---------------------------------------------------------------------------
// Core Element Tree
// ---------------------------------------------------------------------------

export interface PositionDTO {
    line: number;
    character: number;
}

export interface RangeDTO {
    start: PositionDTO;
    end: PositionDTO;
}

export interface SysMLElementDTO {
    type: string;
    name: string;
    range: RangeDTO;
    children: SysMLElementDTO[];
    attributes: Record<string, string | number | boolean>;
    relationships: RelationshipDTO[];
    errors?: string[];
}

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

export interface RelationshipDTO {
    type: string;
    source: string;
    target: string;
    name?: string;
}

// ---------------------------------------------------------------------------
// Sequence Diagrams
// ---------------------------------------------------------------------------

export interface SequenceDiagramDTO {
    name: string;
    participants: ParticipantDTO[];
    messages: MessageDTO[];
    range: RangeDTO;
}

export interface ParticipantDTO {
    name: string;
    type: string;
    range: RangeDTO;
}

export interface MessageDTO {
    name: string;
    from: string;
    to: string;
    payload: string;
    occurrence: number;
    range: RangeDTO;
}

// ---------------------------------------------------------------------------
// Activity Diagrams
// ---------------------------------------------------------------------------

export interface ActivityDiagramDTO {
    name: string;
    actions: ActivityActionDTO[];
    decisions: DecisionNodeDTO[];
    flows: ControlFlowDTO[];
    states: ActivityStateDTO[];
    range: RangeDTO;
}

export interface ActivityActionDTO {
    name: string;
    type: string;
    kind?: string;
    inputs?: string[];
    outputs?: string[];
    condition?: string;
    subActions?: ActivityActionDTO[];
    isDefinition?: boolean;
    range?: RangeDTO;
    parent?: string;
    children?: string[];
}

export interface DecisionNodeDTO {
    name: string;
    condition: string;
    branches: { condition: string; target: string }[];
    range: RangeDTO;
}

export interface ControlFlowDTO {
    from: string;
    to: string;
    condition?: string;
    guard?: string;
    range: RangeDTO;
}

export interface ActivityStateDTO {
    name: string;
    type: 'initial' | 'final' | 'intermediate';
    entryActions?: string[];
    exitActions?: string[];
    doActivity?: string;
    range: RangeDTO;
}

// ---------------------------------------------------------------------------
// Resolved Types
// ---------------------------------------------------------------------------

export interface ResolvedTypeDTO {
    qualifiedName: string;
    simpleName: string;
    kind: string;
    isLibraryType: boolean;
    specializationChain: string[];
    specializes: string[];
    features: ResolvedFeatureDTO[];
}

export interface ResolvedFeatureDTO {
    name: string;
    kind: string;
    type?: string;
    multiplicity?: string;
    direction?: 'in' | 'out' | 'inout';
    visibility?: 'public' | 'private' | 'protected';
    isDerived: boolean;
    isReadonly: boolean;
}

// ---------------------------------------------------------------------------
// Semantic Diagnostics
// ---------------------------------------------------------------------------

export interface SemanticDiagnosticDTO {
    code: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    range: RangeDTO;
    elementName: string;
    relatedInfo?: {
        message: string;
        location?: RangeDTO;
    }[];
}
