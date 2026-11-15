/**
 * LL(1) Predictive Parser - Grammar Transformation Module
 * Implements:
 * 1. Direct Left Recursion Elimination
 * 2. Indirect Left Recursion Elimination
 * 3. Left Factoring (Common Prefix Extraction)
 * Provides detailed step-by-step explanations, before/after diffs, and LL(1) verification.
 */

class GrammarTransformer {
    constructor(grammar) {
        this.grammar = grammar;
    }

    /**
     * Eliminates direct left recursion from all production rules.
     * Transformation rule:
     *   A -> A α1 | A α2 | ... | β1 | β2 | ...
     * becomes:
     *   A -> β1 A' | β2 A' | ...
     *   A' -> α1 A' | α2 A' | ... | ε
     */
    eliminateDirectLeftRecursion() {
        const steps = [];
        const newRulesMap = new Map(); // nt -> array of rhs arrays
        const nonTerminals = [...this.grammar.nonTerminals];
        let transformedAny = false;

        for (const nt of nonTerminals) {
            const rules = this.grammar.getRulesFor(nt);
            const alphaList = []; // Recursive tails: A -> A α
            const betaList = [];  // Non-recursive alternatives: A -> β

            for (const r of rules) {
                if (r.rhs.length > 0 && r.rhs[0] === nt) {
                    // Direct left recursive
                    const tail = r.rhs.slice(1);
                    alphaList.push(tail.length > 0 ? tail : [this.grammar.epsilon]);
                } else {
                    // Non-recursive alternative
                    betaList.push(r.rhs.length > 0 ? r.rhs : [this.grammar.epsilon]);
                }
            }

            if (alphaList.length > 0) {
                transformedAny = true;
                // Choose new prime symbol name, e.g. E' or E1
                let primeNt = `${nt}'`;
                while (this.grammar.nonTerminals.includes(primeNt) || newRulesMap.has(primeNt)) {
                    primeNt += "'";
                }

                // If no beta productions exist, introduce a placeholder or preserve behavior
                const effectiveBetas = betaList.length > 0 ? betaList : [[`${nt}_base`]];

                // New productions for A: A -> β A'
                const newARules = effectiveBetas.map(beta => {
                    if (beta.length === 1 && beta[0] === this.grammar.epsilon) {
                        return [primeNt];
                    }
                    return [...beta, primeNt];
                });

                // New productions for A': A' -> α A' | ε
                const newPrimeRules = alphaList.map(alpha => {
                    if (alpha.length === 1 && alpha[0] === this.grammar.epsilon) {
                        return [primeNt];
                    }
                    return [...alpha, primeNt];
                });
                newPrimeRules.push([this.grammar.epsilon]);

                newRulesMap.set(nt, newARules);
                newRulesMap.set(primeNt, newPrimeRules);

                steps.push({
                    type: 'DIRECT_LEFT_RECURSION',
                    nonTerminal: nt,
                    newNonTerminal: primeNt,
                    originalRules: rules.map(r => `${nt} -> ${r.rawRhs}`),
                    alphaList: alphaList.map(a => a.join(' ')),
                    betaList: effectiveBetas.map(b => b.join(' ')),
                    transformedRules: [
                        `${nt} -> ${newARules.map(r => r.join(' ')).join(' | ')}`,
                        `${primeNt} -> ${newPrimeRules.map(r => r.join(' ')).join(' | ')}`
                    ],
                    explanation: `Non-terminal '${nt}' had direct left recursion with recursive tails {${alphaList.map(a => a.join(' ')).join(', ')}}. Introduced new non-terminal '${primeNt}'. Transformed '${nt}' to derive non-recursive prefixes followed by '${primeNt}', and '${primeNt}' to derive tails followed by '${primeNt}' or 'ε'.`
                });
            } else {
                newRulesMap.set(nt, rules.map(r => r.rhs));
            }
        }

        const transformedText = this.formatRulesMapToGrammarText(newRulesMap);
        this.transformedGrammarText = transformedText;
        return {
            transformed: transformedAny,
            changed: transformedAny,
            originalGrammar: this.grammar.rawText,
            transformedGrammar: transformedText,
            transformedText,
            steps,
            summary: transformedAny ? `Successfully eliminated direct left recursion from ${steps.length} non-terminal(s).` : 'No direct left recursion found in grammar.'
        };
    }

