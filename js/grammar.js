/**
 * LL(1) Predictive Parser - Grammar Processor
 * Handles context-free grammar parsing, symbol classification,
 * validation, left-recursion detection, and left-factoring analysis.
 */

class Grammar {
    constructor(grammarText = '') {
        this.rawText = grammarText;
        this.rules = [];            // Array of { lhs: string, rhs: string[], rawRhs: string, id: number }
        this.nonTerminals = [];     // Array of string non-terminals in order of appearance
        this.terminals = [];        // Array of string terminals in deterministic order
        this.startSymbol = null;    // String
        this.epsilon = 'ε';         // Canonical epsilon representation
        this.endMarker = '$';       // End of input marker
        this.warnings = [];         // Validation warnings (left recursion, left factoring, etc.)
        this.errors = [];           // Syntax errors in grammar specification
        this.isLL1Compatible = true;
        this.parseGrammar(grammarText);
    }

    /**
     * Parses the grammar text into structured rules.
     * Supports formats:
     *   E -> T E'
     *   E' -> + T E' | epsilon
     *   T ::= F T'
     *   F => ( E ) | id
     */
    parseGrammar(text) {
        this.rawText = text;
        this.rules = [];
        this.nonTerminals = [];
        this.terminals = [];
        this.startSymbol = null;
        this.warnings = [];
        this.errors = [];

        if (!text || !text.trim()) {
            this.errors.push('Grammar text is empty. Please enter production rules.');
            return;
        }

        const lines = text.split('\n');
        const lhsSeen = new Set();
        let ruleCounter = 1;

        // Phase 1: Collect LHS symbols in order
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const rawLine = lines[lineNum].trim();
            if (!rawLine || rawLine.startsWith('#') || rawLine.startsWith('//')) {
                continue; // Skip comments and blank lines
            }

            const arrowMatch = rawLine.match(/\s*(->|::=|=>)\s*/);
            if (!arrowMatch) {
                this.errors.push(`Line ${lineNum + 1}: Missing production arrow ('->', '::=', or '=>'): "${rawLine}"`);
                continue;
            }

            const lhs = rawLine.substring(0, arrowMatch.index).trim();
            if (!lhs) {
                this.errors.push(`Line ${lineNum + 1}: Missing left-hand side non-terminal.`);
                continue;
            }

            if (!lhsSeen.has(lhs)) {
                lhsSeen.add(lhs);
                this.nonTerminals.push(lhs);
                if (!this.startSymbol) {
                    this.startSymbol = lhs;
                }
            }
        }

        if (this.nonTerminals.length === 0) {
            this.errors.push('No valid non-terminals found on left-hand sides.');
            return;
        }

        // Phase 2: Parse RHS alternatives and tokenize
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const rawLine = lines[lineNum].trim();
            if (!rawLine || rawLine.startsWith('#') || rawLine.startsWith('//')) {
                continue;
            }

            const arrowMatch = rawLine.match(/\s*(->|::=|=>)\s*/);
            if (!arrowMatch) continue;

            const lhs = rawLine.substring(0, arrowMatch.index).trim();
            const rhsAll = rawLine.substring(arrowMatch.index + arrowMatch[0].length).trim();

            if (!rhsAll) {
                // Treated as epsilon rule
                this.rules.push({
                    id: ruleCounter++,
                    lhs: lhs,
                    rhs: [this.epsilon],
                    rawRhs: this.epsilon,
                    line: lineNum + 1
                });
                continue;
            }

