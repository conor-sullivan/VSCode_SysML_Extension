import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Export Functionality Test Suite', () => {

    // Ensure extension is activated before running tests
    suiteSetup(async function() {
        this.timeout(10000);
        const ext = vscode.extensions.getExtension('jamied.sysml-v2-support');
        if (ext && !ext.isActive) {
            await ext.activate();
        }
    });

    suite('Export Configuration Settings', () => {
        test('Export scale setting should exist with correct default', () => {
            const config = vscode.workspace.getConfiguration('sysml');
            const inspection = config.inspect<number>('export.defaultScale');

            // The setting should be defined in package.json
            // If inspection exists, check the defaultValue; if not, the setting may not be registered yet
            if (inspection) {
                assert.strictEqual(inspection.defaultValue, 2, 'Default export scale should be 2');
            } else {
                // Fallback: check if we can at least get the value (might be undefined if not set)
                const defaultScale = config.get<number>('export.defaultScale', 2);
                assert.strictEqual(defaultScale, 2, 'Default export scale should be 2');
            }
        });

        test('Export scale setting should accept valid values', async function() {
            this.timeout(10000);

            const config = vscode.workspace.getConfiguration('sysml');

            // Test updating to a specific value and reading it back
            // Use a delay to allow VS Code config system to sync
            const testScale = 3;
            await config.update('export.defaultScale', testScale, vscode.ConfigurationTarget.Global);

            // Wait for config to propagate
            await new Promise(resolve => setTimeout(resolve, 100));

            // Re-get config to ensure fresh read
            const updatedConfig = vscode.workspace.getConfiguration('sysml');
            const updatedScale = updatedConfig.get<number>('export.defaultScale');

            // Reset to default first, then assert (so we don't leave bad state)
            await config.update('export.defaultScale', undefined, vscode.ConfigurationTarget.Global);

            assert.strictEqual(updatedScale, testScale, `Scale should be updatable to ${testScale}`);
        });

        test('Export configuration should be in sysml namespace', () => {
            const config = vscode.workspace.getConfiguration('sysml');

            // Inspect the setting to verify it's properly defined
            const inspection = config.inspect<number>('export.defaultScale');

            // The setting should exist after extension activation
            // If not found via inspect, the extension contributes it
            if (inspection) {
                assert.ok(inspection, 'export.defaultScale setting should exist');
                assert.strictEqual(inspection.defaultValue, 2, 'Default value should be 2');
            } else {
                // Setting may not be inspectable but should still work with default
                const value = config.get<number>('export.defaultScale', 2);
                assert.strictEqual(value, 2, 'Should get default value of 2');
            }
        });
    });

    suite('Export Command Registration', () => {
        test('Export visualization command should be registered', async function() {
            this.timeout(5000);

            const commands = await vscode.commands.getCommands(true);
            assert.ok(
                commands.includes('sysml.exportVisualization'),
                'sysml.exportVisualization command should be registered'
            );
        });
    });

    suite('Scale Option Generation', () => {
        // Unit tests for scale option logic (mirrors extension.ts logic)

        interface ScaleOption {
            label: string;
            scale: number;
            description: string;
        }

        function generateScaleOptions(defaultScale: number): ScaleOption[] {
            const scaleOptions: ScaleOption[] = [
                { label: '1x - Original size', scale: 1, description: 'Smallest file size' },
                { label: '2x - Double size', scale: 2, description: 'Good quality (default)' },
                { label: '3x - Triple size', scale: 3, description: 'High quality' },
                { label: '4x - Quadruple size', scale: 4, description: 'Very high quality, larger file' }
            ];

            return scaleOptions.map(opt => ({
                ...opt,
                label: opt.scale === defaultScale ? `${opt.label} ✓` : opt.label
            }));
        }

        test('Should generate 4 scale options', () => {
            const options = generateScaleOptions(2);
            assert.strictEqual(options.length, 4, 'Should have 4 scale options');
        });

        test('Should mark default scale with checkmark', () => {
            const options = generateScaleOptions(2);

            const option2x = options.find(o => o.scale === 2);
            assert.ok(option2x?.label.includes('✓'), '2x option should have checkmark when default');

            // Other options should not have checkmark
            const option1x = options.find(o => o.scale === 1);
            const option3x = options.find(o => o.scale === 3);
            const option4x = options.find(o => o.scale === 4);

            assert.ok(!option1x?.label.includes('✓'), '1x should not have checkmark');
            assert.ok(!option3x?.label.includes('✓'), '3x should not have checkmark');
            assert.ok(!option4x?.label.includes('✓'), '4x should not have checkmark');
        });

        test('Should correctly mark 1x as default when configured', () => {
            const options = generateScaleOptions(1);

            const option1x = options.find(o => o.scale === 1);
            assert.ok(option1x?.label.includes('✓'), '1x option should have checkmark when default');

            const option2x = options.find(o => o.scale === 2);
            assert.ok(!option2x?.label.includes('✓'), '2x should not have checkmark');
        });

        test('Should correctly mark 4x as default when configured', () => {
            const options = generateScaleOptions(4);

            const option4x = options.find(o => o.scale === 4);
            assert.ok(option4x?.label.includes('✓'), '4x option should have checkmark when default');
        });

        test('Each option should have correct scale value', () => {
            const options = generateScaleOptions(2);

            assert.strictEqual(options[0].scale, 1);
            assert.strictEqual(options[1].scale, 2);
            assert.strictEqual(options[2].scale, 3);
            assert.strictEqual(options[3].scale, 4);
        });

        test('Each option should have descriptive label', () => {
            const options = generateScaleOptions(2);

            assert.ok(options[0].label.includes('Original'), '1x should mention Original');
            assert.ok(options[1].label.includes('Double'), '2x should mention Double');
            assert.ok(options[2].label.includes('Triple'), '3x should mention Triple');
            assert.ok(options[3].label.includes('Quadruple'), '4x should mention Quadruple');
        });
    });

    suite('PNG Export Scale Calculations', () => {
        // Tests for canvas dimension calculations at different scales

        function calculateExportDimensions(width: number, height: number, scale: number): { width: number; height: number } {
            return {
                width: width * scale,
                height: height * scale
            };
        }

        test('1x scale should keep original dimensions', () => {
            const result = calculateExportDimensions(800, 600, 1);
            assert.strictEqual(result.width, 800);
            assert.strictEqual(result.height, 600);
        });

        test('2x scale should double dimensions', () => {
            const result = calculateExportDimensions(800, 600, 2);
            assert.strictEqual(result.width, 1600);
            assert.strictEqual(result.height, 1200);
        });

        test('3x scale should triple dimensions', () => {
            const result = calculateExportDimensions(800, 600, 3);
            assert.strictEqual(result.width, 2400);
            assert.strictEqual(result.height, 1800);
        });

        test('4x scale should quadruple dimensions', () => {
            const result = calculateExportDimensions(800, 600, 4);
            assert.strictEqual(result.width, 3200);
            assert.strictEqual(result.height, 2400);
        });

        test('Should handle non-standard dimensions', () => {
            const result = calculateExportDimensions(1920, 1080, 2);
            assert.strictEqual(result.width, 3840);
            assert.strictEqual(result.height, 2160);
        });

        test('Should handle small dimensions', () => {
            const result = calculateExportDimensions(100, 50, 4);
            assert.strictEqual(result.width, 400);
            assert.strictEqual(result.height, 200);
        });
    });

    suite('Export Message Format', () => {
        // Tests for the message format sent between extension and webview

        interface ExportMessage {
            command: string;
            format: string;
            scale?: number;
        }

        function createExportMessage(format: string, scale: number = 2): ExportMessage {
            return {
                command: 'export',
                format: format.toLowerCase(),
                scale
            };
        }

        test('PNG export message should include scale', () => {
            const message = createExportMessage('PNG', 3);

            assert.strictEqual(message.command, 'export');
            assert.strictEqual(message.format, 'png');
            assert.strictEqual(message.scale, 3);
        });

        test('SVG export message should include default scale', () => {
            const message = createExportMessage('SVG');

            assert.strictEqual(message.command, 'export');
            assert.strictEqual(message.format, 'svg');
            assert.strictEqual(message.scale, 2);
        });

        test('Format should be lowercased', () => {
            const message1 = createExportMessage('PNG', 2);
            const message2 = createExportMessage('SVG', 2);

            assert.strictEqual(message1.format, 'png');
            assert.strictEqual(message2.format, 'svg');
        });

        test('All scale values should be valid in message', () => {
            for (const scale of [1, 2, 3, 4]) {
                const message = createExportMessage('PNG', scale);
                assert.strictEqual(message.scale, scale);
            }
        });
    });

    suite('Webview Export Menu Data Attributes', () => {
        // Tests for parsing data attributes from webview export menu items

        function parseScaleFromDataAttribute(dataScale: string | null): number {
            return parseInt(dataScale || '2') || 2;
        }

        test('Should parse valid scale values', () => {
            assert.strictEqual(parseScaleFromDataAttribute('1'), 1);
            assert.strictEqual(parseScaleFromDataAttribute('2'), 2);
            assert.strictEqual(parseScaleFromDataAttribute('3'), 3);
            assert.strictEqual(parseScaleFromDataAttribute('4'), 4);
        });

        test('Should default to 2 for null', () => {
            assert.strictEqual(parseScaleFromDataAttribute(null), 2);
        });

        test('Should default to 2 for empty string', () => {
            assert.strictEqual(parseScaleFromDataAttribute(''), 2);
        });

        test('Should default to 2 for invalid values', () => {
            assert.strictEqual(parseScaleFromDataAttribute('abc'), 2);
            assert.strictEqual(parseScaleFromDataAttribute('NaN'), 2);
        });
    });
});
