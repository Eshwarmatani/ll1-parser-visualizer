/**
 * LL(1) Predictive Parser - FIRST Set Calculator
 * Implements the mathematical FIRST algorithm using fixed-point iteration.
 * Tracks detailed pedagogical steps, iteration history, and rule attributions.
 */

class FirstCalculator {
    constructor(grammar) {
        this.grammar = grammar;
        this.sets = new Map();         // Map<string, Set<string>>: non-terminal -> Set of symbols
        this.iterations = [];         // Array of iteration log snapshots
        this.stepByStepLog = [];      // Linear list of step explanations
        this.computed = false;
    }

    /**
     * Computes FIRST sets for all non-terminals in the grammar.
     */
    compute() {
        this.sets.clear();
        this.iterations = [];
        this.stepByStepLog = [];

        // 1. Initialize empty set for each non-terminal
        for (const nt of this.grammar.nonTerminals) {
            this.sets.set(nt, new Set());
        }

        let changed = true;
        let iterationCount = 0;
        const maxIterations = 50; // Guard against infinite cycles in ill-formed grammars

        while (changed && iterationCount < maxIterations) {
            changed = false;
            iterationCount++;

            const currentIterationLog = {
                iteration: iterationCount,
                steps: [],
                snapshot: {}
            };

            for (const nt of this.grammar.nonTerminals) {
                const currentSet = this.sets.get(nt);
                const rules = this.grammar.getRulesFor(nt);

                for (const rule of rules) {
                    const rhs = rule.rhs;

                    // Case A: Rule is A -> ε (or empty)
                    if (rhs.length === 0 || (rhs.length === 1 && rhs[0] === this.grammar.epsilon)) {
                        if (!currentSet.has(this.grammar.epsilon)) {
                            currentSet.add(this.grammar.epsilon);
                            changed = true;
                            const stepLog = {
                                nonTerminal: nt,
                                rule: `${nt} -> ${rule.rawRhs}`,
                                ruleId: rule.id,
                                symbol: 'ε',
                                added: [this.grammar.epsilon],
                                reason: `Rule ${nt} -> ε directly derives epsilon. Added 'ε' to FIRST(${nt}).`,
                                snapshot: this.getFormattedSets(),
                                iteration: iterationCount
                            };
                            currentIterationLog.steps.push(stepLog);
                            this.stepByStepLog.push(stepLog);
                        }
                        continue;
                    }

                    // Case B: Rule is A -> Y1 Y2 ... Yk
                    let canAllDeriveEpsilon = true;

                    for (let i = 0; i < rhs.length; i++) {
                        const sym = rhs[i];

                        // Subcase B1: Symbol is a Terminal or End Marker
                        if (this.grammar.isTerminal(sym) || sym === this.grammar.endMarker || (!this.grammar.isNonTerminal(sym) && sym !== this.grammar.epsilon)) {
                            if (!currentSet.has(sym)) {
                                currentSet.add(sym);
                                changed = true;
                                const stepLog = {
                                    nonTerminal: nt,
                                    rule: `${nt} -> ${rule.rawRhs}`,
                                    ruleId: rule.id,
                                    symbol: sym,
                                    examinedIndex: i,
                                    added: [sym],
                                    reason: `In ${nt} -> ${rule.rawRhs}, leading symbol '${sym}' is a terminal. Added '${sym}' to FIRST(${nt}).`,
                                    snapshot: this.getFormattedSets(),
                                    iteration: iterationCount
                                };
                                currentIterationLog.steps.push(stepLog);
                                this.stepByStepLog.push(stepLog);
                            }
                            canAllDeriveEpsilon = false;
                            break; // Stop scanning RHS since terminal cannot derive epsilon
                        }

                        // Subcase B2: Symbol is a Non-Terminal
                        if (this.grammar.isNonTerminal(sym)) {
                            const symFirst = this.sets.get(sym) || new Set();
                            let addedSymbols = [];

                            // Add everything in FIRST(sym) except epsilon
                            for (const s of symFirst) {
                                if (s !== this.grammar.epsilon && !currentSet.has(s)) {
                                    currentSet.add(s);
                                    addedSymbols.push(s);
                                    changed = true;
                                }
                            }

                            if (addedSymbols.length > 0) {
                                const stepLog = {
                                    nonTerminal: nt,
                                    rule: `${nt} -> ${rule.rawRhs}`,
                                    ruleId: rule.id,
                                    symbol: sym,
                                    examinedIndex: i,
                                    added: addedSymbols,
                                    reason: `In ${nt} -> ${rule.rawRhs}, non-terminal '${sym}' has {${Array.from(symFirst).join(', ')}}. Added {${addedSymbols.join(', ')}} to FIRST(${nt}).`,
                                    snapshot: this.getFormattedSets(),
                                    iteration: iterationCount
                                };
                                currentIterationLog.steps.push(stepLog);
                                this.stepByStepLog.push(stepLog);
                            }

                            // If sym cannot derive epsilon, we cannot look further right
                            if (!symFirst.has(this.grammar.epsilon)) {
                                canAllDeriveEpsilon = false;
                                break;
                            }
                            // Otherwise, sym can derive epsilon, so continue examining Y_{i+1}
                        }
                    }

                    // Subcase B3: All Y1...Yk derive epsilon
                    if (canAllDeriveEpsilon && !currentSet.has(this.grammar.epsilon)) {
                        currentSet.add(this.grammar.epsilon);
                        changed = true;
                        const stepLog = {
                            nonTerminal: nt,
                            rule: `${nt} -> ${rule.rawRhs}`,
                            ruleId: rule.id,
                            symbol: 'ε',
                            added: [this.grammar.epsilon],
                            reason: `In ${nt} -> ${rule.rawRhs}, every symbol in RHS can derive ε. Added 'ε' to FIRST(${nt}).`,
                            snapshot: this.getFormattedSets(),
                            iteration: iterationCount
                        };
                        currentIterationLog.steps.push(stepLog);
                        this.stepByStepLog.push(stepLog);
                    }
                }
            }

            // Record snapshot at end of iteration
            for (const [k, v] of this.sets.entries()) {
                currentIterationLog.snapshot[k] = Array.from(v).sort();
            }
            this.iterations.push(currentIterationLog);
        }

        this.computed = true;
        this.iterationHistory = this.iterations;
        return this.getFormattedSets();
    }

