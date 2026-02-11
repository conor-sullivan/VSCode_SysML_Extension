#!/usr/bin/env node
// Debug parse errors in the canonical SimpleVehicleModel.sysml
const fs = require('fs');
const antlr4 = require('antlr4');
const { SysMLv2Lexer } = require('../out/parser/generated/grammar/SysMLv2Lexer');
const { SysMLv2Parser } = require('../out/parser/generated/grammar/SysMLv2Parser');

const file = 'samples/temp/SysML v2 Spec Annex A SimpleVehicleModel.sysml';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

const chars = new antlr4.CharStream(content);
const lexer = new SysMLv2Lexer(chars);
lexer.removeErrorListeners();
let lexErrs = [];
lexer.addErrorListener({ syntaxError: (r, s, l, c, m) => lexErrs.push({ l, c, m }) });
const tokens = new antlr4.CommonTokenStream(lexer);
tokens.fill();

if (lexErrs.length > 0) {
    console.log('LEXER ERRORS:');
    lexErrs.forEach(e => console.log('  L' + e.l + ':' + e.c + ' ' + e.m));
    console.log('');
}

const parser = new SysMLv2Parser(tokens);
parser.removeErrorListeners();
let parseErrors = [];
parser.addErrorListener({
    syntaxError: (r, sym, line, col, msg) => {
        parseErrors.push({ line, col, msg });
    },
    reportAttemptingFullContext: () => {},
    reportAmbiguity: () => {},
    reportContextSensitivity: () => {}
});
parser._interp.predictionMode = antlr4.PredictionMode.SLL;
const start = Date.now();
parser.rootNamespace();
const elapsed = Date.now() - start;

console.log('Parse time: ' + elapsed + 'ms');
console.log('Total tokens: ' + tokens.tokens.length);
console.log('Total parse errors: ' + parseErrors.length);
console.log('');

parseErrors.forEach((e, i) => {
    console.log('Error ' + (i + 1) + ': L' + e.line + ':' + e.col);
    console.log('  Message: ' + e.msg.substring(0, 300));
    // Show context: 2 lines before and after
    const startL = Math.max(0, e.line - 3);
    const endL = Math.min(lines.length - 1, e.line + 1);
    for (let j = startL; j <= endL; j++) {
        const marker = (j + 1 === e.line) ? '>>>' : '   ';
        console.log('  ' + marker + ' ' + (j + 1).toString().padStart(4) + ': ' + lines[j]);
    }
    console.log('');
});
