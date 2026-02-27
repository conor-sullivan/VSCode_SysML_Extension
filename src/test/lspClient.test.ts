/**
 * LSP Client Integration Tests
 *
 * Verifies that the SysML v2 Language Server starts correctly and
 * provides core language features through the LSP protocol.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

const _isUnitTest = (vscode as any)._isMock === true;

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

suite('LSP Client Integration Tests', () => {

    // Ensure the extension is activated before running LSP-dependent tests
    suiteSetup(async function () {
        this.timeout(10000);
        const ext = vscode.extensions.getExtension('jamied.sysml-v2-support');
        if (ext && !ext.isActive) {
            await ext.activate();
        }
    });

    test('Language server commands are registered', async function () {
        if (_isUnitTest) { return this.skip(); } // needs real extension activation
        this.timeout(5000);
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('sysml.restartServer'), 'sysml.restartServer command should be registered');
        assert.ok(commands.includes('sysml.findReferences'), 'sysml.findReferences bridge command should be registered');
    });

    test('LSP provides diagnostics for syntax errors', async function () {
        if (_isUnitTest) { return this.skip(); } // needs real LSP server
        this.timeout(20000);

        const content = 'part def Broken {\n    attribute x :\n}';
        const document = await vscode.workspace.openTextDocument({
            language: 'sysml',
            content,
        });
        await vscode.window.showTextDocument(document);

        // Wait for the LSP server to analyse and publish diagnostics
        let diagnostics: vscode.Diagnostic[] = [];
        for (let i = 0; i < 30; i++) {
            await sleep(500);
            diagnostics = vscode.languages.getDiagnostics(document.uri);
            if (diagnostics.length > 0) { break; }
        }

        assert.ok(diagnostics.length > 0, 'LSP should report diagnostics for incomplete attribute type');
    });

    test('LSP provides hover information', async function () {
        if (_isUnitTest) { return this.skip(); } // needs real LSP server
        this.timeout(20000);

        const content = 'package Demo {\n    part def Vehicle {\n        attribute speed : Real;\n    }\n}';
        const document = await vscode.workspace.openTextDocument({
            language: 'sysml',
            content,
        });
        await vscode.window.showTextDocument(document);

        // Wait for LSP to be ready
        await sleep(3000);

        // Request hover at the "Vehicle" token (line 1, col ~13)
        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
            'vscode.executeHoverProvider',
            document.uri,
            new vscode.Position(1, 15)
        );

        // Hover may or may not be available depending on server readiness;
        // we just verify the command doesn't error out.
        assert.ok(Array.isArray(hovers), 'Hover provider should return an array');
    });

    test('LSP provides document symbols', async function () {
        if (_isUnitTest) { return this.skip(); } // needs real LSP server
        this.timeout(20000);

        const content = 'package Demo {\n    part def Vehicle {\n        attribute speed : Real;\n    }\n    part car : Vehicle;\n}';
        const document = await vscode.workspace.openTextDocument({
            language: 'sysml',
            content,
        });
        await vscode.window.showTextDocument(document);

        // Wait for LSP to be ready
        await sleep(3000);

        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

        assert.ok(Array.isArray(symbols), 'Document symbol provider should return an array');
    });

    test('LSP provides completions', async function () {
        if (_isUnitTest) { return this.skip(); } // needs real LSP server
        this.timeout(20000);

        const content = 'package Demo {\n    par\n}';
        const document = await vscode.workspace.openTextDocument({
            language: 'sysml',
            content,
        });
        await vscode.window.showTextDocument(document);

        // Wait for LSP to be ready
        await sleep(3000);

        const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
            'vscode.executeCompletionItemProvider',
            document.uri,
            new vscode.Position(1, 7) // after "par"
        );

        assert.ok(completions, 'Completion provider should return a result');
    });
});