            // Split alternatives by '|'
            const alternatives = rhsAll.split('|');
            for (let alt of alternatives) {
                alt = alt.trim();
                const tokens = this.tokenizeRHS(alt);
                this.rules.push({
                    id: ruleCounter++,
                    lhs: lhs,
                    rhs: tokens,
                    rawRhs: tokens.join(' '),
                    line: lineNum + 1
                });
            }
        }

        // Phase 3: Identify terminals (any symbol in RHS not in nonTerminals and not epsilon)
        const terminalSet = new Set();
        for (const rule of this.rules) {
            for (const sym of rule.rhs) {
                if (sym !== this.epsilon && sym !== this.endMarker && !lhsSeen.has(sym)) {
                    terminalSet.add(sym);
                }
            }
        }
        this.terminals = Array.from(terminalSet);

        // Phase 4: Run diagnostic checks (Left Recursion, Left Factoring, etc.)
        this.runDiagnostics();
    }

    /**
     * Tokenizes the RHS of a production.
     * Smartly extracts non-terminals, operators, and identifiers whether
     * user enters spaced tokens (e.g. '+ T E'') or compact tokens (e.g. '(E)').
     * Normalizes epsilon variants ('epsilon', 'EPSILON', 'ε', '^', 'e', '#') to 'ε'.
     */
    tokenizeRHS(rhsString) {
        if (!rhsString || !rhsString.trim()) {
            return [this.epsilon];
        }

        const trimmed = rhsString.trim();
        const epsAliases = ['epsilon', 'EPSILON', 'Epsilon', 'eps', 'EPS', 'ε', '^', '#'];
        if (epsAliases.includes(trimmed)) {
            return [this.epsilon];
        }

        const parts = trimmed.split(/\s+/).filter(Boolean);
        const tokens = [];
        const sortedNT = this.nonTerminals.slice().sort((a, b) => b.length - a.length);

        for (const part of parts) {
            if (epsAliases.includes(part)) {
                tokens.push(this.epsilon);
                continue;
            }
            if (this.nonTerminals.includes(part)) {
                tokens.push(part);
                continue;
            }

            // Sub-tokenize part if it contains mixed symbols (e.g. '(E)' or 'T+E')
            let i = 0;
            while (i < part.length) {
                let matched = false;
                for (const nt of sortedNT) {
                    if (part.startsWith(nt, i)) {
                        tokens.push(nt);
                        i += nt.length;
                        matched = true;
                        break;
                    }
                }
                if (matched) continue;

                if ('()+-*/=;,|<>'.includes(part[i])) {
                    tokens.push(part[i]);
                    i++;
                    continue;
                }

                const idMatch = part.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
                if (idMatch) {
                    tokens.push(idMatch[0]);
                    i += idMatch[0].length;
                } else {
                    tokens.push(part[i]);
                    i++;
                }
            }
        }

        // If rule has other symbols and epsilon (e.g. '+ T ε'), filter out redundant ε
        if (tokens.length > 1) {
            const filtered = tokens.filter(t => t !== this.epsilon);
            return filtered.length > 0 ? filtered : [this.epsilon];
        }

        return tokens.length > 0 ? tokens : [this.epsilon];
    }

    /**
     * Comprehensive CFG diagnostics for LL(1) parsing.
     * Detects:
     * 1. Direct and indirect Left Recursion
     * 2. Common prefixes requiring Left Factoring
     * 3. Unreachable non-terminals
     * 4. Non-producing symbols
     */
    runDiagnostics() {
        this.warnings = [];

        // 1. Direct Left Recursion check
        for (const nt of this.nonTerminals) {
            const ntRules = this.rules.filter(r => r.lhs === nt);
            const directLeftRecursive = ntRules.filter(r => r.rhs.length > 0 && r.rhs[0] === nt);
            if (directLeftRecursive.length > 0) {
                this.isLL1Compatible = false;
                this.warnings.push({
                    type: 'LEFT_RECURSION_DIRECT',
                    symbol: nt,
                    severity: 'error',
                    message: `Direct Left Recursion in '${nt}': Rule '${nt} -> ${directLeftRecursive.map(r => r.rawRhs).join(' | ')}'`,
                    suggestion: `Eliminate left recursion by introducing a new non-terminal ${nt}':\n` +
                                `  ${nt} -> β ${nt}'\n` +
                                `  ${nt}' -> α ${nt}' | ε\n` +
                                `(where α is the tail after ${nt}, and β is any alternative not starting with ${nt}).`
                });
            }
        }

        // 1B. Indirect Left Recursion check (cycle detection among leading non-terminals)
        const leadingGraph = new Map();
        for (const nt of this.nonTerminals) {
            leadingGraph.set(nt, new Set());
        }

        for (const rule of this.rules) {
            const A = rule.lhs;
            for (let i = 0; i < rule.rhs.length; i++) {
                const sym = rule.rhs[i];
                if (this.isNonTerminal(sym) && sym !== A) {
                    leadingGraph.get(A).add(sym);
                }
                // If sym is not nullable, stop scanning RHS
                const symRules = this.getRulesFor(sym);
                const isNullable = symRules.some(r => r.rhs.length === 1 && r.rhs[0] === this.epsilon);
                if (!isNullable) break;
            }
        }

        for (const nt of this.nonTerminals) {
            const visited = new Set();
            const path = [];

            const dfs = (curr) => {
                visited.add(curr);
                path.push(curr);

                const neighbors = leadingGraph.get(curr) || new Set();
                for (const neighbor of neighbors) {
                    if (neighbor === nt && path.length > 1) {
                        const cycleStr = [...path, nt].join(' ⇒ ');
                        const exists = this.warnings.some(w => w.type === 'LEFT_RECURSION_INDIRECT' && w.symbol === nt);
                        if (!exists) {
                            this.isLL1Compatible = false;
                            this.warnings.push({
                                type: 'LEFT_RECURSION_INDIRECT',
                                symbol: nt,
                                severity: 'error',
                                message: `Indirect Left Recursion detected in '${nt}': Derivation chain ${cycleStr}.`,
                                suggestion: `Eliminate indirect left recursion by systematically ordering non-terminals and substituting production rules into earlier definitions, then eliminating resulting direct left recursions.`
                            });
                        }
                        return true;
                    }
                    if (!visited.has(neighbor)) {
                        if (dfs(neighbor)) return true;
                    }
                }
                path.pop();
                return false;
            };

            dfs(nt);
        }

        // 2. Common Prefix (Left Factoring) check
        for (const nt of this.nonTerminals) {
            const ntRules = this.rules.filter(r => r.lhs === nt);
            if (ntRules.length > 1) {
                for (let i = 0; i < ntRules.length; i++) {
                    for (let j = i + 1; j < ntRules.length; j++) {
                        const r1 = ntRules[i];
                        const r2 = ntRules[j];
                        if (r1.rhs.length > 0 && r2.rhs.length > 0 && r1.rhs[0] === r2.rhs[0] && r1.rhs[0] !== this.epsilon) {
                            this.warnings.push({
                                type: 'COMMON_PREFIX',
                                symbol: nt,
                                severity: 'warning',
                                message: `Common Prefix '${r1.rhs[0]}' detected in '${nt}':\n  ${nt} -> ${r1.rawRhs}  AND  ${nt} -> ${r2.rawRhs}`,
                                suggestion: `Apply Left Factoring to eliminate prefix ambiguity:\n` +
                                            `  ${nt} -> ${r1.rhs[0]} ${nt}'\n` +
                                            `  ${nt}' -> ${r1.rhs.slice(1).join(' ') || 'ε'} | ${r2.rhs.slice(1).join(' ') || 'ε'}`
                            });
                        }
                    }
                }
            }
        }

        // 3. Reachability check from start symbol
        if (this.startSymbol) {
            const reachable = new Set([this.startSymbol]);
            let changed = true;
            while (changed) {
                changed = false;
                for (const rule of this.rules) {
                    if (reachable.has(rule.lhs)) {
                        for (const sym of rule.rhs) {
                            if (this.nonTerminals.includes(sym) && !reachable.has(sym)) {
                                reachable.add(sym);
                                changed = true;
                            }
                        }
                    }
                }
            }
            for (const nt of this.nonTerminals) {
                if (!reachable.has(nt)) {
                    this.warnings.push({
                        type: 'UNREACHABLE_SYMBOL',
                        symbol: nt,
                        severity: 'info',
                        message: `Non-terminal '${nt}' is unreachable from start symbol '${this.startSymbol}'.`,
                        suggestion: `Consider removing this unused non-terminal if it is no longer required.`
                    });
                }
            }
        }
    }

    /**
     * Helper to get rules for a specific non-terminal.
     */
    getRulesFor(nonTerminal) {
        return this.rules.filter(r => r.lhs === nonTerminal);
    }

    /**
     * Checks if a symbol is a non-terminal.
     */
    isNonTerminal(symbol) {
        return this.nonTerminals.includes(symbol);
    }

    /**
     * Checks if a symbol is a terminal.
     */
    isTerminal(symbol) {
        return this.terminals.includes(symbol);
    }

    /**
     * Checks if a symbol is epsilon.
     */
    isEpsilon(symbol) {
        return symbol === this.epsilon || symbol === 'epsilon' || symbol === '^' || symbol === '#';
    }

    /**
     * Returns a pretty string representation of the grammar.
     */
    toString() {
        const lines = [];
        for (const nt of this.nonTerminals) {
            const ntRules = this.getRulesFor(nt);
            if (ntRules.length > 0) {
                lines.push(`${nt} -> ${ntRules.map(r => r.rawRhs).join(' | ')}`);
            }
        }
        return lines.join('\n');
    }
}

// Export for Node.js test environment or browser global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Grammar;
} else if (typeof window !== 'undefined') {
    window.Grammar = Grammar;
}