    /**
     * Eliminates indirect and direct left recursion by ordering non-terminals.
     * Dragon Book Algorithm 4.19 (Elimination of Left Recursion).
     */
    eliminateLeftRecursionComprehensive() {
        const steps = [];
        let nts = [...this.grammar.nonTerminals];
        const rulesMap = new Map();

        for (const nt of nts) {
            rulesMap.set(nt, this.grammar.getRulesFor(nt).map(r => [...r.rhs]));
        }

        let transformedAny = false;

        for (let i = 0; i < nts.length; i++) {
            const Ai = nts[i];

            for (let j = 0; j < i; j++) {
                const Aj = nts[j];
                const currentAiRules = rulesMap.get(Ai) || [];
                const newAiRules = [];
                let substituted = false;

                for (const rhs of currentAiRules) {
                    if (rhs.length > 0 && rhs[0] === Aj) {
                        substituted = true;
                        transformedAny = true;
                        const gamma = rhs.slice(1);
                        const ajRules = rulesMap.get(Aj) || [];
                        for (const delta of ajRules) {
                            if (delta.length === 1 && delta[0] === this.grammar.epsilon) {
                                newAiRules.push(gamma.length > 0 ? gamma : [this.grammar.epsilon]);
                            } else {
                                newAiRules.push([...delta, ...gamma]);
                            }
                        }
                    } else {
                        newAiRules.push(rhs);
                    }
                }

                if (substituted) {
                    rulesMap.set(Ai, newAiRules);
                    steps.push({
                        type: 'INDIRECT_SUBSTITUTION',
                        nonTerminal: Ai,
                        substitutedWith: Aj,
                        explanation: `Substituted productions of '${Aj}' into leading occurrences in '${Ai}' to convert indirect left recursion into direct left recursion.`
                    });
                }
            }

            // Now eliminate direct left recursion on Ai
            const aiRules = rulesMap.get(Ai) || [];
            const alphaList = [];
            const betaList = [];

            for (const rhs of aiRules) {
                if (rhs.length > 0 && rhs[0] === Ai) {
                    alphaList.push(rhs.slice(1));
                } else {
                    betaList.push(rhs);
                }
            }

            if (alphaList.length > 0) {
                transformedAny = true;
                let primeNt = `${Ai}'`;
                while (rulesMap.has(primeNt) || nts.includes(primeNt)) {
                    primeNt += "'";
                }

                const effectiveBetas = betaList.length > 0 ? betaList : [[`${Ai}_base`]];
                const newARules = effectiveBetas.map(beta => {
                    if (beta.length === 1 && beta[0] === this.grammar.epsilon) return [primeNt];
                    return [...beta, primeNt];
                });

                const newPrimeRules = alphaList.map(alpha => {
                    if (alpha.length === 0 || (alpha.length === 1 && alpha[0] === this.grammar.epsilon)) return [primeNt];
                    return [...alpha, primeNt];
                });
                newPrimeRules.push([this.grammar.epsilon]);

                rulesMap.set(Ai, newARules);
                rulesMap.set(primeNt, newPrimeRules);
                nts.push(primeNt);

                steps.push({
                    type: 'DIRECT_LEFT_RECURSION',
                    nonTerminal: Ai,
                    newNonTerminal: primeNt,
                    transformedRules: [
                        `${Ai} -> ${newARules.map(r => r.join(' ')).join(' | ')}`,
                        `${primeNt} -> ${newPrimeRules.map(r => r.join(' ')).join(' | ')}`
                    ],
                    explanation: `Eliminated resulting direct left recursion on '${Ai}' using new symbol '${primeNt}'.`
                });
            }
        }

        const transformedText = this.formatRulesMapToGrammarText(rulesMap);
        this.transformedGrammarText = transformedText;
        return {
            transformed: transformedAny,
            changed: transformedAny,
            originalGrammar: this.grammar.rawText,
            transformedGrammar: transformedText,
            transformedText,
            steps,
            summary: transformedAny ? `Left recursion elimination completed across ${nts.length} non-terminals.` : 'No left recursion detected.'
        };
    }

