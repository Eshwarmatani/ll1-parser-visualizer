const Grammar = require('./js/grammar.js');
const FirstCalculator = require('./js/first.js');
const FollowCalculator = require('./js/follow.js');
const ParsingTableGenerator = require('./js/table.js');
const LL1Parser = require('./js/parser.js');

const exampleGrammarText = `
E  -> T E'
E' -> + T E' | epsilon
T  -> F T'
T' -> * F T' | epsilon
F  -> ( E ) | id
`;

console.log('--- Testing Grammar Parsing ---');
const grammar = new Grammar(exampleGrammarText);
console.log('Non-terminals:', grammar.nonTerminals);
console.log('Terminals:', grammar.terminals);
console.log('Start Symbol:', grammar.startSymbol);
console.log('Rules count:', grammar.rules.length);

console.log('\n--- Testing FIRST Calculation ---');
const firstCalc = new FirstCalculator(grammar);
const firstSets = firstCalc.compute();
console.log('FIRST Sets:', JSON.stringify(firstSets, null, 2));

console.log('\n--- Testing FOLLOW Calculation ---');
const followCalc = new FollowCalculator(grammar, firstCalc);
const followSets = followCalc.compute();
console.log('FOLLOW Sets:', JSON.stringify(followSets, null, 2));

console.log('\n--- Testing Parsing Table Generation ---');
const tableGen = new ParsingTableGenerator(grammar, firstCalc, followCalc);
const tableData = tableGen.generate();
console.log('Is LL(1):', tableData.isLL1);
console.log('Conflicts:', tableData.conflicts);

console.log('\n--- Testing Test Cases with LL(1) Parser ---');
const parser = new LL1Parser(grammar, tableGen);

const testCases = [
    { input: 'id + id * id', expected: true, label: 'Test 1: id + id * id' },
    { input: 'id + * id', expected: false, label: 'Test 2: id + * id' },
    { input: '( id + id ) * id', expected: true, label: 'Test 3: ( id + id ) * id' },
    { input: 'id + id )', expected: false, label: 'Test 4: id + id )' }
];

let allPassed = true;
for (const tc of testCases) {
    const result = parser.parse(tc.input);
    const passed = (result.success === tc.expected);
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${tc.label} => Result: ${result.success ? 'ACCEPTED' : 'REJECTED'} (Expected: ${tc.expected ? 'ACCEPTED' : 'REJECTED'}, Steps: ${result.totalSteps})`);
    if (!result.success) {
        console.log(`   Message: ${result.errorMessage}`);
    }
    if (!passed) allPassed = false;
}

if (!allPassed) {
    console.error('Some tests failed!');
    process.exit(1);
} else {
    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

