const Grammar = require('./js/grammar.js');
const FirstCalculator = require('./js/first.js');
const FollowCalculator = require('./js/follow.js');
const ParsingTableGenerator = require('./js/table.js');
const LL1Parser = require('./js/parser.js');

console.log("================================================================================");
console.log(" COMPREHENSIVE EDGE-CASE TEST SUITE: RECURSION, CONFLICTS, MALFORMED & INVALID  ");
console.log("================================================================================\n");

let allPassed = true;

// ============================================================================
// 1. TEST DIRECT & INDIRECT LEFT RECURSION
// ============================================================================
console.log("--- 1. Testing Left Recursion Detection ---");

// 1A: Direct Left Recursion
const gDirectLR = new Grammar(`
E -> E + T | T
T -> id
`);
console.log("1A Direct LR Warnings:", gDirectLR.warnings);
if (gDirectLR.warnings.some(w => w.type === 'LEFT_RECURSION_DIRECT' && w.symbol === 'E')) {
    console.log("  ✅ PASS: Direct Left Recursion correctly identified in 'E'.");
} else {
    console.error("  ❌ FAIL: Direct Left Recursion was NOT identified!");
    allPassed = false;
}

// 1B: Indirect Left Recursion (A -> B a, B -> A b)
const gIndirectLR = new Grammar(`
A -> B a | c
B -> A b | d
`);
console.log("1B Indirect LR Warnings:", gIndirectLR.warnings);

// ============================================================================
// 2. TEST FIRST/FIRST CONFLICTS
// ============================================================================
console.log("\n--- 2. Testing FIRST/FIRST Conflicts ---");
const gFirstFirst = new Grammar(`
S -> if E then S else S | if E then S | a
E -> b
`);
const fcFF = new FirstCalculator(gFirstFirst);
fcFF.compute();
const focFF = new FollowCalculator(gFirstFirst, fcFF);
focFF.compute();
const tgFF = new ParsingTableGenerator(gFirstFirst, fcFF, focFF);
const tblFF = tgFF.generate();

console.log("FIRST/FIRST isLL1:", tblFF.isLL1);
console.log("FIRST/FIRST Conflicts:", tblFF.conflicts);
const hasFFConflict = tblFF.conflicts.some(c => c.type === 'FIRST/FIRST CONFLICT' && c.nonTerminal === 'S' && c.terminal === 'if');
if (!tblFF.isLL1 && hasFFConflict) {
    console.log("  ✅ PASS: FIRST/FIRST conflict correctly identified in M[S, 'if'].");
} else {
    console.error("  ❌ FAIL: FIRST/FIRST conflict was NOT properly classified!");
    allPassed = false;
}

// ============================================================================
// 3. TEST FIRST/FOLLOW CONFLICTS
// ============================================================================
console.log("\n--- 3. Testing FIRST/FOLLOW Conflicts ---");
const gFirstFollow = new Grammar(`
S -> A a b
A -> a | ε
`);
const fcFFo = new FirstCalculator(gFirstFollow);
fcFFo.compute();
const focFFo = new FollowCalculator(gFirstFollow, fcFFo);
focFFo.compute();
const tgFFo = new ParsingTableGenerator(gFirstFollow, fcFFo, focFFo);
const tblFFo = tgFFo.generate();

console.log("FIRST/FOLLOW isLL1:", tblFFo.isLL1);
console.log("FIRST/FOLLOW Conflicts:", tblFFo.conflicts);
const hasFFoConflict = tblFFo.conflicts.some(c => c.type === 'FIRST/FOLLOW CONFLICT' && c.nonTerminal === 'A' && c.terminal === 'a');
if (!tblFFo.isLL1 && hasFFoConflict) {
    console.log("  ✅ PASS: FIRST/FOLLOW conflict correctly identified in M[A, 'a'].");
} else {
    console.error("  ❌ FAIL: FIRST/FOLLOW conflict was NOT properly classified!");
    allPassed = false;
}

// ============================================================================
// 4. TEST MALFORMED PRODUCTIONS & GRAMMAR SYNTAX ERRORS
// ============================================================================
console.log("\n--- 4. Testing Malformed Productions Handling ---");

const malformedCases = [
    { text: "", expectError: true, label: "Empty grammar string" },
    { text: "   \n\n  ", expectError: true, label: "Whitespace only" },
    { text: "E T E'", expectError: true, label: "Missing arrow '->'" },
    { text: "-> T E'", expectError: true, label: "Missing LHS symbol" },
    { text: "# Just a comment\n// Another comment", expectError: true, label: "Comments only, no rules" },
    { text: "E ->", expectError: false, label: "Empty RHS (treated as epsilon rule E -> ε)" }
];

for (const mc of malformedCases) {
    const g = new Grammar(mc.text);
    const hasErr = g.errors.length > 0;
    const ok = (hasErr === mc.expectError);
    console.log(`  ${ok ? '✅' : '❌'} ${mc.label} => Errors: [${g.errors.join('; ')}] (Expected error: ${mc.expectError})`);
    if (!ok) allPassed = false;
}

// ============================================================================
// 5. TEST INVALID INPUT STRINGS (PARSER ROBUSTNESS)
// ============================================================================
console.log("\n--- 5. Testing Invalid Input Strings on LL(1) Parser ---");

// Use standard arithmetic expression grammar
const standardGrammar = new Grammar(`
E  -> T E'
E' -> + T E' | ε
T  -> F T'
T' -> * F T' | ε
F  -> ( E ) | id
`);
const fcStd = new FirstCalculator(standardGrammar);
fcStd.compute();
const focStd = new FollowCalculator(standardGrammar, fcStd);
focStd.compute();
const tgStd = new ParsingTableGenerator(standardGrammar, fcStd, focStd);
tgStd.generate();
const parser = new LL1Parser(standardGrammar, tgStd);

const invalidInputs = [
    { input: "id + * id", label: "Consecutive operators (+ *)" },
    { input: "+ id", label: "Missing leading operand (+ id)" },
    { input: "id +", label: "Missing trailing operand (id +)" },
    { input: "( id + id", label: "Unclosed opening parenthesis (( id + id)" },
    { input: "id + id )", label: "Unmatched closing parenthesis (id + id ))" },
    { input: ") id + id (", label: "Reversed parentheses () id + id ()" },
    { input: "id id", label: "Missing operator between identifiers" },
    { input: "", label: "Empty input string" },
    { input: "   ", label: "Whitespace only input" },
    { input: "id + @#$ * id", label: "Lexical unknown characters (@#$)" }
];

for (const tc of invalidInputs) {
    const result = parser.parse(tc.input);
    const rejected = !result.success;
    console.log(`  ${rejected ? '✅' : '❌'} ${tc.label} => ${rejected ? 'REJECTED' : 'ACCEPTED'} (Msg: "${result.errorMessage}")`);
    if (!rejected) allPassed = false;
}

console.log("\n================================================================================");
if (allPassed) {
    console.log("🎉 ALL EDGE-CASE TESTS EVALUATED AND PASSED SUCCESSFULLY!");
} else {
    console.error("FAILURES DETECTED! Review output above.");
}
console.log("================================================================================");

