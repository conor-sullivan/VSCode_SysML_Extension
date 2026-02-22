/**
 * Type declarations for the sysml-v2-lsp npm package.
 *
 * The package exports absolute paths to the bundled language server
 * and MCP server modules, ready to be used with vscode-languageclient.
 */
declare module 'sysml-v2-lsp' {
    /** Absolute path to the bundled language server entry point (dist/server/server.js). */
    export const serverPath: string;

    /** Absolute path to the bundled MCP server entry point (stdio transport). */
    export const mcpServerPath: string;
}
