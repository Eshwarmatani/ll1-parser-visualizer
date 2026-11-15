const Grammar = require('./js/grammar.js');
const FirstCalculator = require('./js/first.js');
const FollowCalculator = require('./js/follow.js');
const ParsingTableGenerator = require('./js/table.js');
const LL1Parser = require('./js/parser.js');
const SAMPLE_GRAMMARS = require('./js/sample-grammars.js');

console.log('Testing all preset sample grammars:');
for (const key of Object.keys(SAMPLE_GRAMMARS)) {
    const sg = SAMPLE_GRAMMARS[key];
    console.log(`\nTesting sample: ${sg.title}`);
    const g = new Grammar(sg.grammar);
    const fc = new FirstCalculator(g);
    fc.compute();
    const foc = new FollowCalculator(g, fc);
    foc.compute();
    const tg = new ParsingTableGenerator(g, fc, foc);
    const tbl = tg.generate();
    console.log(`  Non-terminals: ${g.nonTerminals.join(', ')}`);
    console.log(`  Terminals: ${g.terminals.join(', ')}`);
    console.log(`  LL(1) Compatible: ${tbl.isLL1}`);
    console.log(`  Conflicts detected: ${tbl.conflicts.length}`);
    console.log(`  Grammar Warnings: ${g.warnings.length}`);

    const parser = new LL1Parser(g, tg);
    for (const test of sg.testInputs) {
        const res = parser.parse(test.text);
        console.log(`    Input "${test.text}": ${res.success ? 'ACCEPTED' : 'REJECTED'} (${res.totalSteps} steps)`);
    }
}
console.log('\nAll sample grammars tested successfully without runtime errors!');