    /**
     * Computes the FIRST set of an arbitrary sequence of symbols α = X1 X2 ... Xn.
     * Essential for parsing table construction and FOLLOW set calculation.
     * @param {string[]} sequence - Array of symbols
     * @returns {Set<string>}
     */
    computeForSequence(sequence) {
        const result = new Set();
        if (!sequence || sequence.length === 0) {
            result.add(this.grammar.epsilon);
            return result;
        }

        let allCanBeEpsilon = true;

        for (const sym of sequence) {
            if (sym === this.grammar.epsilon) {
                continue;
            }

            if (this.grammar.isTerminal(sym) || sym === this.grammar.endMarker || (!this.grammar.isNonTerminal(sym) && sym !== this.grammar.epsilon)) {
                result.add(sym);
                allCanBeEpsilon = false;
                break;
            }

            if (this.grammar.isNonTerminal(sym)) {
                const symFirst = this.sets.get(sym) || new Set();
                for (const s of symFirst) {
                    if (s !== this.grammar.epsilon) {
                        result.add(s);
                    }
                }

                if (!symFirst.has(this.grammar.epsilon)) {
                    allCanBeEpsilon = false;
                    break;
                }
            }
        }

        if (allCanBeEpsilon) {
            result.add(this.grammar.epsilon);
        }

        return result;
    }

    /**
     * Formats FIRST sets as a plain JavaScript object with sorted array values.
     */
    getFormattedSets() {
        const out = {};
        for (const [k, v] of this.sets.entries()) {
            out[k] = Array.from(v).sort((a, b) => {
                if (a === this.grammar.epsilon) return 1;
                if (b === this.grammar.epsilon) return -1;
                return a.localeCompare(b);
            });
        }
        return out;
    }
}

// Export for Node.js test environment or browser global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirstCalculator;
} else if (typeof window !== 'undefined') {
    window.FirstCalculator = FirstCalculator;
}

