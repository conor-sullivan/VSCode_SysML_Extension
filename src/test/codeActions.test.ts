import * as assert from 'assert';
import * as vscode from 'vscode';

const _isUnitTest = (vscode as any)._isMock === true;

suite('SysML Code Actions', () => {
    test('Offers Quick Fix to replace invalid keyword with package', async function() {
        if (_isUnitTest) { return this.skip(); } // needs real code-action provider
        this.timeout(10000);

        const content = `packageasdf Test {
}`;

        const document = await vscode.workspace.openTextDocument({
            language: 'sysml',
            content
        });

        await vscode.window.showTextDocument(document);

        // No diagnostics are required for keyword-typo quick fixes; the provider can infer from the token.

        const firstLineRange = new vscode.Range(0, 0, 0, 'packageasdf'.length);

        const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
            'vscode.executeCodeActionProvider',
            document.uri,
            firstLineRange
        );

        assert.ok(actions);
        const titles = actions?.map(a => a.title) ?? [];

        // The LSP may offer "Replace with package", "Fix typo: ...", or generic "Fix"
        assert.ok(
            titles.some(t => t.toLowerCase().includes('package') || t === 'Fix'),
            `Expected a code action for 'packageasdf'.\nActions: ${JSON.stringify(titles)}`
        );
    });

    test('Offers Quick Fix to replace invalid keyword with attribute', async function() {
        if (_isUnitTest) { return this.skip(); } // needs real code-action provider
        this.timeout(10000);

        const content = `attributex foo: String;`;

        const document = await vscode.workspace.openTextDocument({
            language: 'sysml',
            content
        });

        await vscode.window.showTextDocument(document);

        const firstWordRange = new vscode.Range(0, 0, 0, 'attributex'.length);

        const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
            'vscode.executeCodeActionProvider',
            document.uri,
            firstWordRange
        );

        assert.ok(actions);
        const titles = actions?.map(a => a.title) ?? [];

        assert.ok(
            titles.some(t => t.toLowerCase().includes('attribute') || t === 'Fix'),
            `Expected a code action for 'attributex'.\nActions: ${JSON.stringify(titles)}`
        );
    });

    test('Offers Quick Fix for squashed multi-word keyword (partdef -> part def)', async function() {
        if (_isUnitTest) { return this.skip(); } // needs real code-action provider
        this.timeout(10000);

        const content = `partdef Wheel {\n}`;

        const document = await vscode.workspace.openTextDocument({
            language: 'sysml',
            content
        });

        await vscode.window.showTextDocument(document);

        const firstWordRange = new vscode.Range(0, 0, 0, 'partdef'.length);

        const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
            'vscode.executeCodeActionProvider',
            document.uri,
            firstWordRange
        );

        assert.ok(actions);
        const titles = actions?.map(a => a.title) ?? [];

        assert.ok(
            titles.some(t => t.toLowerCase().includes('part def') || t.toLowerCase().includes('partdef') || t === 'Fix'),
            `Expected a code action for 'partdef'.\nActions: ${JSON.stringify(titles)}`
        );
    });
});
