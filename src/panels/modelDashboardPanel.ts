/**
 * Model Dashboard Panel — a webview showing model-wide metrics and
 * a breakdown of the current SysML document.
 *
 * Displays:
 * - Resolution coverage (typed vs un-typed elements)
 * - Elements-by-kind bar chart (pure CSS, no external deps)
 * - Specialization depth overview
 * - Parse performance
 *
 * Data source: `stats` + `resolvedTypes` from `sysml/model`.
 */

import * as vscode from 'vscode';
import { LspModelProvider } from '../providers/lspModelProvider';
import type { ResolvedTypeDTO } from '../providers/sysmlModelTypes';

interface DashboardData {
    stats: {
        totalElements: number;
        resolvedElements: number;
        unresolvedElements: number;
        parseTimeMs: number;
        modelBuildTimeMs: number;
    };
    resolvedTypes: Record<string, ResolvedTypeDTO>;
    fileName: string;
    diagnosticErrors: number;
    diagnosticWarnings: number;
}

export class ModelDashboardPanel {
    public static currentPanel: ModelDashboardPanel | undefined;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _disposables: vscode.Disposable[] = [];
    private _lspModelProvider: LspModelProvider | undefined;

    private constructor(
        panel: vscode.WebviewPanel,
        lspModelProvider: LspModelProvider | undefined,
    ) {
        this._panel = panel;
        this._lspModelProvider = lspModelProvider;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    /** Create or reveal the Model Dashboard panel. */
    static async createOrShow(
        extensionUri: vscode.Uri,
        lspModelProvider: LspModelProvider | undefined,
    ): Promise<ModelDashboardPanel> {
        if (ModelDashboardPanel.currentPanel) {
            ModelDashboardPanel.currentPanel._panel.reveal(vscode.ViewColumn.Active);
            ModelDashboardPanel.currentPanel._lspModelProvider = lspModelProvider;
            await ModelDashboardPanel.currentPanel._refresh();
            return ModelDashboardPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'sysmlModelDashboard',
            'SysML Model Dashboard',
            vscode.ViewColumn.Active,
            { enableScripts: false, localResourceRoots: [] },
        );

        const dashboard = new ModelDashboardPanel(panel, lspModelProvider);
        ModelDashboardPanel.currentPanel = dashboard;
        await dashboard._refresh();
        return dashboard;
    }

    /** Update the LSP model provider. */
    setLspModelProvider(provider: LspModelProvider | undefined): void {
        this._lspModelProvider = provider;
    }

    /** Refresh dashboard with latest data. */
    async refresh(): Promise<void> {
        await this._refresh();
    }

    dispose(): void {
        ModelDashboardPanel.currentPanel = undefined;
        this._panel.dispose();
        for (const d of this._disposables) {
            d.dispose();
        }
    }

    // ─── Private ───────────────────────────────────────────────────

    private async _refresh(): Promise<void> {
        if (!this._lspModelProvider) {
            this._panel.webview.html = this._emptyHtml(
                'Model Dashboard requires an LSP model provider',
            );
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'sysml') {
            this._panel.webview.html = this._emptyHtml('Open a SysML file to see the dashboard');
            return;
        }

        const uri = editor.document.uri.toString();
        const fileName = editor.document.fileName.split('/').pop() ?? 'unknown';

        try {
            const result = await this._lspModelProvider.getModel(uri, ['resolvedTypes']);
            const stats = result.stats ?? {
                totalElements: 0,
                resolvedElements: 0,
                unresolvedElements: 0,
                parseTimeMs: 0,
                modelBuildTimeMs: 0,
            };

            const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
            const diagnosticErrors = diagnostics.filter(
                d => d.severity === vscode.DiagnosticSeverity.Error,
            ).length;
            const diagnosticWarnings = diagnostics.filter(
                d => d.severity === vscode.DiagnosticSeverity.Warning,
            ).length;

            const data: DashboardData = {
                stats,
                resolvedTypes: result.resolvedTypes ?? {},
                fileName,
                diagnosticErrors,
                diagnosticWarnings,
            };

            this._panel.webview.html = this._buildHtml(data);
        } catch {
            this._panel.webview.html = this._emptyHtml('Failed to fetch model data from LSP server');
        }
    }

    private _emptyHtml(message: string): string {
        return `<!DOCTYPE html>
<html><head><style>
body { font-family: var(--vscode-font-family, sans-serif); color: var(--vscode-foreground);
       background: var(--vscode-editor-background); padding: 40px; display: flex;
       align-items: center; justify-content: center; height: 80vh; }
p { opacity: 0.6; font-style: italic; text-align: center; font-size: 14px; }
</style></head><body><p>${this._esc(message)}</p></body></html>`;
    }

    private _buildHtml(data: DashboardData): string {
        const { stats, resolvedTypes, fileName, diagnosticErrors, diagnosticWarnings } = data;
        const types = Object.values(resolvedTypes);

        // ── Elements by kind ──
        const kindCounts = new Map<string, number>();
        for (const t of types) {
            const kind = t.kind || 'unknown';
            kindCounts.set(kind, (kindCounts.get(kind) ?? 0) + 1);
        }
        const sortedKinds = [...kindCounts.entries()].sort((a, b) => b[1] - a[1]);
        const maxKindCount = sortedKinds.length > 0 ? sortedKinds[0][1] : 1;

        // ── Specialization depth ──
        const depthCounts = new Map<number, number>();
        let maxDepth = 0;
        for (const t of types) {
            const depth = t.specializationChain.length;
            if (depth > maxDepth) maxDepth = depth;
            depthCounts.set(depth, (depthCounts.get(depth) ?? 0) + 1);
        }

        // ── Library vs user types ──
        const libraryTypes = types.filter(t => t.isLibraryType).length;
        const userTypes = types.length - libraryTypes;

        // ── Feature stats ──
        let totalFeatures = 0;
        let derivedCount = 0;
        let readonlyCount = 0;
        let directedCount = 0;
        for (const t of types) {
            totalFeatures += t.features.length;
            for (const f of t.features) {
                if (f.isDerived) derivedCount++;
                if (f.isReadonly) readonlyCount++;
                if (f.direction) directedCount++;
            }
        }

        // ── Resolution coverage percentage ──
        const coveragePct = stats.totalElements > 0
            ? Math.round((stats.resolvedElements / stats.totalElements) * 100)
            : 0;

        // ── Health indicator ──
        const healthIcon = diagnosticErrors > 0 ? '🔴' : diagnosticWarnings > 0 ? '🟡' : '🟢';
        const healthText = diagnosticErrors > 0
            ? `${diagnosticErrors} error(s), ${diagnosticWarnings} warning(s)`
            : diagnosticWarnings > 0
                ? `${diagnosticWarnings} warning(s)`
                : 'No issues';

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
:root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-foreground);
    --border: var(--vscode-panel-border, #444);
    --badge-bg: var(--vscode-badge-background, #007acc);
    --badge-fg: var(--vscode-badge-foreground, #fff);
    --subtle: var(--vscode-descriptionForeground, #888);
    --header-bg: var(--vscode-sideBarSectionHeader-background, #252526);
    --accent: var(--vscode-textLink-foreground, #3794ff);
    --success: #89d185;
    --warning: #dca06e;
    --error: #f48771;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
       font-size: var(--vscode-font-size, 13px); color: var(--fg);
       background: var(--bg); padding: 20px; line-height: 1.5; max-width: 800px; margin: 0 auto; }

h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
.subtitle { font-size: 12px; color: var(--subtle); margin-bottom: 20px; }

/* ── Cards grid ── */
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
         gap: 12px; margin-bottom: 24px; }
.card { background: var(--header-bg); border-radius: 8px; padding: 16px;
        border: 1px solid var(--border); }
.card-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px;
              color: var(--subtle); margin-bottom: 6px; }
.card-value { font-size: 28px; font-weight: 700; }
.card-detail { font-size: 11px; color: var(--subtle); margin-top: 4px; }

/* ── Coverage bar ── */
.coverage-bar { height: 8px; border-radius: 4px; background: var(--border); overflow: hidden;
                margin-top: 8px; }
.coverage-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }

/* ── Section ── */
.section { margin-bottom: 24px; }
.section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px;
                 color: var(--subtle); margin-bottom: 10px; border-bottom: 1px solid var(--border);
                 padding-bottom: 4px; }

/* ── Bar chart ── */
.bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.bar-label { width: 120px; font-size: 11px; text-align: right; flex-shrink: 0;
             overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-track { flex: 1; height: 18px; background: var(--border); border-radius: 3px;
             overflow: hidden; position: relative; }
.bar-fill { height: 100%; border-radius: 3px; min-width: 2px; }
.bar-count { font-size: 11px; color: var(--subtle); width: 30px; flex-shrink: 0; }

/* ── Health badge ── */
.health { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
          border-radius: 12px; background: var(--header-bg); font-size: 12px; }

/* ── Depth histogram ── */
.depth-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.depth-label { width: 60px; font-size: 11px; text-align: right; color: var(--subtle); }
.depth-bar { height: 14px; border-radius: 2px; min-width: 2px; }
.depth-count { font-size: 11px; color: var(--subtle); }

/* ── Feature summary ── */
.feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 8px; }
.feature-stat { background: var(--header-bg); border-radius: 6px; padding: 10px;
                text-align: center; border: 1px solid var(--border); }
.feature-stat .val { font-size: 20px; font-weight: 700; }
.feature-stat .lbl { font-size: 10px; color: var(--subtle); text-transform: uppercase; }

/* ── Color palette for bars ── */
.c0 { background: #4fc3f7; }
.c1 { background: #81c784; }
.c2 { background: #ffb74d; }
.c3 { background: #e57373; }
.c4 { background: #ba68c8; }
.c5 { background: #4db6ac; }
.c6 { background: #ff8a65; }
.c7 { background: #a1887f; }
.c8 { background: #90a4ae; }
.c9 { background: #aed581; }
</style>
</head>
<body>

<h1>Model Dashboard</h1>
<div class="subtitle">${this._esc(fileName)} &nbsp;|&nbsp; <span class="health">${healthIcon} ${this._esc(healthText)}</span></div>

<!-- ── Summary cards ── -->
<div class="cards">
    <div class="card">
        <div class="card-label">Total Elements</div>
        <div class="card-value">${stats.totalElements}</div>
        <div class="card-detail">${userTypes} user / ${libraryTypes} library types</div>
    </div>
    <div class="card">
        <div class="card-label">Type Coverage</div>
        <div class="card-value">${coveragePct}%</div>
        <div class="card-detail">${stats.resolvedElements} typed / ${stats.unresolvedElements} un-typed</div>
        <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${coveragePct}%; background: ${coveragePct >= 80 ? 'var(--success)' : coveragePct >= 50 ? 'var(--warning)' : 'var(--error)'}"></div>
        </div>
    </div>
    <div class="card">
        <div class="card-label">Parse Time</div>
        <div class="card-value">${stats.parseTimeMs}<span style="font-size:14px">ms</span></div>
        <div class="card-detail">${stats.parseTimeMs < 100 ? 'Fast' : stats.parseTimeMs < 500 ? 'Normal' : 'Slow'}</div>
    </div>
    <div class="card">
        <div class="card-label">Resolved Types</div>
        <div class="card-value">${types.length}</div>
        <div class="card-detail">Max depth: ${maxDepth}</div>
    </div>
</div>

<!-- ── Elements by kind ── -->
<div class="section">
    <div class="section-title">Elements by Kind</div>
    ${sortedKinds.length > 0 ? sortedKinds.map(([kind, count], i) => `
    <div class="bar-row">
        <div class="bar-label" title="${this._esc(kind)}">${this._esc(kind)}</div>
        <div class="bar-track">
            <div class="bar-fill c${i % 10}" style="width: ${Math.round((count / maxKindCount) * 100)}%"></div>
        </div>
        <div class="bar-count">${count}</div>
    </div>`).join('') : '<div style="color:var(--subtle); font-style:italic; padding:10px;">No resolved types</div>'}
</div>

<!-- ── Specialization depth ── -->
${maxDepth > 0 ? `
<div class="section">
    <div class="section-title">Specialization Depth</div>
    ${[...depthCounts.entries()].sort((a, b) => a[0] - b[0]).map(([depth, count]) => {
        const maxCount = Math.max(...depthCounts.values());
        return `
    <div class="depth-row">
        <div class="depth-label">depth ${depth}</div>
        <div class="bar-track">
            <div class="depth-bar c${depth % 10}" style="width: ${Math.round((count / maxCount) * 100)}%"></div>
        </div>
        <div class="depth-count">${count}</div>
    </div>`;
    }).join('')}
</div>` : ''}

<!-- ── Feature summary ── -->
${totalFeatures > 0 ? `
<div class="section">
    <div class="section-title">Feature Summary</div>
    <div class="feature-grid">
        <div class="feature-stat"><div class="val">${totalFeatures}</div><div class="lbl">Total</div></div>
        <div class="feature-stat"><div class="val">${directedCount}</div><div class="lbl">Directed</div></div>
        <div class="feature-stat"><div class="val">${derivedCount}</div><div class="lbl">Derived</div></div>
        <div class="feature-stat"><div class="val">${readonlyCount}</div><div class="lbl">Readonly</div></div>
    </div>
</div>` : ''}

</body>
</html>`;
    }

    private _esc(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
