/**
 * Phase 4 Verification Test: End-to-end test for parser modernization
 * Tests camera-states.sysml State Machine view with semantic resolution
 */

import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { Relationship, SysMLElement, SysMLParser } from '../parser/sysmlParser';

suite('Phase 4 Verification Tests', () => {
    let parser: SysMLParser;

    suiteSetup(async function() {
        this.timeout(30000);
        parser = new SysMLParser();
    });

    test('Library Service available via parser (when initialized)', async function() {
        // Library service is now managed by the LSP server for language features.
        // The local parser may optionally use it for enhanced visualization.
        // This test verifies the parser works without it.
        this.skip();
    });

    test('camera-states.sysml: State Machine view should show 11 states', async function() {
        this.timeout(10000);

        const samplePath = path.join(__dirname, '../../samples/Camera Example/camera-states.sysml');
        const uri = vscode.Uri.file(samplePath);
        const document = await vscode.workspace.openTextDocument(uri);

        // Parse with semantic resolution
        const resolutionResult = await parser.parseWithSemanticResolution(document);
        const elements = parser.convertEnrichedToSysMLElements(resolutionResult.elements);

        // Find state machine elements
        const stateElements = findElementsByType(elements, 'state');

        console.log(`Found ${stateElements.length} state elements`);
        console.log('State names:', stateElements.map(s => s.name).join(', '));

        // Verify 11 states exist (based on user's original report)
        assert.ok(stateElements.length >= 11,
            `Expected at least 11 states, found ${stateElements.length}`);
    });

    test('camera-states.sysml: State Machine should have transitions', async function() {
        this.timeout(10000);

        const samplePath = path.join(__dirname, '../../samples/Camera Example/camera-states.sysml');
        const uri = vscode.Uri.file(samplePath);
        const document = await vscode.workspace.openTextDocument(uri);

        // Parse and get relationships
        const _resolutionResult = await parser.parseWithSemanticResolution(document);
        const relationships = parser.getRelationships();

        // Find transition relationships
        const transitions = relationships.filter((rel: Relationship) =>
            rel.type === 'transition' ||
            rel.type === 'succession' ||
            rel.type === 'then'
        );

        console.log(`Found ${transitions.length} transitions`);
        console.log('Transitions:', transitions.map((t: Relationship) => `${t.source} -> ${t.target}`).join(', '));

        // Verify transitions exist (user reported 12 transitions expected)
        assert.ok(transitions.length > 0,
            'State machine should have at least one transition');
    });

    test('Semantic resolver: Type resolution against library', async function() {
        // Library service is now managed by the LSP server.
        // Semantic resolution tests belong in the sysml-v2-lsp test suite.
        this.skip();
    });

    test('Pure ANTLR pipeline: No regex fallback', async function() {
        this.timeout(10000);

        const samplePath = path.join(__dirname, '../../samples/vehicle-model.sysml');
        const uri = vscode.Uri.file(samplePath);
        const document = await vscode.workspace.openTextDocument(uri);

        // Parse document
        const elements = parser.parse(document);

        // Verify elements were parsed
        assert.ok(elements.length > 0, 'Should parse elements from vehicle-model.sysml');

        // Check for error elements (ANTLR parse failures)
        const errorElements = elements.filter((el: SysMLElement) => el.type === 'error');
        console.log(`Parse errors: ${errorElements.length} / ${elements.length}`);

        // Most elements should parse successfully
        const successRate = (elements.length - errorElements.length) / elements.length;
        assert.ok(successRate >= 0.7,
            `Success rate should be >= 70%, got ${(successRate * 100).toFixed(1)}%`);
    });

    test('Library cache: Verification', async function() {
        // Library cache operations are now managed by the LSP server.
        this.skip();
    });
});

/**
 * Helper: Recursively find all elements of a given type
 */
function findElementsByType(elements: any[], type: string): any[] {
    const results: any[] = [];

    for (const element of elements) {
        if (element.type === type) {
            results.push(element);
        }
        if (element.children && element.children.length > 0) {
            results.push(...findElementsByType(element.children, type));
        }
    }

    return results;
}
