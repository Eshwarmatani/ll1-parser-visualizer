/**
 * LL(1) Predictive Parser - FOLLOW Set Calculator
 * Implements the mathematical FOLLOW algorithm using fixed-point iteration.
 * Tracks detailed pedagogical steps, iteration history, and rule attributions.
 */

class FollowCalculator {
    constructor(grammar, firstCalculator) {
        this.grammar = grammar;
        this.firstCalculator = firstCalculator;
        this.sets = new Map();         // Map<string, Set<string>>: non-terminal -> Set of terminals + '$'
        this.iterations = [];         // Array of iteration log snapshots
        this.stepByStepLog = [];      // Linear list of step explanations
        this.computed = false;
    }

    /**
     * Computes FOLLOW sets for all non-terminals in the grammar.
     */
    compute() {
        this.sets.clear();
        this.iterations = [];
        this.stepByStepLog = [];

        // 1. Initialize empty set for each non-terminal
        for (const nt of this.grammar.nonTerminals) {
            this.sets.set(nt, new Set());
        }

        // Rule 1: Place '$' into FOLLOW(startSymbol)
        if (this.grammar.startSymbol) {
            this.sets.get(this.grammar.startSymbol).add(this.grammar.endMarker);
            const initStep = {
                nonTerminal: this.grammar.startSymbol,
                rule: `Rule 1: Start Symbol`,
                added: [this.grammar.endMarker],
                reason: `Start symbol '${this.grammar.startSymbol}' always receives the end-of-input marker '$' in its FOLLOW set.`,
                snapshot: this.getFormattedSets(),
                iteration: 1
            };
            this.stepByStepLog.push(initStep);
        }

        let changed = true;
        let iterationCount = 0;
        const maxIterations = 50;

        while (changed && iterationCount < maxIterations) {
            changed = false;
            iterationCount++;

            const currentIterationLog = {
                iteration: iterationCount,
                steps: [],
                snapshot: {}
            };

            // Iterate over all production rules: A -> X1 X2 ... Xk
            for (const rule of this.grammar.rules) {
                const A = rule.lhs;
                const rhs = rule.rhs;

                for (let i = 0; i < rhs.length; i++) {
                    const B = rhs[i];

                    // FOLLOW is only defined and calculated for Non-Terminals
                    if (!this.grammar.isNonTerminal(B)) {
                        continue;
                    }

                    const followB = this.sets.get(B);
                    const beta = rhs.slice(i + 1); // Everything to the right of B

                    // Rule 2: If there is a production A -> α B β,
                    // then everything in FIRST(β) except ε is in FOLLOW(B).
                    if (beta.length > 0) {
                        const firstBeta = this.firstCalculator.computeForSequence(beta);
                        let addedFromFirstBeta = [];

                        for (const sym of firstBeta) {
                            if (sym !== this.grammar.epsilon && !followB.has(sym)) {
                                followB.add(sym);
                                addedFromFirstBeta.push(sym);
                                changed = true;
                            }
                        }

                        if (addedFromFirstBeta.length > 0) {
                            const stepLog = {
                                nonTerminal: B,
                                rule: `${A} -> ${rule.rawRhs}`,
                                trigger: `FIRST(${beta.join(' ')})`,
                                added: addedFromFirstBeta,
                                reason: `In rule ${A} -> ${rule.rawRhs}, '${B}' is followed by '${beta.join(' ')}'. FIRST(${beta.join(' ')}) \\ {ε} contains {${addedFromFirstBeta.join(', ')}}. Added to FOLLOW(${B}).`,
                                snapshot: this.getFormattedSets(),
                                iteration: iterationCount
                            };
                            currentIterationLog.steps.push(stepLog);
                            this.stepByStepLog.push(stepLog);
                        }
                    }

                    // Rule 3: If there is a production A -> α B, or A -> α B β where FIRST(β) contains ε:
                    // then everything in FOLLOW(A) is in FOLLOW(B).
                    const betaCanDeriveEpsilon = (beta.length === 0) || this.firstCalculator.computeForSequence(beta).has(this.grammar.epsilon);

                    if (betaCanDeriveEpsilon && A !== B) {
                        const followA = this.sets.get(A) || new Set();
                        let addedFromFollowA = [];

                        for (const sym of followA) {
                            if (!followB.has(sym)) {
                                followB.add(sym);
                                addedFromFollowA.push(sym);
                                changed = true;
                            }
                        }

                        if (addedFromFollowA.length > 0) {
                            const conditionDesc = beta.length === 0 ? `'${B}' is at the end of the rule` : `suffix '${beta.join(' ')}' can derive ε`;
                            const stepLog = {
                                nonTerminal: B,
                                rule: `${A} -> ${rule.rawRhs}`,
                                trigger: `FOLLOW(${A})`,
                                added: addedFromFollowA,
                                reason: `In rule ${A} -> ${rule.rawRhs}, ${conditionDesc}. Everything in FOLLOW(${A}) ({${Array.from(followA).join(', ')}}) propagates into FOLLOW(${B}). Added {${addedFromFollowA.join(', ')}}.`,
                                snapshot: this.getFormattedSets(),
                                iteration: iterationCount
                            };
                            currentIterationLog.steps.push(stepLog);
                            this.stepByStepLog.push(stepLog);
                        }
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
     * Formats FOLLOW sets as a plain JavaScript object with sorted array values.
     */
    getFormattedSets() {
        const out = {};
        for (const [k, v] of this.sets.entries()) {
            out[k] = Array.from(v).sort((a, b) => {
                if (a === this.grammar.endMarker) return 1;
                if (b === this.grammar.endMarker) return -1;
                return a.localeCompare(b);
            });
        }
        return out;
    }
}

// Export for Node.js test environment or browser global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FollowCalculator;
} else if (typeof window !== 'undefined') {
    window.FollowCalculator = FollowCalculator;
}

