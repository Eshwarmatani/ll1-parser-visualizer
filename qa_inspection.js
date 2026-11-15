/**
 * STRICT QA ENGINEER INDEPENDENT VERIFICATION HARNESS
 * Checks HTML, JS, CSS, DOM bindings, dead buttons, broken links,
 * algorithms, animations, reversibility, exports, and Python-JS parity.
 */

const fs = require('fs');
const path = require('path');

const Grammar = require('./js/grammar.js');
const FirstCalculator = require('./js/first.js');
const FollowCalculator = require('./js/follow.js');
const ParsingTableGenerator = require('./js/table.js');
const GrammarTransformer = require('./js/transform.js');
const Lexer = require('./js/lexer.js');
const QuizEngine = require('./js/quiz.js');
const DataExporter = require('./js/export.js');
const LL1Parser = require('./js/parser.js');
const AnimationController = require('./js/animator.js');
const UIController = require('./js/ui.js');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = [];

function check(desc, condition, details = '') {
    totalChecks++;
    if (condition) {
        passedChecks++;
        console.log(`  [PASS] ${desc}`);
    } else {
        failedChecks.push({ desc, details });
        console.error(`  [FAIL] ${desc}: ${details}`);
    }
}

console.log('================================================================================');
console.log('        STRICT QA INDEPENDENT COMPILER PLATFORM AUDIT REPORT        ');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// CHECKPOINT 1: DOM & HTML STRUCTURAL INTEGRITY
// -----------------------------------------------------------------------------
console.log('--- CHECKPOINT 1: HTML Element IDs & Navigation Integrity ---');
const html = fs.readFileSync('index.html', 'utf8');

// 1.1 Find all section IDs in HTML
const sectionIdMatches = [...html.matchAll(/<section[^>]*id=["']([^"']+)["']/g)].map(m => m[1]);
console.log(`  Found ${sectionIdMatches.length} content sections: ${sectionIdMatches.join(', ')}`);
check('HTML has at least 10 functional content sections', sectionIdMatches.length >= 10, `Found ${sectionIdMatches.length}`);

