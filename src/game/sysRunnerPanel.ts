/**
 * SysML World Panel — an isolated webview hosting a retro side-scrolling
 * game that teaches SysML v2.0 concepts through gameplay.
 *
 * Completely self-contained: no dependencies on the extension's parser,
 * LSP client, model provider, or visualization infrastructure.
 */

import * as vscode from 'vscode';

export class SysRunnerPanel {
    public static currentPanel: SysRunnerPanel | undefined;
    private static readonly viewType = 'sysmlSysRunner';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._panel.webview.html = this._getHtml();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview (e.g. level-complete notifications)
        this._panel.webview.onDidReceiveMessage(
            (msg) => {
                if (msg.type === 'levelComplete') {
                    vscode.window.showInformationMessage(
                        `SysML World: Level ${msg.level} complete! ${msg.concept} mastered.`,
                    );
                }
            },
            null,
            this._disposables,
        );
    }

    /** Create or reveal the SysML World game panel. */
    static createOrShow(extensionUri: vscode.Uri): void {
        if (SysRunnerPanel.currentPanel) {
            SysRunnerPanel.currentPanel._panel.reveal(vscode.ViewColumn.Active);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            SysRunnerPanel.viewType,
            'SysML World — Learn SysML v2',
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                // Restrict resource loading to the game media folder only
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media', 'game'),
                ],
            },
        );

        panel.iconPath = vscode.Uri.joinPath(extensionUri, 'media', 'game', 'icon.png');
        SysRunnerPanel.currentPanel = new SysRunnerPanel(panel, extensionUri);

        // Send identifiers from the active SysML document to the game
        SysRunnerPanel.currentPanel._sendDocumentWords();
    }

    dispose(): void {
        SysRunnerPanel.currentPanel = undefined;
        this._panel.dispose();
        for (const d of this._disposables) {
            d.dispose();
        }
        this._disposables.length = 0;
    }

    /**
     * Extract user-defined identifiers from the active SysML document
     * and send them to the game webview for use as boss projectile words.
     */
    private _sendDocumentWords(): void {
        const editor = vscode.window.visibleTextEditors.find(
            (e) => e.document.languageId === 'sysml',
        );
        if (!editor) { return; }

        const text = editor.document.getText();
        const words = new Set<string>();

        // Match identifiers after SysML definition/usage keywords
        const defPattern = /\b(?:part|port|attribute|action|item|requirement|state|use\s+case|interface|connection|occurrence|constraint|concern|stakeholder|calc|analysis\s+case|enumeration|view|viewpoint|rendering|package|flow|allocation|objective|alias)\s+(?:def\s+)?([A-Za-z_]\w*)/g;
        let m: RegExpExecArray | null;
        while ((m = defPattern.exec(text)) !== null) {
            const name = m[1];
            // Skip very short names and common SysML built-in types
            if (name.length >= 3 && !/^(def|Real|Integer|Boolean|String|Natural)$/.test(name)) {
                words.add(name);
            }
        }

        if (words.size > 0) {
            this._panel.webview.postMessage({
                type: 'documentWords',
                words: [...words],
            });
        }
    }

    /* ------------------------------------------------------------------ */
    /*  HTML generation — the entire game lives inside this webview.       */
    /* ------------------------------------------------------------------ */

    private _getHtml(): string {
        const webview = this._panel.webview;
        const nonce = _getNonce();

        // URI for the external game script
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'game', 'sysrunner.js'),
        );

        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none';
               style-src 'nonce-${nonce}';
               script-src 'nonce-${nonce}';
               img-src ${webview.cspSource} data:;"/>
<title>SysML World</title>
<style nonce="${nonce}">
/* ── RETRO GAME SHELL ───────────────────────────────────── */
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#1a1a2e;font-family:'Courier New',monospace;color:#e0e0e0;image-rendering:pixelated}
#game-wrapper{display:flex;flex-direction:column;width:100%;height:100%;user-select:none}

