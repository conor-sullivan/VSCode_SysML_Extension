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

interface ComplexityData {
    complexityIndex: number;
    rating: string;
    definitions: number;
    usages: number;
    maxDepth: number;
    couplingCount: number;
    unusedDefinitions: number;
    documentationCoverage: number;
    avgChildrenPerDef?: number;
    hotspots?: { qualifiedName: string; kind: string; childCount: number; depth: number; typeRefs: number; hasDoc: boolean; score: number }[];
}

interface DashboardData {
    stats: {
        totalElements: number;
        resolvedElements: number;
        unresolvedElements: number;
        parseTimeMs: number;
        modelBuildTimeMs: number;
        complexity?: ComplexityData;
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
    /** Cached dashboard data for instant re-renders. */
    private _lastData: DashboardData | undefined;
    /** Explicit document URI, used when no text editor is active (e.g. opened from visualizer). */
    private _documentUri: vscode.Uri | undefined;

    private constructor(
        panel: vscode.WebviewPanel,
        lspModelProvider: LspModelProvider | undefined,
        documentUri?: vscode.Uri,
    ) {
        this._panel = panel;
        this._lspModelProvider = lspModelProvider;
        this._documentUri = documentUri;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    /** Create or reveal the Model Dashboard panel. */
    static async createOrShow(
        extensionUri: vscode.Uri,
        lspModelProvider: LspModelProvider | undefined,
        documentUri?: vscode.Uri,
    ): Promise<ModelDashboardPanel> {
        if (ModelDashboardPanel.currentPanel) {
            ModelDashboardPanel.currentPanel._panel.reveal(vscode.ViewColumn.Active);
            ModelDashboardPanel.currentPanel._lspModelProvider = lspModelProvider;
            if (documentUri) {
                ModelDashboardPanel.currentPanel._documentUri = documentUri;
            }
            // Show cached data instantly, then refresh in background
            if (ModelDashboardPanel.currentPanel._lastData) {
                ModelDashboardPanel.currentPanel._panel.webview.html =
                    ModelDashboardPanel.currentPanel._buildHtml(ModelDashboardPanel.currentPanel._lastData);
            }
            await ModelDashboardPanel.currentPanel._refresh();
            return ModelDashboardPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'sysmlModelDashboard',
            'SysML Model Dashboard',
            vscode.ViewColumn.Active,
            { enableScripts: false, localResourceRoots: [] },
        );

        const dashboard = new ModelDashboardPanel(panel, lspModelProvider, documentUri);
        ModelDashboardPanel.currentPanel = dashboard;
        // Show a loading skeleton immediately so the panel isn't blank
        dashboard._panel.webview.html = dashboard._loadingHtml();
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

        // Prefer the active text editor; fall back to the explicitly provided URI
        // (e.g. when opened from the visualizer where no text editor is active).
        const editor = vscode.window.activeTextEditor;
        let uri: string;
        let fileName: string;
        let diagnosticUri: vscode.Uri;

        if (editor && editor.document.languageId === 'sysml') {
            uri = editor.document.uri.toString();
            fileName = editor.document.fileName.split('/').pop() ?? 'unknown';
            diagnosticUri = editor.document.uri;
        } else if (this._documentUri) {
            uri = this._documentUri.toString();
            fileName = this._documentUri.path.split('/').pop() ?? 'unknown';
            diagnosticUri = this._documentUri;
        } else {
            this._panel.webview.html = this._emptyHtml('Open a SysML file to see the dashboard');
            return;
        }

        try {
            const result = await this._lspModelProvider.getModel(uri, ['resolvedTypes']);
            const rawStats = result.stats ?? {
                totalElements: 0,
                resolvedElements: 0,
                unresolvedElements: 0,
                parseTimeMs: 0,
                modelBuildTimeMs: 0,
            };
            const stats = {
                ...rawStats,
                complexity: rawStats.complexity as ComplexityData | undefined,
            };

            const diagnostics = vscode.languages.getDiagnostics(diagnosticUri);
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

            this._lastData = data;
            this._panel.webview.html = this._buildHtml(data);
        } catch {
            this._panel.webview.html = this._emptyHtml('Failed to fetch model data from LSP server');
        }
    }

    /** Loading skeleton shown while the LSP request is in flight. */
    private _loadingHtml(): string {
        return `<!DOCTYPE html>
<html><head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>
body { font-family: var(--vscode-font-family, sans-serif); color: var(--vscode-foreground);
       background: var(--vscode-editor-background); padding: 20px; max-width: 800px; margin: 0 auto; }
h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
.subtitle { font-size: 12px; color: var(--vscode-descriptionForeground, #888); margin-bottom: 20px; }
@keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
.skeleton { border-radius: 8px; margin-bottom: 12px;
  background: linear-gradient(90deg, var(--vscode-sideBarSectionHeader-background, #252526) 25%,
    var(--vscode-panel-border, #444) 50%, var(--vscode-sideBarSectionHeader-background, #252526) 75%);
  background-size: 800px 100%; animation: shimmer 1.5s infinite linear; }
.skel-card { height: 90px; }
.skel-bar  { height: 22px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
</style></head><body>
<h1>Model Dashboard</h1>
<div class="subtitle">Loading model data…</div>
<div class="cards">
  <div class="skeleton skel-card"></div>
  <div class="skeleton skel-card"></div>
  <div class="skeleton skel-card"></div>
  <div class="skeleton skel-card"></div>
</div>
<div class="skeleton skel-bar"></div>
<div class="skeleton skel-bar"></div>
<div class="skeleton skel-bar"></div>
<div class="skeleton skel-bar"></div>
<div class="skeleton skel-bar"></div>
</body></html>`;
    }

    private _emptyHtml(message: string): string {
        return `<!DOCTYPE html>
<html><head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>
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

        // ── Complexity ──
        const cx = stats.complexity;

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
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
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

/* ── Complexity gauge ── */
.gauge-container { display: flex; align-items: center; gap: 20px; margin-bottom: 16px; }
.gauge { position: relative; width: 120px; height: 120px; }
.gauge svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.gauge-bg { fill: none; stroke: var(--border); stroke-width: 10; }
.gauge-fill { fill: none; stroke-width: 10; stroke-linecap: round; transition: stroke-dashoffset 0.5s; }
.gauge-text { position: absolute; inset: 0; display: flex; flex-direction: column;
              align-items: center; justify-content: center; }
.gauge-score { font-size: 28px; font-weight: 700; }
.gauge-label { font-size: 10px; text-transform: uppercase; color: var(--subtle); }
.gauge-legend { flex: 1; }
.gauge-legend p { margin-bottom: 6px; font-size: 12px; line-height: 1.5; color: var(--subtle); }
.gauge-legend .rating-badge { display: inline-block; padding: 2px 10px; border-radius: 10px;
                               font-size: 11px; font-weight: 600; text-transform: uppercase; }

/* ── Complexity metrics grid ── */
.cx-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 10px; margin-bottom: 24px; }
.cx-metric { background: var(--header-bg); border-radius: 8px; padding: 14px;
             border: 1px solid var(--border); }
.cx-metric .val { font-size: 22px; font-weight: 700; margin-bottom: 2px; }
.cx-metric .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px;
                  color: var(--subtle); margin-bottom: 4px; }
.cx-metric .desc { font-size: 11px; color: var(--subtle); line-height: 1.4; }

/* ── Hotspots table ── */
.hotspot-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.hotspot-table th { text-align: left; font-size: 10px; text-transform: uppercase;
                    letter-spacing: 0.6px; color: var(--subtle); padding: 6px 8px;
                    border-bottom: 1px solid var(--border); }
.hotspot-table td { padding: 6px 8px; border-bottom: 1px solid var(--border); }
.hotspot-table tr:hover { background: var(--header-bg); }
.hotspot-rank { font-weight: 700; color: var(--subtle); }
.hotspot-score-bar { height: 6px; border-radius: 3px; min-width: 2px; }
.hotspot-name { font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; }
.doc-badge { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.doc-yes { background: var(--success); }
.doc-no { background: var(--error); }
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

${this._buildComplexityHtml(cx)}

</body>
</html>`;
    }

    private _buildComplexityHtml(cx: ComplexityData | undefined): string {
        if (!cx) {
            return `
<div class="section">
    <div class="section-title">Model Complexity Index</div>
    <div style="color:var(--subtle); font-style:italic; padding:10px;">
        Complexity data not available — update the LSP server to enable this feature.
    </div>
</div>`;
        }

        // Gauge arc
        const radius = 48;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (cx.complexityIndex / 100) * circumference;
        const gaugeColor = cx.complexityIndex <= 10 ? 'var(--success)'
            : cx.complexityIndex <= 25 ? '#4fc3f7'
            : cx.complexityIndex <= 50 ? 'var(--warning)'
            : cx.complexityIndex <= 75 ? '#ff8a65'
            : 'var(--error)';

        const ratingBadgeColor = cx.complexityIndex <= 10 ? 'var(--success)'
            : cx.complexityIndex <= 25 ? '#4fc3f7'
            : cx.complexityIndex <= 50 ? 'var(--warning)'
            : cx.complexityIndex <= 75 ? '#ff8a65'
            : 'var(--error)';

        // Doc coverage bar color
        const docColor = cx.documentationCoverage >= 80 ? 'var(--success)'
            : cx.documentationCoverage >= 50 ? 'var(--warning)'
            : 'var(--error)';

        // Hotspots (top 8)
        const hotspots = (cx.hotspots ?? []).slice(0, 8);
        const maxHotspotScore = hotspots.length > 0 ? Math.max(hotspots[0].score, 1) : 1;

        return `
<!-- ── Model Complexity Index ── -->
<div class="section">
    <div class="section-title">Model Complexity Index</div>
    <div class="gauge-container">
        <div class="gauge">
            <svg viewBox="0 0 120 120">
                <circle class="gauge-bg" cx="60" cy="60" r="${radius}" />
                <circle class="gauge-fill" cx="60" cy="60" r="${radius}"
                    stroke="${gaugeColor}"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}" />
            </svg>
            <div class="gauge-text">
                <div class="gauge-score">${cx.complexityIndex}</div>
                <div class="gauge-label">/ 100</div>
            </div>
        </div>
        <div class="gauge-legend">
            <p>
                <span class="rating-badge" style="background: ${ratingBadgeColor}; color: #000;">
                    ${this._esc(cx.rating)}
                </span>
            </p>
            <p>
                The <strong>Model Complexity Index (MCI)</strong> is a weighted score
                from 0 (trivial) to 100 (very complex). It combines model size,
                nesting depth, inter-definition coupling, fan-out, and documentation
                coverage into a single number — similar to cyclomatic complexity for
                code, but adapted for structural SysML models.
            </p>
        </div>
    </div>
</div>

<!-- ── Complexity Metrics ── -->
<div class="section">
    <div class="section-title">Complexity Breakdown</div>
    <div class="cx-metrics">
        <div class="cx-metric">
            <div class="val">${cx.definitions}</div>
            <div class="lbl">Definitions</div>
            <div class="desc">Reusable type definitions (part&nbsp;def, action&nbsp;def, etc.)
                — the building blocks of the model.</div>
        </div>
        <div class="cx-metric">
            <div class="val">${cx.usages}</div>
            <div class="lbl">Usages</div>
            <div class="desc">Instances and references that materialise definitions
                (parts, attributes, ports, etc.).</div>
        </div>
        <div class="cx-metric">
            <div class="val">${cx.maxDepth}</div>
            <div class="lbl">Max Depth</div>
            <div class="desc">Deepest package → definition → usage nesting chain.
                High depth can make models harder to navigate.</div>
        </div>
        <div class="cx-metric">
            <div class="val">${cx.couplingCount}</div>
            <div class="lbl">Coupling</div>
            <div class="desc">Cross-definition type references. High coupling means
                definitions are tightly interconnected — changes propagate widely.</div>
        </div>
        <div class="cx-metric">
            <div class="val">${cx.unusedDefinitions}</div>
            <div class="lbl">Unused Defs</div>
            <div class="desc">Definitions never referenced by any usage — potential
                dead model elements that may be candidates for removal.</div>
        </div>
        <div class="cx-metric">
            <div class="val">${cx.documentationCoverage}%</div>
            <div class="lbl">Doc Coverage</div>
            <div class="desc">Percentage of definitions with a <code>doc</code> comment.
                Good documentation improves model maintainability.</div>
            <div class="coverage-bar">
                <div class="coverage-fill" style="width: ${cx.documentationCoverage}%; background: ${docColor}"></div>
            </div>
        </div>
    </div>
</div>

${hotspots.length > 0 ? `
<!-- ── Complexity Hotspots ── -->
<div class="section">
    <div class="section-title">Complexity Hotspots</div>
    <p style="font-size: 12px; color: var(--subtle); margin-bottom: 12px;">
        Definitions ranked by per-element complexity score. Score combines child
        count (fan-out), nesting depth, type reference density, and documentation
        status. Focus review effort on the highest-scoring elements.
    </p>
    <table class="hotspot-table">
        <thead>
            <tr>
                <th style="width: 30px;">#</th>
                <th>Definition</th>
                <th style="width: 80px;">Kind</th>
                <th style="width: 60px;">Children</th>
                <th style="width: 60px;">Type Refs</th>
                <th style="width: 40px;">Doc</th>
                <th style="width: 120px;">Score</th>
            </tr>
        </thead>
        <tbody>
            ${hotspots.map((h, i) => {
                const scoreColor = h.score <= 20 ? 'var(--success)'
                    : h.score <= 50 ? 'var(--warning)' : 'var(--error)';
                return `
            <tr>
                <td class="hotspot-rank">${i + 1}</td>
                <td class="hotspot-name" title="${this._esc(h.qualifiedName)}">${this._esc(h.qualifiedName)}</td>
                <td style="color: var(--subtle);">${this._esc(h.kind)}</td>
                <td style="text-align: center;">${h.childCount}</td>
                <td style="text-align: center;">${h.typeRefs}</td>
                <td style="text-align: center;"><span class="doc-badge ${h.hasDoc ? 'doc-yes' : 'doc-no'}" title="${h.hasDoc ? 'Documented' : 'No documentation'}"></span></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div class="bar-track" style="height: 6px;">
                            <div class="hotspot-score-bar" style="width: ${Math.round((h.score / maxHotspotScore) * 100)}%; background: ${scoreColor};"></div>
                        </div>
                        <span style="font-size: 11px; color: var(--subtle); width: 24px;">${h.score}</span>
                    </div>
                </td>
            </tr>`;
            }).join('')}
        </tbody>
    </table>
</div>` : ''}

<!-- ── Scoring Guide ── -->
<div class="section">
    <div class="section-title">How the Score is Calculated</div>
    <div style="font-size: 12px; color: var(--subtle); line-height: 1.7;">
        <p>The MCI combines five normalised sub-metrics with these weights:</p>
        <table style="margin: 8px 0; border-collapse: collapse; width: 100%;">
            <tr>
                <td style="padding: 4px 8px; border-bottom: 1px solid var(--border); width: 55%;"><strong>Size</strong> — log-scaled element count</td>
                <td style="padding: 4px 8px; border-bottom: 1px solid var(--border); text-align: right;">25%</td>
            </tr>
            <tr>
                <td style="padding: 4px 8px; border-bottom: 1px solid var(--border);"><strong>Depth</strong> — maximum nesting level</td>
                <td style="padding: 4px 8px; border-bottom: 1px solid var(--border); text-align: right;">20%</td>
            </tr>
            <tr>
                <td style="padding: 4px 8px; border-bottom: 1px solid var(--border);"><strong>Coupling</strong> — type references per definition</td>
                <td style="padding: 4px 8px; border-bottom: 1px solid var(--border); text-align: right;">25%</td>
            </tr>
            <tr>
                <td style="padding: 4px 8px; border-bottom: 1px solid var(--border);"><strong>Fan-out</strong> — avg children per definition</td>
                <td style="padding: 4px 8px; border-bottom: 1px solid var(--border); text-align: right;">20%</td>
            </tr>
            <tr>
                <td style="padding: 4px 8px; border-bottom: 1px solid var(--border);"><strong>Doc Debt</strong> — inverse documentation coverage</td>
                <td style="padding: 4px 8px; border-bottom: 1px solid var(--border); text-align: right;">10%</td>
            </tr>
        </table>
        <p style="margin-top: 6px;">
            Each sub-metric is normalised to 0\u20131 using logarithmic or linear scaling,
            then the weighted sum is mapped to 0\u2013100.<br>
            <strong>Ratings:</strong>
            0\u201310 = trivial &nbsp;\u00b7&nbsp;
            11\u201325 = simple &nbsp;\u00b7&nbsp;
            26\u201350 = moderate &nbsp;\u00b7&nbsp;
            51\u201375 = complex &nbsp;\u00b7&nbsp;
            76\u2013100 = very complex
        </p>
    </div>
</div>`;
    }

    private _esc(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
