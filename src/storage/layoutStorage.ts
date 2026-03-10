import * as vscode from 'vscode';

export interface ElementPosition {
    x: number;
    y: number;
}

/** Per-element style overrides (e.g. from the Style toolbar). Keyed by element name. */
export interface ElementStyleOverrides {
    borderColor?: string;
}

export interface ViewLayout {
    positions: Record<string, ElementPosition>;
    collapsed?: string[];
    expanded?: string[];  // IBD: type parts explicitly expanded to show children when parent is collapsed
    /** Per-element style overrides for this view */
    elementStyles?: Record<string, ElementStyleOverrides>;
}

export interface LayoutFile {
    version: number;
    layouts: Record<string, ViewLayout>;
}

const LAYOUT_FILE_VERSION = 1;
const LAYOUT_SUFFIX = '-layout.json';

const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 500;

/**
 * Derive the sidecar layout file path from a `.sysml` document URI.
 * e.g. `/project/model.sysml` -> `/project/model.sysml-layout.json`
 */
export function getLayoutPath(documentUri: vscode.Uri): vscode.Uri {
    return vscode.Uri.file(documentUri.fsPath + LAYOUT_SUFFIX);
}

/**
 * Read and parse a layout file. Returns `null` if the file does not
 * exist or is malformed (never throws).
 */
export async function loadLayout(documentUri: vscode.Uri): Promise<LayoutFile | null> {
    const layoutUri = getLayoutPath(documentUri);
    try {
        const raw = await vscode.workspace.fs.readFile(layoutUri);
        const parsed = JSON.parse(Buffer.from(raw).toString('utf-8'));
        if (parsed && typeof parsed === 'object' && parsed.version === LAYOUT_FILE_VERSION) {
            return parsed as LayoutFile;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Persist positions for a single view type. Merges into the existing
 * layout file so that saving one view does not erase another.
 * Writes are debounced per file path.
 */
export function saveLayout(
    documentUri: vscode.Uri,
    viewType: string,
    positions: Record<string, ElementPosition>,
): void {
    const layoutUri = getLayoutPath(documentUri);
    const key = layoutUri.toString();

    const existing = pendingWrites.get(key);
    if (existing) {
        clearTimeout(existing);
    }

    pendingWrites.set(key, setTimeout(async () => {
        pendingWrites.delete(key);
        try {
            const current = await loadLayout(documentUri);
            const layoutFile: LayoutFile = current ?? {
                version: LAYOUT_FILE_VERSION,
                layouts: {},
            };

            const existing = layoutFile.layouts[viewType];
            layoutFile.layouts[viewType] = {
                ...existing,
                positions,
            };

            const content = Buffer.from(
                JSON.stringify(layoutFile, null, 2) + '\n',
                'utf-8',
            );
            await vscode.workspace.fs.writeFile(layoutUri, content);
        } catch (err) {
            console.warn('[SysML Layout] Failed to save layout:', err);
        }
    }, DEBOUNCE_MS));
}

/**
 * Persist the collapsed (and optionally expanded) element list for a single view type.
 * Merges into the existing layout file, preserving positions.
 */
export function saveCollapseState(
    documentUri: vscode.Uri,
    viewType: string,
    collapsed: string[],
    expanded?: string[],
): void {
    const layoutUri = getLayoutPath(documentUri);
    const key = layoutUri.toString() + '#collapse';

    const prev = pendingWrites.get(key);
    if (prev) {
        clearTimeout(prev);
    }

    pendingWrites.set(key, setTimeout(async () => {
        pendingWrites.delete(key);
        try {
            const current = await loadLayout(documentUri);
            const layoutFile: LayoutFile = current ?? {
                version: LAYOUT_FILE_VERSION,
                layouts: {},
            };

            const existing = layoutFile.layouts[viewType];
            const nextLayout: ViewLayout = {
                ...existing,
                positions: existing?.positions ?? {},
                collapsed: collapsed.length > 0 ? collapsed : undefined,
            };
            if (expanded !== undefined) {
                nextLayout.expanded = expanded.length > 0 ? expanded : undefined;
            }
            layoutFile.layouts[viewType] = nextLayout;

            const content = Buffer.from(
                JSON.stringify(layoutFile, null, 2) + '\n',
                'utf-8',
            );
            await vscode.workspace.fs.writeFile(layoutUri, content);
        } catch (err) {
            console.warn('[SysML Layout] Failed to save collapse state:', err);
        }
    }, DEBOUNCE_MS));
}

/**
 * Persist per-element style overrides for a single view (e.g. border color).
 * Merges into the existing layout file; pass the full elementStyles for that view to avoid races.
 */
export async function saveElementStyles(
    documentUri: vscode.Uri,
    viewType: string,
    elementStyles: Record<string, ElementStyleOverrides>,
): Promise<void> {
    const current = await loadLayout(documentUri);
    const layoutFile: LayoutFile = current ?? {
        version: LAYOUT_FILE_VERSION,
        layouts: {},
    };
    const existing = layoutFile.layouts[viewType];
    layoutFile.layouts[viewType] = {
        ...existing,
        positions: existing?.positions ?? {},
        collapsed: existing?.collapsed,
        expanded: existing?.expanded,
        elementStyles: Object.keys(elementStyles).length > 0 ? elementStyles : undefined,
    };
    const layoutUri = getLayoutPath(documentUri);
    const content = Buffer.from(
        JSON.stringify(layoutFile, null, 2) + '\n',
        'utf-8',
    );
    await vscode.workspace.fs.writeFile(layoutUri, content);
}

/**
 * Clear only the saved positions for a specific view; keeps collapsed/expanded state.
 * Use this to reset diagram layout to auto while preserving collapse state.
 */
export async function clearLayoutPositions(
    documentUri: vscode.Uri,
    viewType: string,
): Promise<void> {
    const current = await loadLayout(documentUri);
    const layoutFile: LayoutFile = current ?? {
        version: LAYOUT_FILE_VERSION,
        layouts: {},
    };
    const existing = layoutFile.layouts[viewType];
    layoutFile.layouts[viewType] = {
        ...existing,
        positions: {},
        collapsed: existing?.collapsed,
        expanded: existing?.expanded,
        elementStyles: existing?.elementStyles,
    };
    const layoutUri = getLayoutPath(documentUri);
    const content = Buffer.from(
        JSON.stringify(layoutFile, null, 2) + '\n',
        'utf-8',
    );
    await vscode.workspace.fs.writeFile(layoutUri, content);
}

/**
 * Clear saved positions for a specific view, or all views if no
 * viewType is provided.
 */
export async function clearLayout(
    documentUri: vscode.Uri,
    viewType?: string,
): Promise<void> {
    if (!viewType) {
        const layoutUri = getLayoutPath(documentUri);
        try {
            await vscode.workspace.fs.delete(layoutUri);
        } catch {
            // File may not exist -- that's fine
        }
        return;
    }

    const current = await loadLayout(documentUri);
    if (!current) { return; }

    delete current.layouts[viewType];

    const layoutUri = getLayoutPath(documentUri);
    const content = Buffer.from(
        JSON.stringify(current, null, 2) + '\n',
        'utf-8',
    );
    await vscode.workspace.fs.writeFile(layoutUri, content);
}
