#!/usr/bin/env node
// Test ANTLR parsing of all sample .sysml files
const fs = require('fs');
const path = require('path');
const antlr4 = require('antlr4');
const { SysMLv2Lexer } = require('../out/parser/generated/grammar/SysMLv2Lexer');
const { SysMLv2 } = require('../out/parser/generated/grammar/SysMLv2');

function findSysmlFiles(dir) {
    let results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) results.push(...findSysmlFiles(full));
        else if (entry.name.endsWith('.sysml')) results.push(full);
    }
    return results;
}

const files = findSysmlFiles(path.join(__dirname, '..', 'samples'));
console.log(`Found ${files.length} sample files\n`);

let totalPass = 0, totalFail = 0;

for (const file of files) {
    const relPath = path.relative(path.join(__dirname, '..'), file);
    const content = fs.readFileSync(file, 'utf8');
    const chars = new antlr4.CharStream(content);
    const lexer = new SysMLv2Lexer(chars);
    
    let lexerErrors = 0;
    lexer.removeErrorListeners();
    lexer.addErrorListener({
        syntaxError: () => { lexerErrors++; }
    });
    
    const tokens = new antlr4.CommonTokenStream(lexer);
    tokens.fill();
    
    const parser = new SysMLv2(tokens);
    let parseErrors = [];
    parser.removeErrorListeners();
    parser.addErrorListener({
        syntaxError: (r, sym, line, col, msg) => {
            parseErrors.push({ line, col, msg: msg.substring(0, 80) });
        },
        reportAttemptingFullContext: () => {},
        reportAmbiguity: () => {},
        reportContextSensitivity: () => {}
    });
    
    // Use SLL prediction mode
    parser._interp.predictionMode = antlr4.PredictionMode.SLL;
    
    const start = Date.now();
    const tree = parser.rootNamespace();
    const elapsed = Date.now() - start;
    
    const children = tree.children ? tree.children.length : 0;
    const status = parseErrors.length === 0 ? '✓' : '✗';
    
    if (parseErrors.length === 0) totalPass++;
    else totalFail++;
    
    console.log(`${status} ${relPath} (${elapsed}ms, ${tokens.tokens.length} tokens, ${children} children, ${parseErrors.length} errors)`);
    
    if (parseErrors.length > 0) {
        parseErrors.slice(0, 3).forEach(e => {
            console.log(`    L${e.line}:${e.col}: ${e.msg}`);
        });
    }
}

console.log(`\n${totalPass} passed, ${totalFail} failed out of ${files.length} files`);
process.exit(totalFail > 0 ? 1 : 0);