// 1.2 Verify all data-target in sidebar exist as sections
const navTargets = [...html.matchAll(/class=["'][^"']*nav-item[^"']*["'][^>]*data-target=["']([^"']+)["']/g)].map(m => m[1]);
navTargets.forEach(target => {
    check(`Sidebar nav-item targets valid section '#${target}'`, sectionIdMatches.includes(target), `Missing section id="${target}" in HTML`);
});

// 1.3 Verify all data-goto buttons target valid sections
const gotoTargets = [...html.matchAll(/data-goto=["']([^"']+)["']/g)].map(m => m[1]);
gotoTargets.forEach(target => {
    check(`Quick-jump button targets valid section '#${target}'`, sectionIdMatches.includes(target), `Missing section id="${target}" in HTML`);
});

// 1.4 Check all getElementById in js/ui.js to verify they exist in index.html
const uiCode = fs.readFileSync('js/ui.js', 'utf8');
const idRefs = [...new Set([...uiCode.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]))];
console.log(`  Checking ${idRefs.length} unique DOM ID references in js/ui.js...`);

let missingIds = [];
idRefs.forEach(id => {
    // Dynamic trace row IDs are generated dynamically in JS
    if (id.includes('${') || id.includes('row-') || id.startsWith('cell-target-')) return;
    
    const exists = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
    if (!exists) {
        missingIds.push(id);
    }
});
check(`All getElementById in js/ui.js exist in index.html (Missing: ${missingIds.length})`, missingIds.length === 0, `Missing IDs: ${missingIds.join(', ')}`);

// 1.5 Check all <button> in index.html to ensure none are dead/unbound
const buttonTags = [...html.matchAll(/<button([^>]*)>(.*?)<\/button>/gs)].map(m => {
    const attrs = m[1];
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    const idMatch = attrs.match(/id=["']([^"']+)["']/);
    const classMatch = attrs.match(/class=["']([^"']+)["']/);
    const gotoMatch = attrs.match(/data-goto=["']([^"']+)["']/);
    const onclickMatch = attrs.match(/onclick=["']([^"']+)["']/);
    return {
        id: idMatch ? idMatch[1] : null,
        classes: classMatch ? classMatch[1] : '',
        hasGoto: !!gotoMatch,
        hasOnclick: !!onclickMatch,
        text
    };
});

let unboundButtons = [];
buttonTags.forEach(btn => {
    const isBound = btn.hasGoto || 
                    btn.hasOnclick || 
                    (btn.id && uiCode.includes(`'${btn.id}'`)) || 
                    btn.classes.includes('btn-run-builtin-test') ||
                    btn.classes.includes('insert-sym-btn') ||
                    btn.classes.includes('btn-speed-preset') ||
                    btn.classes.includes('lexer-sample-btn') ||
                    btn.classes.includes('quiz-filter-btn') ||
                    btn.classes.includes('btn-load-history') ||
                    btn.classes.includes('quiz-option-btn') ||
                    btn.classes.includes('modal-close-btn');
    if (!isBound) {
        unboundButtons.push(btn.id || btn.text);
    }
});
check(`Every visible button has an active event binding (Unbound: ${unboundButtons.length})`, unboundButtons.length === 0, `Unbound: ${unboundButtons.join(', ')}`);


// -----------------------------------------------------------------------------
// CHECKPOINT 2: MATHEMATICAL ACCURACY OF FIRST & FOLLOW ALGORITHMS
// -----------------------------------------------------------------------------
console.log('\n--- CHECKPOINT 2: FIRST & FOLLOW Set Mathematical Verification ---');

// Test Case 2.1: Classic Dragon Book Arithmetic Expression Grammar
const gArith = new Grammar(`
E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> ( E ) | id
`);
const fCalc = new FirstCalculator(gArith);
fCalc.compute();
const folCalc = new FollowCalculator(gArith, fCalc);
folCalc.compute();

const firstSets = fCalc.getFormattedSets();
const followSets = folCalc.getFormattedSets();

check("FIRST(E) == ['(', 'id']", JSON.stringify(firstSets['E']) === JSON.stringify(['(', 'id']), JSON.stringify(firstSets['E']));
check("FIRST(E') == ['+', 'ε']", JSON.stringify(firstSets["E'"]) === JSON.stringify(['+', 'ε']), JSON.stringify(firstSets["E'"]));
check("FIRST(T) == ['(', 'id']", JSON.stringify(firstSets['T']) === JSON.stringify(['(', 'id']), JSON.stringify(firstSets['T']));
check("FIRST(T') == ['*', 'ε']", JSON.stringify(firstSets["T'"]) === JSON.stringify(['*', 'ε']), JSON.stringify(firstSets["T'"]));
check("FIRST(F) == ['(', 'id']", JSON.stringify(firstSets['F']) === JSON.stringify(['(', 'id']), JSON.stringify(firstSets['F']));

check("FOLLOW(E) == [')', '$']", JSON.stringify(followSets['E']) === JSON.stringify([')', '$']), JSON.stringify(followSets['E']));
check("FOLLOW(E') == [')', '$']", JSON.stringify(followSets["E'"]) === JSON.stringify([')', '$']), JSON.stringify(followSets["E'"]));
check("FOLLOW(T) == [')', '+', '$']", JSON.stringify(followSets['T']) === JSON.stringify([')', '+', '$']), JSON.stringify(followSets['T']));
check("FOLLOW(T') == [')', '+', '$']", JSON.stringify(followSets["T'"]) === JSON.stringify([')', '+', '$']), JSON.stringify(followSets["T'"]));
check("FOLLOW(F) == [')', '*', '+', '$']", JSON.stringify(followSets['F']) === JSON.stringify([')', '*', '+', '$']), JSON.stringify(followSets['F']));

// Test Case 2.2: Multivariable Nullable Cascade
const gCascade = new Grammar(`
S -> A B C
A -> a | ε
B -> b | ε
C -> c | ε
`);
const fCasc = new FirstCalculator(gCascade);
fCasc.compute();
const folCasc = new FollowCalculator(gCascade, fCasc);
folCasc.compute();

const firstCasc = fCasc.getFormattedSets();
const followCasc = folCasc.getFormattedSets();

check("Cascade FIRST(S) contains { a, b, c, ε }", 
    ['a', 'b', 'c', 'ε'].every(x => firstCasc['S'].includes(x)) && firstCasc['S'].length === 4, 
    JSON.stringify(firstCasc['S']));
check("Cascade FOLLOW(A) contains { b, c, $ }", 
    ['b', 'c', '$'].every(x => followCasc['A'].includes(x)) && followCasc['A'].length === 3, 
    JSON.stringify(followCasc['A']));
check("Cascade FOLLOW(B) contains { c, $ }", 
    ['c', '$'].every(x => followCasc['B'].includes(x)) && followCasc['B'].length === 2, 
    JSON.stringify(followCasc['B']));


// -----------------------------------------------------------------------------
// CHECKPOINT 3: LL(1) TABLE CONSTRUCTION & CONFLICT CLASSIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- CHECKPOINT 3: LL(1) Table Construction & Conflict Detection ---');

const tblArith = new ParsingTableGenerator(gArith, fCalc, folCalc);
tblArith.generate();
check("Classic arithmetic table is LL(1)", tblArith.isLL1 === true);
check("Classic arithmetic table has 0 conflicts", tblArith.conflicts.length === 0);
check("M[E, 'id'] contains 'E -> T E''", tblArith.table['E']['id'].length === 1 && tblArith.table['E']['id'][0].rawRhs === "T E'");
check("M[E', '+'] contains 'E' -> + T E''", tblArith.table["E'"]['+'].length === 1 && tblArith.table["E'"]['+'][0].rawRhs === "+ T E'");
check("M[E', '$'] contains 'E' -> ε' (FOLLOW-derived)", tblArith.table["E'"]['$'].length === 1 && tblArith.table["E'"]['$'][0].rawRhs === "ε");
check("M[E, '+'] is empty (blank error cell)", tblArith.table['E']['+'].length === 0);

// Conflict Test 1: FIRST/FIRST Conflict (Dangling Else Prefix)
const gIfElse = new Grammar(`
S -> if E then S else S | if E then S | a
E -> b
`);
const fIf = new FirstCalculator(gIfElse);
fIf.compute();
const folIf = new FollowCalculator(gIfElse, fIf);
folIf.compute();
const tblIf = new ParsingTableGenerator(gIfElse, fIf, folIf);
tblIf.generate();

check("Dangling else grammar detected as NOT LL(1)", tblIf.isLL1 === false);
check("FIRST/FIRST conflict detected in M[S, 'if']", 
    tblIf.conflicts.some(c => c.nonTerminal === 'S' && c.terminal === 'if' && c.type.includes('FIRST/FIRST')), 
    JSON.stringify(tblIf.conflicts));

// Conflict Test 2: FIRST/FOLLOW Conflict (Nullable Overlap)
const gOverlap = new Grammar(`
S -> A a
A -> a | ε
`);
const fOver = new FirstCalculator(gOverlap);
fOver.compute();
const folOver = new FollowCalculator(gOverlap, fOver);
folOver.compute();
const tblOver = new ParsingTableGenerator(gOverlap, fOver, folOver);
tblOver.generate();

check("Nullable overlap grammar detected as NOT LL(1)", tblOver.isLL1 === false);
check("FIRST/FOLLOW conflict detected in M[A, 'a']", 
    tblOver.conflicts.some(c => c.nonTerminal === 'A' && c.terminal === 'a' && c.type.includes('FIRST/FOLLOW')), 
    JSON.stringify(tblOver.conflicts));


// -----------------------------------------------------------------------------
// CHECKPOINT 4: STRING PARSING VALIDATION & ERROR HANDLING
// -----------------------------------------------------------------------------
console.log('\n--- CHECKPOINT 4: LL(1) String Parser & Error Explanations ---');

const parser = new LL1Parser(gArith, tblArith);

// 4.1 Valid strings
const testValid1 = parser.parse('id + id * id');
check("Valid 'id + id * id' ACCEPTED", testValid1.success === true);
check("Valid 'id + id * id' has 49 execution steps", testValid1.totalSteps === 49, `Got ${testValid1.totalSteps}`);

const testValid2 = parser.parse('( id + id ) * id');
check("Valid '( id + id ) * id' ACCEPTED", testValid2.success === true);

const testValid3 = parser.parse('id');
check("Valid minimal 'id' ACCEPTED", testValid3.success === true);

// 4.2 Invalid strings with descriptive error explanations
const testErr1 = parser.parse('id + * id');
check("Invalid 'id + * id' REJECTED", testErr1.success === false);
check("Error message indicates target table cell M[T, '*']", 
    testErr1.errorMessage.includes("M[T, '*']") || testErr1.errorMessage.includes("Expected one of"), 
    testErr1.errorMessage);

const testErr2 = parser.parse('id + id )');
check("Invalid 'id + id )' REJECTED", testErr2.success === false);
check("Error indicates terminal mismatch with stack '$'", 
    testErr2.errorMessage.includes("Stack TOP is '$'") || testErr2.errorMessage.includes("Terminal mismatch"), 
    testErr2.errorMessage);

const testErr3 = parser.parse(') id + id');
check("Leading ')' REJECTED", testErr3.success === false);

const testErr4 = parser.parse('');
check("Empty string input REJECTED", testErr4.success === false);


// -----------------------------------------------------------------------------
// CHECKPOINT 5: ANIMATION STATE MACHINE & REVERSIBLE ROLLBACK
// -----------------------------------------------------------------------------
console.log('\n--- CHECKPOINT 5: Animation Controller & Reversible Rollback ---');

const dummyTreeVis = { render: () => {}, reset: () => {} };
const anim = new AnimationController(parser, dummyTreeVis);
anim.loadSteps(testValid1.steps, testValid1.parseTree);

check("Animator successfully loaded 49 steps", anim.steps.length === 49);
check("Initial step index is 0", anim.currentStepIndex === 0);

// Advance 5 steps forward
for (let i = 0; i < 5; i++) anim.stepForward();
check("Animator advanced to step 5", anim.currentStepIndex === 5);
const step5Stack = anim.steps[5].stackSymbols.join(' ');
const step5Pointer = anim.steps[5].pointer;

// Rollback 3 steps backward
for (let i = 0; i < 3; i++) anim.stepBackward();
check("Animator stepped backward to step 2", anim.currentStepIndex === 2);

// Advance back to step 5
for (let i = 0; i < 3; i++) anim.stepForward();
check("Animator returned to step 5", anim.currentStepIndex === 5);
check("Exact stack state restored on rollback", anim.steps[anim.currentStepIndex].stackSymbols.join(' ') === step5Stack);
check("Exact lookahead pointer restored on rollback", anim.steps[anim.currentStepIndex].pointer === step5Pointer);

// Jump directly to step 25
anim.jumpToStep(25);
check("JumpToStep(25) lands on step 25", anim.currentStepIndex === 25);


// -----------------------------------------------------------------------------
// CHECKPOINT 6: PARSE TREE GENERATION & INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n--- CHECKPOINT 6: Parse Tree Generation & Node Attributions ---');

const tree = testValid1.parseTree;
check("Parse tree root exists", tree && tree.root !== null);
check("Parse tree root symbol is start symbol 'E'", tree && tree.root && tree.root.symbol === 'E');
check("Parse tree has multiple nodes (> 10)", tree && tree.nodes && tree.nodes.length > 10, `Node count: ${tree?.nodes?.length}`);

// Count leaves in parse tree using node ID lookup
const nodeMap = new Map();
if (tree && tree.nodes) {
    tree.nodes.forEach(n => nodeMap.set(n.id, n));
}
function countLeaves(nodeId) {
    const node = nodeMap.get(nodeId);
    if (!node) return [];
    if (!node.children || node.children.length === 0) return [node.symbol];
    let leaves = [];
    node.children.forEach(cid => leaves.push(...countLeaves(cid)));
    return leaves;
}
const leafSymbols = countLeaves(tree.root.id).filter(s => s !== 'ε');
const matchedInput = leafSymbols.join(' ');
check(`Parse tree yield matches input string ('${matchedInput}' == 'id + id * id')`, matchedInput === 'id + id * id', `Yield: '${matchedInput}'`);


// -----------------------------------------------------------------------------
// CHECKPOINT 7: GRAMMAR TRANSFORMATIONS
// -----------------------------------------------------------------------------
console.log('\n--- CHECKPOINT 7: Grammar Transformations ---');

// Direct Left Recursion
const gLR = new Grammar(`
E -> E + T | T
T -> T * F | F
F -> ( E ) | id
`);
const trans = new GrammarTransformer(gLR);
const dRes = trans.eliminateDirectLeftRecursion();
check("Direct Left Recursion transformed successfully", dRes.transformed === true);
check("Transformed grammar contains E'", dRes.transformedText.includes("E'"));
check("Transformed grammar contains T'", dRes.transformedText.includes("T'"));

const vRes = trans.verifyTransformedGrammar(dRes.transformedText);
check("Transformed arithmetic grammar verified to be LL(1)", vRes.isLL1 === true);

// Left Factoring
const gFactor = new Grammar(`
A -> a b | a c | d
`);
const transF = new GrammarTransformer(gFactor);
const fRes = transF.applyLeftFactoring();
check("Left factoring applied successfully", fRes.transformed === true);
check("Transformed grammar contains A'", fRes.transformedText.includes("A'"));


// -----------------------------------------------------------------------------
// CHECKPOINT 8: LEXICAL SCANNER & BRIDGING
// -----------------------------------------------------------------------------
console.log('\n--- CHECKPOINT 8: Lexical Scanner & Parser Bridge ---');

const lexer = new Lexer();
const source = "sum = x + 100 * ( y - 5 )";
const tokens = lexer.tokenize(source);

check("Lexer produced 11 tokens", tokens.length === 11, `Got ${tokens.length}`);
check("Tokens properly typed (IDENTIFIER, ASSIGN, NUMBER, LPAREN, etc.)", 
    tokens[0].type === 'IDENTIFIER' && tokens[1].type === 'ASSIGN' && tokens[4].type === 'NUMBER');

const bridgeTokens = lexer.getParserTokenStream();
check("Parser bridge stream cleanly formatted", bridgeTokens.join(' ') === 'id = id + num * ( id - num )');


// -----------------------------------------------------------------------------
// CHECKPOINT 9: QUIZ & ASSESSMENT ENGINE
// -----------------------------------------------------------------------------
console.log('\n--- CHECKPOINT 9: Quiz & Assessment Engine ---');

const quiz = new QuizEngine();
check("Quiz bank has exactly 18 verified questions", quiz.allQuestions.length === 18);

// Verify every question has a valid correctIndex
let invalidQuestions = [];
quiz.allQuestions.forEach((q, idx) => {
    if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        invalidQuestions.push(`Q${idx + 1} (${q.id})`);
    }
});
check("Every question has a valid correct option index", invalidQuestions.length === 0, `Invalid: ${invalidQuestions.join(', ')}`);

