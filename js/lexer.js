/**
 * LL(1) Predictive Parser - Lexical Analysis (Scanner) Module
 * Demonstrates the front-end lexical phase of a compiler:
 * Converts raw source code into a discrete token stream with exact line/column tracking,
 * reports lexical errors with character positions, and bridges to the LL(1) parser.
 */

class Lexer {
    constructor() {
        this.tokens = [];
        this.errors = [];
    }

    /**
     * Tokenizes a raw source code string.
     * @param {string} sourceCode - Raw code e.g. "total = a + 25 * b"
     * @returns {Object} { tokens, errors, tokenString, formattedList }
     */
    tokenize(sourceCode) {
        this.tokens = [];
        this.errors = [];

        const input = sourceCode || '';
        let index = 0;
        let line = 1;
        let col = 1;

        while (index < input.length) {
            const ch = input[index];

            // 1. Whitespace handling
            if (ch === '\n') {
                line++;
                col = 1;
                index++;
                continue;
            }
            if (/\s/.test(ch)) {
                index++;
                col++;
                continue;
            }

            // 2. Comments handling (// single-line)
            if (ch === '/' && index + 1 < input.length && input[index + 1] === '/') {
                while (index < input.length && input[index] !== '\n') {
                    index++;
                }
                continue;
            }

            // 3. Multi-character operators
            if (index + 1 < input.length) {
                const twoChar = input.slice(index, index + 2);
                if (['==', '!=', '<=', '>=', '&&', '||'].includes(twoChar)) {
                    this.tokens.push({
                        type: this.getOpType(twoChar),
                        lexeme: twoChar,
                        line,
                        startCol: col,
                        endCol: col + 1,
                        mappedTerminal: twoChar
                    });
                    index += 2;
                    col += 2;
                    continue;
                }
            }

            // 4. Single-character operators & delimiters
            const singleOps = {
                '+': { type: 'PLUS', term: '+' },
                '-': { type: 'MINUS', term: '-' },
                '*': { type: 'MULTIPLY', term: '*' },
                '/': { type: 'DIVIDE', term: '/' },
                '%': { type: 'MODULO', term: '%' },
                '^': { type: 'POWER', term: '^' },
                '=': { type: 'ASSIGN', term: '=' },
                '(': { type: 'LPAREN', term: '(' },
                ')': { type: 'RPAREN', term: ')' },
                ';': { type: 'SEMICOLON', term: ';' },
                ',': { type: 'COMMA', term: ',' },
                '<': { type: 'LESS_THAN', term: '<' },
                '>': { type: 'GREATER_THAN', term: '>' }
            };

            if (singleOps[ch]) {
                const opInfo = singleOps[ch];
                this.tokens.push({
                    type: opInfo.type,
                    lexeme: ch,
                    line,
                    startCol: col,
                    endCol: col,
                    mappedTerminal: opInfo.term
                });
                index++;
                col++;
                continue;
            }

            // 5. Numeric Literals (e.g. 25, 3.1415)
            if (/\d/.test(ch)) {
                let start = index;
                let startCol = col;
                let hasDecimal = false;

                while (index < input.length && (/\d/.test(input[index]) || input[index] === '.')) {
                    if (input[index] === '.') {
                        if (hasDecimal) break; // Second dot is not part of number
                        hasDecimal = true;
                    }
                    index++;
                    col++;
                }

                const numLexeme = input.slice(start, index);
                this.tokens.push({
                    type: 'NUMBER',
                    lexeme: numLexeme,
                    line,
                    startCol,
                    endCol: col - 1,
                    mappedTerminal: 'num'
                });
                continue;
            }

            // 6. Identifiers and Keywords
            if (/[a-zA-Z_]/.test(ch)) {
                let start = index;
                let startCol = col;

                while (index < input.length && /[a-zA-Z0-9_']/.test(input[index])) {
                    index++;
                    col++;
                }

                const word = input.slice(start, index);
                const keywords = {
                    'if': 'KEYWORD_IF',
                    'then': 'KEYWORD_THEN',
                    'else': 'KEYWORD_ELSE',
                    'while': 'KEYWORD_WHILE',
                    'true': 'BOOLEAN_TRUE',
                    'false': 'BOOLEAN_FALSE',
                    'and': 'OP_AND',
                    'or': 'OP_OR',
                    'not': 'OP_NOT'
                };

                const type = keywords[word] || 'IDENTIFIER';
                // If it's a keyword, use word itself as terminal; otherwise map identifier to 'id'
                const mappedTerminal = keywords[word] ? word : 'id';

                this.tokens.push({
                    type,
                    lexeme: word,
                    line,
                    startCol,
                    endCol: col - 1,
                    mappedTerminal
                });
                continue;
            }

            // 7. Lexical Error: Unexpected character
            this.errors.push({
                character: ch,
                char: ch,
                line,
                col,
                column: col,
                message: `Lexical Error: Unexpected or unrecognized character '${ch}' at Line ${line}, Col ${col}.`
            });

            this.tokens.push({
                type: 'ERROR_TOKEN',
                lexeme: ch,
                line,
                startCol: col,
                endCol: col,
                columnStart: col,
                columnEnd: col,
                mappedTerminal: ch,
                isError: true
            });

            index++;
            col++;
        }

        const formattedList = this.tokens.map(t => `${t.type}(${t.lexeme})`).join('\n');
        const tokenString = this.tokens.filter(t => !t.isError).map(t => t.mappedTerminal).join(' ');

        const result = [...this.tokens];
        result.tokens = this.tokens;
        result.errors = this.errors;
        result.formattedList = formattedList;
        result.tokenString = tokenString;
        result.totalTokens = this.tokens.length;
        result.errorCount = this.errors.length;

        return result;
    }

    getOpType(twoChar) {
        const map = {
            '==': 'EQUAL_EQUAL',
            '!=': 'NOT_EQUAL',
            '<=': 'LESS_EQUAL',
            '>=': 'GREATER_EQUAL',
            '&&': 'LOGICAL_AND',
            '||': 'LOGICAL_OR'
        };
        return map[twoChar] || 'OPERATOR';
    }

    /**
     * Returns an array of mapped terminals suitable for feeding directly into the LL(1) parser.
     */
    getParserTokenStream() {
        return this.tokens.filter(t => !t.isError).map(t => t.mappedTerminal);
    }
}

// Export for Node.js test environment or browser global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Lexer;
} else if (typeof window !== 'undefined') {
    window.Lexer = Lexer;
}