    /**
     * Applies Left Factoring to eliminate common prefixes.
     * Transformation:
     *   A -> α β1 | α β2 | γ
     * becomes:
     *   A -> α A' | γ
     *   A' -> β1 | β2
     */
    applyLeftFactoring() {
        const steps = [];
        const newRulesMap = new Map();
        let transformedAny = false;

        for (const nt of this.grammar.nonTerminals) {
            let currentRules = this.grammar.getRulesFor(nt).map(r => [...r.rhs]);
            let passChanged = true;
            let factorIteration = 0;

            while (passChanged && factorIteration < 10) {
                passChanged = false;
                factorIteration++;

                // Find the longest common prefix of length >= 1 among alternatives
                const prefixGroups = this.findCommonPrefixGroups(currentRules);

                if (prefixGroups.length > 0) {
                    transformedAny = true;
                    passChanged = true;
                    const group = prefixGroups[0]; // Take best prefix match
                    const prefix = group.prefix;
                    const matchingRules = group.rules;
                    const nonMatchingRules = currentRules.filter(r => !matchingRules.includes(r));

                    let primeNt = `${nt}'`;
                    while (this.grammar.nonTerminals.includes(primeNt) || newRulesMap.has(primeNt)) {
                        primeNt += "'";
                    }

                    // Suffixes for A'
                    const primeRules = matchingRules.map(r => {
                        const suffix = r.slice(prefix.length);
                        return suffix.length > 0 ? suffix : [this.grammar.epsilon];
                    });

                    // New rule for A: prefix followed by A'
                    const factoredRule = [...prefix, primeNt];
                    currentRules = [...nonMatchingRules, factoredRule];

                    newRulesMap.set(primeNt, primeRules);

                    steps.push({
                        type: 'LEFT_FACTORING',
                        nonTerminal: nt,
                        newNonTerminal: primeNt,
                        prefix: prefix.join(' '),
                        factoredAlternatives: matchingRules.map(r => r.join(' ')),
                        transformedRules: [
                            `${nt} -> ${currentRules.map(r => r.join(' ')).join(' | ')}`,
                            `${primeNt} -> ${primeRules.map(r => r.join(' ')).join(' | ')}`
                        ],
                        explanation: `Extracted common prefix '${prefix.join(' ')}' from alternatives of '${nt}'. Introduced '${primeNt}' to derive remaining suffixes {${primeRules.map(r => r.join(' ')).join(', ')}}.`
                    });
                }
            }

            newRulesMap.set(nt, currentRules);
        }

        const transformedText = this.formatRulesMapToGrammarText(newRulesMap);
        this.transformedGrammarText = transformedText;
        return {
            transformed: transformedAny,
            changed: transformedAny,
            originalGrammar: this.grammar.rawText,
            transformedGrammar: transformedText,
            transformedText,
            steps,
            summary: transformedAny ? `Successfully left-factored ${steps.length} common prefix pattern(s).` : 'No common prefixes found requiring left factoring.'
        };
    }

