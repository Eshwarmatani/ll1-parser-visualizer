/**
 * LL(1) Predictive Parser - Sample Educational Grammars
 * Comprehensive collection of grammars covering standard arithmetic,
 * conflict scenarios, left-recursion, and left-factoring edge cases.
 */

const SAMPLE_GRAMMARS = {
    expression: {
        id: 'expression',
        title: '1. Classic Arithmetic Expressions (LL(1))',
        category: 'Standard LL(1)',
        description: 'Standard unambiguous grammar with left recursion eliminated. Handles operator precedence (* over +) and parentheses.',
        grammar: `E  -> T E'
E' -> + T E' | ε
T  -> F T'
T' -> * F T' | ε
F  -> ( E ) | id`,
        defaultInput: 'id + id * id',
        testInputs: [
            { text: 'id + id * id', expected: true, label: 'Standard multiplication & addition' },
            { text: '( id + id ) * id', expected: true, label: 'Parenthesized expression' },
            { text: 'id + * id', expected: false, label: 'Operator syntax error (+ *)' },
            { text: 'id + id )', expected: false, label: 'Unmatched closing parenthesis' },
            { text: 'id', expected: true, label: 'Single identifier' },
            { text: '( ( id ) )', expected: true, label: 'Nested parentheses' }
        ]
    },

    assignment: {
        id: 'assignment',
        title: '2. Simple Assignment Statements (LL(1))',
        category: 'Standard LL(1)',
        description: 'Models programming language assignment statements with identifier assignments and semicolon termination.',
        grammar: `S -> id = E ;
E -> T E'
E' -> + T E' | - T E' | ε
T -> id | num`,
        defaultInput: 'id = id + num ;',
        testInputs: [
            { text: 'id = id + num ;', expected: true, label: 'Valid assignment with addition' },
            { text: 'id = num ;', expected: true, label: 'Simple literal assignment' },
            { text: 'id = ;', expected: false, label: 'Missing expression' },
            { text: 'id = id + num', expected: false, label: 'Missing closing semicolon' }
        ]
    },

    boolean_logic: {
        id: 'boolean_logic',
        title: '3. Boolean Logic Expressions (LL(1))',
        category: 'Standard LL(1)',
        description: 'Evaluates boolean predicates with precedence: NOT > AND > OR, plus boolean constants.',
        grammar: `B  -> T B'
B' -> or T B' | ε
T  -> F T'
T' -> and F T' | ε
F  -> not F | ( B ) | true | false`,
        defaultInput: 'true and not false or true',
        testInputs: [
            { text: 'true and not false or true', expected: true, label: 'Mixed boolean operators' },
            { text: '( true or false ) and true', expected: true, label: 'Parenthesized condition' },
            { text: 'true and and false', expected: false, label: 'Double AND syntax error' }
        ]
    },

    common_prefix: {
        id: 'common_prefix',
        title: '4. Common Prefix / Left Factoring (Non-LL(1))',
        category: 'Conflict Showcase',
        description: 'Shows FIRST/FIRST conflict arising from the dangling-else and common prefix in conditional statements.',
        grammar: `S -> if E then S | if E then S else S | a
E -> b`,
        defaultInput: 'if b then a else a',
        testInputs: [
            { text: 'if b then a else a', expected: false, label: 'Ambiguous branching' },
            { text: 'a', expected: true, label: 'Simple statement' }
        ]
    },

    left_recursive: {
        id: 'left_recursive',
        title: '5. Direct Left-Recursive Grammar (Non-LL(1))',
        category: 'Conflict Showcase',
        description: 'Classic textbook grammar with direct left recursion. Generates parsing table conflicts and parser warnings.',
        grammar: `E -> E + T | T
T -> T * F | F
F -> ( E ) | id`,
        defaultInput: 'id + id',
        testInputs: [
            { text: 'id + id', expected: false, label: 'Triggers left recursion loop/conflict' }
        ]
    },

    balanced_parens: {
        id: 'balanced_parens',
        title: '6. Parentheses Nesting (LL(1))',
        category: 'Standard LL(1)',
        description: 'Models properly matched nested parentheses using an epsilon-nullable rule.',
        grammar: `S -> ( S ) S | ε`,
        defaultInput: '( ( ) ) ( )',
        testInputs: [
            { text: '( ( ) ) ( )', expected: true, label: 'Well-nested parentheses' },
            { text: '( ( )', expected: false, label: 'Unclosed open parenthesis' }
        ]
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SAMPLE_GRAMMARS;
} else if (typeof window !== 'undefined') {
    window.SAMPLE_GRAMMARS = SAMPLE_GRAMMARS;
}