/* Top HUD bar */
#hud{display:flex;align-items:center;justify-content:space-between;padding:6px 16px;background:#0f0f23;border-bottom:2px solid #333;font-size:13px;flex-shrink:0}
#hud .hud-left{display:flex;gap:18px;align-items:center}
#hud .hud-right{display:flex;gap:18px;align-items:center}
.hud-label{color:#888;text-transform:uppercase;font-size:10px;letter-spacing:1px}
.hud-value{color:#00ff88;font-weight:bold;font-size:14px}
.hud-lives{color:#ff4444}
.hud-level-name{color:#ffcc00;font-size:12px}

/* Canvas area */
#canvas-container{flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:#0a0a1e}
canvas#game{image-rendering:pixelated;image-rendering:crisp-edges;background:#0a0a1e}

/* Model panel (slides up from bottom during puzzles) */
#model-panel{position:absolute;bottom:0;left:0;right:0;max-height:0;overflow:hidden;background:rgba(15,15,35,0.97);border-top:2px solid #00ff88;transition:max-height 0.4s ease;z-index:10}
#model-panel.open{max-height:260px}
#model-panel-inner{padding:12px 16px}
#model-panel h3{color:#00ff88;font-size:13px;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px}
.puzzle-hint{color:#aaa;font-size:11px;margin-bottom:10px;line-height:1.5}

/* Puzzle slots */
.slot-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.slot{width:120px;height:40px;border:2px dashed #444;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#666;transition:all 0.2s}
.slot.filled{border-color:#00ff88;color:#00ff88;border-style:solid;background:rgba(0,255,136,0.08)}
.slot.wrong{border-color:#ff4444;color:#ff4444;animation:shake 0.3s}
.slot.correct{border-color:#00ff88;color:#00ff88;background:rgba(0,255,136,0.15)}

/* Inventory blocks */
.block-row{display:flex;gap:6px;flex-wrap:wrap}
.block-item{padding:6px 12px;background:#1a1a3e;border:1px solid #555;border-radius:3px;font-size:11px;cursor:pointer;color:#ddd;transition:all 0.15s}
.block-item:hover{background:#2a2a5e;border-color:#00ff88;color:#fff}
.block-item.used{opacity:0.3;pointer-events:none}
.block-item.selected{border-color:#ffcc00;background:#2a2a3e;color:#ffcc00;box-shadow:0 0 8px rgba(255,204,0,0.3)}

/* Title screen */
#title-screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(180deg,#0a0a2e 0%,#1a0a3e 50%,#0a1a2e 100%);z-index:20}
#title-screen h1{font-size:48px;color:#00ff88;text-shadow:0 0 20px rgba(0,255,136,0.5),4px 4px 0 #005533;margin-bottom:6px;letter-spacing:4px}
#title-screen .subtitle{color:#888;font-size:14px;margin-bottom:40px;letter-spacing:2px}
#title-screen .start-btn{padding:14px 40px;background:transparent;border:2px solid #00ff88;color:#00ff88;font-family:inherit;font-size:16px;cursor:pointer;letter-spacing:2px;transition:all 0.2s}
#title-screen .start-btn:hover{background:#00ff88;color:#0a0a2e}
#title-screen .controls-hint{margin-top:30px;color:#555;font-size:11px;line-height:1.8}
#title-screen .controls-hint kbd{background:#222;padding:2px 6px;border:1px solid #444;border-radius:2px;color:#aaa}

/* Level complete overlay */
#level-complete{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,10,30,0.92);z-index:20}
#level-complete.show{display:flex}
#level-complete h2{font-size:32px;color:#ffcc00;margin-bottom:8px;text-shadow:0 0 15px rgba(255,204,0,0.4)}
#level-complete .concept-learned{color:#00ff88;font-size:14px;margin-bottom:6px}
#level-complete .concept-explanation{color:#aaa;font-size:12px;max-width:400px;text-align:center;line-height:1.6;margin-bottom:24px}
#level-complete .next-btn{padding:12px 36px;background:transparent;border:2px solid #ffcc00;color:#ffcc00;font-family:inherit;font-size:14px;cursor:pointer;letter-spacing:2px;transition:all 0.2s}
#level-complete .next-btn:hover{background:#ffcc00;color:#0a0a2e}

/* Game-over overlay */
#game-over{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(30,5,5,0.92);z-index:20}
#game-over.show{display:flex}
#game-over h2{font-size:40px;color:#ff4444;margin-bottom:10px;text-shadow:0 0 15px rgba(255,0,0,0.4)}
#game-over .score-line{color:#aaa;font-size:14px;margin-bottom:24px}
#game-over .retry-btn{padding:12px 36px;background:transparent;border:2px solid #ff4444;color:#ff4444;font-family:inherit;font-size:14px;cursor:pointer;letter-spacing:2px;transition:all 0.2s}
#game-over .retry-btn:hover{background:#ff4444;color:#1a1a2e}

/* Start-over button (subdued) */
.startover-btn{margin-top:10px;padding:8px 24px;background:transparent;border:1px solid #666;color:#888;font-family:inherit;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all 0.2s}
.startover-btn:hover{border-color:#aaa;color:#ddd}

@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
</style>
</head>
<body>
<div id="game-wrapper">

  <!-- HUD -->
  <div id="hud">
    <div class="hud-left">
      <div><span class="hud-label">Score</span><br/><span class="hud-value" id="hud-score">0</span></div>
      <div><span class="hud-label">Lives</span><br/><span class="hud-value hud-lives" id="hud-lives">♥♥♥</span></div>
      <div><span class="hud-label">Blocks</span><br/><span class="hud-value" id="hud-blocks">0</span></div>
    </div>
    <div class="hud-right">
      <div><span class="hud-level-name" id="hud-level">Level 1: Ports &amp; Parts</span></div>
    </div>
  </div>

  <!-- Game canvas -->
  <div id="canvas-container">
    <canvas id="game" width="800" height="450"></canvas>

    <!-- Title screen -->
    <div id="title-screen">
      <h1>SysML World</h1>
      <div class="subtitle">A Model Builder Adventure</div>
      <button class="start-btn" id="start-btn">START GAME</button>
      <div class="controls-hint">
        <kbd>←</kbd> <kbd>→</kbd> Move &nbsp;·&nbsp; <kbd>Space</kbd> Jump &nbsp;·&nbsp; <kbd>E</kbd> Interact<br/>
        Pick up SysML blocks · Solve puzzles · Build models · Save the system!
      </div>
    </div>

    <!-- Level complete overlay -->
    <div id="level-complete">
      <canvas id="trophy-canvas" width="120" height="140" style="display:none;margin-bottom:8px"></canvas>
      <h2>LEVEL COMPLETE!</h2>
      <div class="concept-learned" id="lc-concept"></div>
      <div class="concept-explanation" id="lc-explanation"></div>
      <button class="next-btn" id="next-btn">NEXT LEVEL</button>
      <button class="startover-btn" id="lc-startover-btn" style="display:none">START OVER</button>
    </div>

    <!-- Game over overlay -->
    <div id="game-over">
      <h2>GAME OVER</h2>
      <div class="score-line" id="go-score">Score: 0</div>
      <button class="retry-btn" id="retry-btn">TRY AGAIN</button>
      <button class="retry-btn" id="retry-boss-btn" style="display:none">RETRY BOSS</button>
      <button class="startover-btn" id="go-startover-btn" style="display:none">START OVER</button>
    </div>

    <!-- Model panel (puzzle area) -->
    <div id="model-panel">
      <div id="model-panel-inner">
        <h3 id="puzzle-title">Model Puzzle</h3>
        <div class="puzzle-hint" id="puzzle-hint"></div>
        <div class="slot-row" id="puzzle-slots"></div>
        <div class="block-row" id="puzzle-blocks"></div>
      </div>
    </div>
  </div>

</div>

<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}

/** Generate a random nonce for Content Security Policy. */
function _getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < 32; i++) {
        nonce += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return nonce;
}