    /**
     * Finds groups of alternatives that share a common prefix of length >= 1.
     */
    findCommonPrefixGroups(rules) {
        if (rules.length < 2) return [];
        const groups = [];

        // Check every pair to find longest common prefix
        for (let i = 0; i < rules.length; i++) {
            for (let j = i + 1; j < rules.length; j++) {
                const r1 = rules[i];
                const r2 = rules[j];
                let prefixLen = 0;

                while (prefixLen < r1.length && prefixLen < r2.length && r1[prefixLen] === r2[prefixLen] && r1[prefixLen] !== this.grammar.epsilon) {
                    prefixLen++;
                }

                if (prefixLen > 0) {
                    const prefix = r1.slice(0, prefixLen);
                    // Collect all rules that share this prefix
                    const matchedRules = rules.filter(r => {
                        if (r.length < prefixLen) return false;
                        for (let k = 0; k < prefixLen; k++) {
                            if (r[k] !== prefix[k]) return false;
                        }
                        return true;
                    });

                    if (matchedRules.length >= 2) {
                        // Check if group already captured
                        const prefixStr = prefix.join(' ');
                        if (!groups.some(g => g.prefix.join(' ') === prefixStr)) {
                            groups.push({
                                prefix,
                                rules: matchedRules,
                                length: prefixLen,
                                count: matchedRules.length
                            });
                        }
                    }
                }
            }
        }

        // Sort by prefix length descending, then by number of matching rules descending
        groups.sort((a, b) => b.length - a.length || b.count - a.count);
        return groups;
    }

    /**
     * Verifies whether a transformed grammar string is strictly LL(1) compatible.
     * Evaluates FIRST, FOLLOW, and Parsing Table conflicts without modifying current grammar.
     */
    verifyTransformedGrammar(transformedText = this.transformedGrammarText) {
        if (!transformedText || typeof transformedText !== 'string') {
            return { isLL1: false, conflicts: ['Empty grammar'], explanation: 'No grammar text provided.' };
        }

        try {
            // Support both Node.js require and browser globals
            const GrammarClass = typeof Grammar !== 'undefined' ? Grammar : (typeof require !== 'undefined' ? require('./grammar.js') : window.Grammar);
            const FirstClass = typeof FirstCalculator !== 'undefined' ? FirstCalculator : (typeof require !== 'undefined' ? require('./first.js') : window.FirstCalculator);
            const FollowClass = typeof FollowCalculator !== 'undefined' ? FollowCalculator : (typeof require !== 'undefined' ? require('./follow.js') : window.FollowCalculator);
            const TableClass = typeof ParsingTableGenerator !== 'undefined' ? ParsingTableGenerator : (typeof require !== 'undefined' ? require('./table.js') : window.ParsingTableGenerator);

            const testGrammar = new GrammarClass(transformedText);
            const firstCalc = new FirstClass(testGrammar);
            firstCalc.compute();

            const followCalc = new FollowClass(testGrammar, firstCalc);
            followCalc.compute();

            const tableGen = new TableClass(testGrammar, firstCalc, followCalc);
            tableGen.generate();

            return {
                isLL1: tableGen.isLL1,
                conflicts: tableGen.conflicts,
                warnings: testGrammar.warnings,
                nonTerminals: testGrammar.nonTerminals,
                terminals: testGrammar.terminals,
                explanation: tableGen.isLL1 
                    ? 'Transformed grammar is strictly LL(1) compatible! Zero conflicts in M[A, a].' 
                    : `Transformed grammar is NOT LL(1) compatible. Detected ${tableGen.conflicts.length} conflict(s). Note that grammar transformations (like left recursion elimination or factoring) do not guarantee the resulting grammar is LL(1).`
            };
        } catch (e) {
            return {
                isLL1: false,
                conflicts: [e.message],
                explanation: `Error verifying transformed grammar: ${e.message}`
            };
        }
    }

    /**
     * Formats a rules map into standard context-free grammar production text.
     */
    formatRulesMapToGrammarText(rulesMap) {
        const lines = [];
        for (const [nt, rules] of rulesMap.entries()) {
            const formattedAlts = rules.map(rhs => {
                if (!rhs || rhs.length === 0) return 'ε';
                return rhs.join(' ');
            });
            lines.push(`${nt} -> ${formattedAlts.join(' | ')}`);
        }
        return lines.join('\n');
    }
}

// Export for Node.js test environment or browser global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GrammarTransformer;
} else if (typeof window !== 'undefined') {
    window.GrammarTransformer = GrammarTransformer;
}