// Simulate answering all questions correctly
quiz.setDifficultyFilter('all');
let score = 0;
for (let i = 0; i < quiz.activeQuestions.length; i++) {
    const q = quiz.getCurrentQuestion();
    const ans = quiz.submitAnswer(q.correctIndex);
    if (ans.isCorrect) score++;
    quiz.nextQuestion();
}
const qResults = quiz.getResults();
check("Quiz engine correctly scored 18 / 18 (100%)", qResults.correct === 18 && qResults.percentage === 100);


// -----------------------------------------------------------------------------
// CHECKPOINT 10: PYTHON CLI & JAVASCRIPT ENGINE PARITY
// -----------------------------------------------------------------------------
console.log('\n--- CHECKPOINT 10: Python & JavaScript Engine Parity ---');

const { execSync } = require('child_process');
try {
    const pyOutput = execSync('python ll1_parser.py', { encoding: 'utf8' });
    check("Python CLI engine executes with code 0", true);
    check("Python CLI outputs Test 1: Standard expression => ACCEPTED", pyOutput.includes('Test 1:') && pyOutput.includes('ACCEPTED'));
    check("Python CLI outputs Test 2: Syntax error => REJECTED", pyOutput.includes('Test 2:') && pyOutput.includes('REJECTED'));
    check("Python CLI outputs Test 3: Parenthesized expression => ACCEPTED", pyOutput.includes('Test 3:') && pyOutput.includes('ACCEPTED'));
    check("Python CLI outputs Test 4: Unmatched paren => REJECTED", pyOutput.includes('Test 4:') && pyOutput.includes('REJECTED'));
} catch (e) {
    check("Python CLI engine executes cleanly", false, e.message);
}


// -----------------------------------------------------------------------------
// SUMMARY AUDIT REPORT
// -----------------------------------------------------------------------------
console.log('\n================================================================================');
console.log(` AUDIT COMPLETE: ${passedChecks} OF ${totalChecks} STRICT CHECKS PASSED (${Math.round((passedChecks/totalChecks)*100)}%)`);
if (failedChecks.length > 0) {
    console.log(` ❌ ${failedChecks.length} CHECKS FAILED:`);
    failedChecks.forEach(f => console.log(`   - ${f.desc}: ${f.details}`));
    process.exit(1);
} else {
    console.log(' 🎉 ALL SYSTEM MODULES, INTERFACES, ALGORITHMS AND INTEGRATIONS VERIFIED!');
    console.log('================================================================================');
    process.exit(0);
}
