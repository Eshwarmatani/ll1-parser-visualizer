/**
 * LL(1) Predictive Parser - Parsing Table Generator
 * Constructs the M[NonTerminal, Terminal] matrix.
 * Identifies FIRST/FIRST and FIRST/FOLLOW conflicts, assesses LL(1) compliance,
 * and provides clear diagnostic feedback and construction audit logs.
 */

class ParsingTableGenerator {
    constructor(grammar, firstCalculator, followCalculator) {
        this.grammar = grammar;
        this.firstCalculator = firstCalculator;
        this.followCalculator = followCalculator;
        this.table = {};               // { [nt: string]: { [terminal: string]: Array<rule> } }
        this.conflicts = [];           // Array of conflict descriptors
        this.constructionSteps = [];   // Log of each entry inserted into M[A, a]
        this.isLL1 = true;
        this.terminalsWithDollar = []; // All grammar terminals + '$'
    }

    /**
     * Constructs the LL(1) parsing table.
     */
    generate() {
        this.table = {};
        this.conflicts = [];
        this.constructionSteps = [];
        this.isLL1 = true;

        // Ensure FIRST and FOLLOW sets are fresh
        if (!this.firstCalculator.computed) this.firstCalculator.compute();
        if (!this.followCalculator.computed) this.followCalculator.compute();

        // Terminal columns: sorted terminals + '$' at the end
        this.terminalsWithDollar = [...this.grammar.terminals.slice().sort(), this.grammar.endMarker];

        // Initialize empty rows for each non-terminal
        for (const nt of this.grammar.nonTerminals) {
            this.table[nt] = {};
            for (const t of this.terminalsWithDollar) {
                this.table[nt][t] = [];
            }
        }

        // Apply LL(1) Table Construction Rules for each production A -> α
        for (const rule of this.grammar.rules) {
            const A = rule.lhs;
            const alpha = rule.rhs;
            const firstAlpha = this.firstCalculator.computeForSequence(alpha);

            // Rule 1: For each terminal 'a' in FIRST(α), add A -> α to M[A, a]
            for (const a of firstAlpha) {
                if (a !== this.grammar.epsilon) {
                    this.addEntry(A, a, rule, 'Rule 1: a ∈ FIRST(α)', `Because '${a}' is in FIRST(${rule.rawRhs})`);
                }
            }

            // Rule 2: If ε is in FIRST(α), then for each terminal 'b' in FOLLOW(A), add A -> α to M[A, b]
            if (firstAlpha.has(this.grammar.epsilon)) {
                const followA = this.followCalculator.sets.get(A) || new Set();
                for (const b of followA) {
                    this.addEntry(
                        A,
                        b,
                        rule,
                        'Rule 2: ε ∈ FIRST(α) & b ∈ FOLLOW(A)',
                        `Because '${rule.rawRhs}' derives ε and '${b}' is in FOLLOW(${A})`
                    );
                }
            }
        }

        // Assess conflicts across all table cells
        for (const nt of this.grammar.nonTerminals) {
            for (const t of this.terminalsWithDollar) {
                const entries = this.table[nt][t];
                if (entries.length > 1) {
                    this.isLL1 = false;
                    const conflictType = this.classifyConflict(nt, t, entries);
                    this.conflicts.push({
                        nonTerminal: nt,
                        terminal: t,
                        entries: entries.map(r => `${nt} -> ${r.rawRhs}`),
                        type: conflictType.type,
                        explanation: conflictType.explanation,
                        remedy: conflictType.remedy
                    });
                }
            }
        }

        return {
            table: this.table,
            isLL1: this.isLL1,
            conflicts: this.conflicts,
            steps: this.constructionSteps,
            terminals: this.terminalsWithDollar,
            nonTerminals: this.grammar.nonTerminals
        };
    }

    /**
     * Adds a production to cell M[A, terminal] and records the log entry.
     */
    addEntry(nt, terminal, rule, ruleType, reason) {
        if (!this.table[nt] || !this.table[nt][terminal]) {
            return;
        }

        // Check if rule is already in this cell
        const alreadyExists = this.table[nt][terminal].some(r => r.id === rule.id);
        if (!alreadyExists) {
            this.table[nt][terminal].push(rule);
        }

        this.constructionSteps.push({
            nonTerminal: nt,
            terminal: terminal,
            ruleId: rule.id,
            ruleStr: `${nt} -> ${rule.rawRhs}`,
            ruleType: ruleType,
            reason: reason,
            conflict: this.table[nt][terminal].length > 1
        });
    }

    /**
     * Analyzes and classifies the nature of the table cell conflict.
     */
    classifyConflict(nt, terminal, rules) {
        // Check if both rules derive non-epsilon leading terminal or if one is epsilon
        const hasEpsilonRule = rules.some(r => r.rhs.includes(this.grammar.epsilon) || (r.rhs.length === 1 && r.rhs[0] === this.grammar.epsilon));

        if (hasEpsilonRule) {
            return {
                type: 'FIRST/FOLLOW CONFLICT',
                explanation: `Cell M[${nt}, '${terminal}'] contains both a non-epsilon derivation and an epsilon derivation. The parser cannot decide whether to expand or derive epsilon when lookahead is '${terminal}'.`,
                remedy: `Resolve ambiguity by refactoring the grammar, restructuring nullable non-terminals, or applying precedence.`
            };
        } else {
            return {
                type: 'FIRST/FIRST CONFLICT',
                explanation: `Cell M[${nt}, '${terminal}'] contains multiple productions whose FIRST sets both contain '${terminal}'. Lookahead cannot distinguish between: ${rules.map(r => `${nt} -> ${r.rawRhs}`).join(' vs ')}.`,
                remedy: `Apply Left Factoring to isolate the common prefix, or eliminate left recursion if present.`
            };
        }
    }

    /**
     * Looks up the production for a given non-terminal and lookahead terminal.
     * Returns null if cell is empty, or the rule object (or first rule if conflict).
     */
    lookup(nt, terminal) {
        if (!this.table[nt] || !this.table[nt][terminal]) {
            return null;
        }
        const entries = this.table[nt][terminal];
        return entries.length > 0 ? entries[0] : null;
    }

    /**
     * Gets all valid lookahead tokens for a given non-terminal.
     */
    getExpectedTokens(nt) {
        if (!this.table[nt]) return [];
        return Object.keys(this.table[nt]).filter(t => this.table[nt][t].length > 0);
    }
}

// Export for Node.js test environment or browser global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParsingTableGenerator;
} else if (typeof window !== 'undefined') {
    window.ParsingTableGenerator = ParsingTableGenerator;
}

