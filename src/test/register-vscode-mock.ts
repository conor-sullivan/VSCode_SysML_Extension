/**
 * Mocha --require hook that intercepts `require('vscode')` and returns
 * the lightweight mock in src/test/vscode-mock.ts.
 *
 * Usage:  mocha --require ts-node/register --require src/test/register-vscode-mock.ts ...
 */

const Module = require('module');

const originalResolveFilename = (Module as any)._resolveFilename;

(Module as any)._resolveFilename = function (
    request: string,
    parent: any,
    isMain: boolean,
    options: any
) {
    if (request === 'vscode') {
        // Resolve to our mock module instead
        return require.resolve('./vscode-mock');
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
};
