const { ANTLRSysMLParser } = require('../out/parser/antlrSysMLParser.js');
const fs = require('fs');

// Mock vscode
global.vscode = {
    Range: class { constructor(a,b,c,d) {} },
    Position: class { constructor(a,b) {} }
};

const content = fs.readFileSync('samples/SysML v2 Spec Annex A SimpleVehicleModel.sysml', 'utf-8');
const mockDoc = {
    getText: () => content,
    positionAt: (o) => ({ line: 0, character: 0 }),
    uri: { toString: () => 'test' }
};

const parser = new ANTLRSysMLParser();
const elements = parser.parseHierarchicalElements(mockDoc);
const flat = parser.getElements();

console.log('Total elements:', flat.size);

// Check if distancePerVolume is in the elements
let found = false;
for (const [key, value] of flat.entries()) {
    if (key.includes('distancePerVolume') || value.name === 'distancePerVolume') {
        console.log('Found element:', key, 'name:', value.name, 'type:', value.type);
        found = true;
    }
}
if (!found) {
    console.log('distancePerVolume NOT found in parsed elements');
}

// Show simple names that would be created
const simpleNames = new Set();
for (const qualifiedName of flat.keys()) {
    const parts = qualifiedName.split('.');
    const simpleName = parts[parts.length - 1];
    if (simpleName) simpleNames.add(simpleName);
}
console.log('Has distancePerVolume in simpleNames:', simpleNames.has('distancePerVolume'));

// Check what relationships reference distancePerVolume
const relationships = parser.getRelationships();
const distRels = relationships.filter(r => r.target === 'distancePerVolume' || r.source.includes('distancePerVolume'));
console.log('Relationships involving distancePerVolume:', distRels.length);
distRels.forEach(r => console.log('  ', r.source, '->', r.target, '(', r.type, ')'));
