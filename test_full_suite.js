/**
 * Comprehensive Integration & Verification Test Suite for LL(1) Visualizer
 */

const Grammar = require('./js/grammar.js');
const FirstCalculator = require('./js/first.js');
const FollowCalculator = require('./js/follow.js');
const ParsingTableGenerator = require('./js/table.js');
const GrammarTransformer = require('./js/transform.js');
const Lexer = require('./js/lexer.js');
const QuizEngine = require('./js/quiz.js');
const DataExporter = require('./js/export.js');
const LL1Parser = require('./js/parser.js');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        throw new Error(`Assertion failed: ${message}`);
    }
}

console.log('================================================================================');
console.log('       FULL SUITE INTEGRATION & PEDAGOGICAL VERIFICATION       ');
console.log('================================================================================');

// 1. Core Grammar, FIRST & FOLLOW
console.log('\n--- 1. Testing Grammar, FIRST & FOLLOW Fixed-Point Steppers ---');
const g1Text = `
E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> ( E ) | id
`;
const g1 = new Grammar(g1Text);
assert(g1.nonTerminals.length === 5, '5 Non-terminals identified in arithmetic grammar');
assert(g1.terminals.length === 5, '5 Terminals identified (+, *, (, ), id)');

const first1 = new FirstCalculator(g1);
first1.compute();
assert(first1.sets.get('E').has('id') && first1.sets.get('E').has('('), 'FIRST(E) contains id and (');
assert(first1.stepByStepLog.length > 0, `FIRST step-by-step log recorded (${first1.stepByStepLog.length} steps)`);
assert(first1.iterationHistory.length > 0, `FIRST fixed-point iteration history recorded (${first1.iterationHistory.length} iterations)`);

const follow1 = new FollowCalculator(g1, first1);
follow1.compute();
assert(follow1.sets.get('E').has('$') && follow1.sets.get('E').has(')'), 'FOLLOW(E) contains $ and )');
assert(follow1.stepByStepLog.length > 0, `FOLLOW step-by-step log recorded (${follow1.stepByStepLog.length} steps)`);
assert(follow1.iterationHistory.length > 0, `FOLLOW fixed-point iteration history recorded (${follow1.iterationHistory.length} iterations)`);

const table1 = new ParsingTableGenerator(g1, first1, follow1);
table1.generate();
assert(table1.isLL1 === true, 'Arithmetic grammar is LL(1)');
assert(table1.conflicts.length === 0, 'Zero conflicts in arithmetic parsing table');

// 2. Grammar Transformations
console.log('\n--- 2. Testing Grammar Transformations ---');
const lrText = `
E -> E + T | T
T -> T * F | F
F -> ( E ) | id
`;
const lrGrammar = new Grammar(lrText);
const transformer = new GrammarTransformer(lrGrammar);
const directLrRes = transformer.eliminateDirectLeftRecursion();
assert(directLrRes.changed === true, 'Direct Left Recursion detected and eliminated');
assert(directLrRes.steps.length > 0, 'Transformation steps generated for direct left recursion');

const verification = transformer.verifyTransformedGrammar();
assert(verification.isLL1 === true, 'Transformed grammar verified to be LL(1) compatible');

// Left Factoring
const lfText = `
S -> if E then S else S | if E then S | a
E -> b
`;
const lfGrammar = new Grammar(lfText);
const lfTransformer = new GrammarTransformer(lfGrammar);
const lfRes = lfTransformer.applyLeftFactoring();
assert(lfRes.changed === true, 'Left Factoring successfully applied to common prefix');
assert(lfRes.transformedGrammar.includes("S'"), "New non-terminal S' introduced during left factoring");

// 3. Lexical Scanner
console.log('\n--- 3. Testing Lexical Scanner (Phase 1) ---');
const lexer = new Lexer();
const sampleCode = "total = a + 25 * b";
const tokens = lexer.tokenize(sampleCode);
assert(tokens.length === 7, `Lexer produced 7 tokens for expression (got ${tokens.length})`);
assert(tokens[0].type === 'IDENTIFIER' && tokens[0].lexeme === 'total', 'First token is IDENTIFIER(total)');
assert(tokens[1].type === 'ASSIGN' && tokens[1].lexeme === '=', 'Second token is ASSIGN(=)');
assert(tokens[4].type === 'NUMBER' && tokens[4].lexeme === '25', 'Fifth token is NUMBER(25)');

