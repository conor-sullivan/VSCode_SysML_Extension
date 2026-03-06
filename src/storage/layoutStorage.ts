import * as vscode from 'vscode';

export interface ElementPosition {
    x: number;
    y: number;
}

export interface ViewLayout {
    positions: Record<string, ElementPosition>;
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

            layoutFile.layouts[viewType] = { positions };

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
