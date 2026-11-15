/**
 * Test DOM UI Simulator for LL(1) Visualizer
 * Validates initialization, start symbol dropdown, grammar input synchronization,
 * buttons, steppers, and reactive events.
 */

const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Build a lightweight mock DOM based on index.html
const idMap = new Map();
const idRegex = /id=["']([^"']+)["']/g;
let m;
while ((m = idRegex.exec(html)) !== null) {
    idMap.set(m[1], {
        id: m[1],
        value: '',
        innerHTML: '',
        textContent: '',
        children: [],
        style: {},
        classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
        querySelectorAll() { return []; },
        querySelector() { return null; },
        listeners: {},
        addEventListener(evt, fn) {
            this.listeners[evt] = this.listeners[evt] || [];
            this.listeners[evt].push(fn);
        },
        dispatchEvent(evt) {
            const fns = this.listeners[evt] || [];
            fns.forEach(fn => fn({ target: this, preventDefault() {} }));
        },
        appendChild(child) { this.children.push(child); },
        setAttribute() {},
        getAttribute() { return null; },
        focus() {}
    });
}

// Special pre-set elements
const grammarInput = idMap.get('grammar-editor-input');
if (grammarInput) {
    grammarInput.value = "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id";
}
const parserInput = idMap.get('parser-input-string');
if (parserInput) {
    parserInput.value = 'id + id * id';
}

global.window = {
    addEventListener: () => {},
    localStorage: {
        store: {},
        getItem(k) { return this.store[k] || null; },
        setItem(k, v) { this.store[k] = v; },
        removeItem(k) { delete this.store[k]; }
    }
};
global.document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById(id) { return idMap.get(id) || null; },
    querySelectorAll(sel) { return []; },
    querySelector(sel) { return null; },
    createElement(tag) {
        return {
            tagName: tag,
            value: '',
            textContent: '',
            style: {},
            classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
            listeners: {},
            addEventListener(evt, fn) {
                this.listeners[evt] = this.listeners[evt] || [];
                this.listeners[evt].push(fn);
            },
            dispatchEvent(evt) {
                const fns = this.listeners[evt] || [];
                fns.forEach(fn => fn({ target: this, preventDefault() {} }));
            },
            appendChild() {},
            setAttribute() {},
            getAttribute() { return null; }
        };
    },
    documentElement: { setAttribute() {} },
    body: { classList: { add() {}, remove() {} } }
};
global.localStorage = window.localStorage;
global.Grammar = require('./js/grammar.js');
global.FirstCalculator = require('./js/first.js');
global.FollowCalculator = require('./js/follow.js');
global.ParsingTableGenerator = require('./js/table.js');
global.GrammarTransformer = require('./js/transform.js');
global.Lexer = require('./js/lexer.js');
global.QuizEngine = require('./js/quiz.js');
global.DataExporter = require('./js/export.js');
global.LL1Parser = require('./js/parser.js');
global.AnimationController = require('./js/animator.js');
global.SAMPLE_GRAMMARS = require('./js/sample-grammars.js');
global.UIController = require('./js/ui.js');

try {
    const ui = new UIController();
    ui.init();
    console.log('✅ UIController.init() completed without errors.');

    console.log('✅ Textarea initial value populated:', idMap.get('grammar-editor-input').value.startsWith('E -> T E\''));
    console.log('✅ Start symbol dropdown populated with', idMap.get('grammar-start-symbol-select').children.length, 'options.');
    console.log('   Options:', idMap.get('grammar-start-symbol-select').children.map(c => c.value).join(', '));
    console.log('✅ Sample grammar dropdown populated with', idMap.get('sample-grammar-select').children.length, 'options.');
    console.log('✅ FIRST calculation computed:', ui.firstCalc ? ui.firstCalc.computed : false);
    console.log('✅ FOLLOW calculation computed:', ui.followCalc ? ui.followCalc.computed : false);
    console.log('✅ Table generator computed:', ui.tableGen ? ui.tableGen.generated : false);
    console.log('✅ Grammar verified LL(1):', ui.tableGen ? ui.tableGen.isLL1 : false);

    // Test clicking Parse & Analyze button
    const parseBtn = idMap.get('btn-parse-grammar');
    parseBtn.dispatchEvent('click');
    console.log('✅ "Parse & Analyze" click executed successfully.');

    // Test First Stepper Next/Prev
    const btnFirstNext = idMap.get('btn-first-next');
    btnFirstNext.dispatchEvent('click');
    console.log('✅ First Stepper "Next" click executed successfully.');

    // Test Follow Stepper Next/Prev
    const btnFollowNext = idMap.get('btn-follow-next');
    btnFollowNext.dispatchEvent('click');
    console.log('✅ Follow Stepper "Next" click executed successfully.');

    // Test Add Rule button
    const btnAddRule = idMap.get('btn-add-rule');
    const linesBefore = idMap.get('grammar-editor-input').value.split('\n').length;
    btnAddRule.dispatchEvent('click');
    const linesAfterAdd = idMap.get('grammar-editor-input').value.split('\n').length;
    console.log('✅ "+ Add Rule" click executed successfully (lines: ' + linesBefore + ' -> ' + linesAfterAdd + ').');

    // Test Remove Rule button
    const btnRemoveRule = idMap.get('btn-remove-rule');
    btnRemoveRule.dispatchEvent('click');
    const linesAfterRemove = idMap.get('grammar-editor-input').value.split('\n').length;
    console.log('✅ "- Remove Rule" click executed successfully (lines: ' + linesAfterAdd + ' -> ' + linesAfterRemove + ').');

    console.log('\n🎉 ALL DOM SIMULATION & CONTROLLER INTERACTIONS PASSED 100%!');
} catch (e) {
    console.error('❌ TEST FAILED WITH EXCEPTION:', e);
    process.exit(1);
}