const parserTokens = lexer.getParserTokenStream();
assert(parserTokens.join(' ') === 'id = id + num * id', 'Tokens cleanly mapped to parser terminals (id = id + num * id)');

// Lexical Error handling
const errorLexer = new Lexer();
errorLexer.tokenize("x = 5 @ y");
assert(errorLexer.errors.length === 1, 'Lexer properly reported unrecognized character @');
assert(errorLexer.errors[0].char === '@', 'Error character captured correctly');

// 4. Practice & Assessment (Quiz Engine)
console.log('\n--- 4. Testing Practice & Assessment Quiz Engine ---');
const quiz = new QuizEngine();
assert(quiz.allQuestions.length === 18, `All 18 verified compiler questions loaded (got ${quiz.allQuestions.length})`);

quiz.setDifficultyFilter('beginner');
assert(quiz.activeQuestions.length === 7, `Beginner filter has 7 questions (got ${quiz.activeQuestions.length})`);

quiz.setDifficultyFilter('all');
const q1 = quiz.getCurrentQuestion();
const q1Correct = q1.correctIndex;
const subRes = quiz.submitAnswer(q1Correct);
assert(subRes.isCorrect === true, 'Correct quiz answer verified algorithmically');
assert(quiz.score === 1, 'Quiz score incremented on correct answer');

// 5. Data Exporter
console.log('\n--- 5. Testing Data Exporter ---');
const tableCSV = DataExporter.generateTableCSV(table1, g1);
assert(tableCSV.includes('Non-Terminal'), 'Parsing Table CSV header generated correctly');
assert(tableCSV.includes('"E"'), 'Parsing Table CSV contains rows for non-terminals');

const dummySteps = [
    { stackSymbols: ['$', 'E'], inputTokens: ['id', '$'], pointer: 0, production: "E -> T E'", actionType: 'PREDICT', explanation: 'Expand E' },
    { stackSymbols: ['$', 'E\'', 'T'], inputTokens: ['id', '$'], pointer: 0, production: "T -> F T'", actionType: 'PREDICT', explanation: 'Expand T' }
];
const traceCSV = DataExporter.generateTraceCSV(dummySteps);
assert(traceCSV.includes('Step') && traceCSV.includes('Stack'), 'Trace CSV header generated correctly');

const grammarTXT = DataExporter.generateGrammarTXT(g1);
assert(grammarTXT.includes('NON-TERMINALS:'), 'Grammar TXT includes summary headers');

const setsJSON = DataExporter.generateSetsJSON(first1, follow1, g1);
const parsedJSON = JSON.parse(setsJSON);
assert(parsedJSON.firstSets && parsedJSON.followSets, 'JSON sets contain both FIRST and FOLLOW');

const reportHTML = DataExporter.generateReportHTML(g1, table1, first1, follow1, dummySteps, 'id + id * id');
assert(reportHTML.includes('LL(1) Predictive Parser Analysis Report'), 'Printable PDF/HTML report contains title and layout');

// 6. LL(1) Parser String Simulation Benchmarks
console.log('\n--- 6. Testing Parser Execution & Safety Limits ---');
const parser = new LL1Parser(g1, table1);

const res1 = parser.parse('id + id * id');
assert(res1.success === true, 'Valid string "id + id * id" ACCEPTED');

const res2 = parser.parse('id + * id');
assert(res2.success === false, 'Invalid string "id + * id" REJECTED');
assert(res2.errorMessage.includes('M[T, \'*\']'), 'Detailed diagnostic specifies target table cell in error message');

const res3 = parser.parse('( id + id ) * id');
assert(res3.success === true, 'Valid string "( id + id ) * id" ACCEPTED');

const res4 = parser.parse('id + id )');
assert(res4.success === false, 'Mismatched parenthesis "id + id )" REJECTED');

console.log('================================================================================');
console.log(`🎉 ALL ${passedTests} OF ${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
console.log('================================================================================');
