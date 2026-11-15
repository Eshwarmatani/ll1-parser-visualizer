/**
 * LL(1) Predictive Parser - Stack-Based Parsing Engine
 * Generates granular, atomic micro-steps for every individual PUSH, POP,
 * terminal match comparison, terminal consume, and epsilon operation.
 * Every step contains an immutable, fully reversible state snapshot.
 */

class LL1Parser {
    constructor(grammar, tableGenerator) {
        this.grammar = grammar;
        this.tableGenerator = tableGenerator;
        this.steps = [];
        this.treeNodes = [];
        this.treeRoot = null;
        this.maxSteps = 800; // Protection against infinite cycles
    }

    /**
     * Tokenizes a raw input string based on the grammar's terminals.
     */
    tokenize(inputString) {
        const tokens = [];
        const raw = (inputString || '').trim();
        if (!raw) {
            return { tokens: [this.grammar.endMarker], error: null };
        }

        const sortedTerminals = this.grammar.terminals.slice().sort((a, b) => b.length - a.length);

        let i = 0;
        while (i < raw.length) {
            if (/\s/.test(raw[i])) {
                i++;
                continue;
            }

            let matched = false;
            for (const term of sortedTerminals) {
                if (raw.startsWith(term, i)) {
                    tokens.push(term);
                    i += term.length;
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                const wordMatch = raw.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
                if (wordMatch) {
                    tokens.push(wordMatch[0]);
                    i += wordMatch[0].length;
                } else {
                    tokens.push(raw[i]);
                    i++;
                }
            }
        }

        tokens.push(this.grammar.endMarker);
        return { tokens, error: null };
    }

    /**
     * Parses an input string with granular micro-steps:
     * - PREDICT: table lookup
     * - POP: non-terminal removal
     * - PUSH: individual symbol push in reverse order
     * - MATCH_COMPARE: terminal comparison & pulse
     * - MATCH_CONSUME: terminal pop & pointer advance
     * - EPSILON: epsilon resolution
     * - ACCEPT: end reached
     * - ERROR: syntax mismatch
     */
    parse(inputString) {
        this.steps = [];
        this.treeNodes = [];
        let nodeIdCounter = 1;

        const tokenResult = this.tokenize(inputString);
        const tokens = tokenResult.tokens;

        // Tree root initialization
        this.treeRoot = {
            id: nodeIdCounter++,
            symbol: this.grammar.startSymbol,
            children: [],
            parent: null,
            isTerminal: false,
            isEpsilon: false,
            status: 'active'
        };
        this.treeNodes = [this.treeRoot];

        // The stack holds objects: { symbol: string, nodeId: number | null }
        // Stack bottom is '$' at index 0, Top is at index length - 1
        const stack = [
            { symbol: this.grammar.endMarker, nodeId: null },
            { symbol: this.grammar.startSymbol, nodeId: this.treeRoot.id }
        ];

        let ip = 0; // Input pointer
        let stepCount = 0;
        let isAccepted = false;
        let errorMessage = null;

        // Step 0: Initial State Snapshot
        this.recordStep({
            step: stepCount++,
            stack: this.cloneStack(stack),
            inputTokens: tokens,
            pointer: ip,
            actionType: 'INITIAL',
            production: '',
            symbolInAction: this.grammar.startSymbol,
            explanation: `Initialized parsing stack with bottom marker '$' and Start Symbol '${this.grammar.startSymbol}'. Lookahead token pointer is at '${tokens[ip]}'.`,
            activeNodeId: this.treeRoot.id
        });

        // Main Predictive Parsing Loop with granular micro-steps
        while (stack.length > 0 && stepCount < this.maxSteps) {
            const topObj = stack[stack.length - 1];
            const X = topObj.symbol;
            const lookahead = tokens[ip];

            // -------------------------------------------------------------
            // CASE 1: Both Stack Top and Input Token are '$' -> ACCEPT!
            // -------------------------------------------------------------
            if (X === this.grammar.endMarker && lookahead === this.grammar.endMarker) {
                isAccepted = true;
                if (topObj.nodeId) {
                    this.setNodeStatus(topObj.nodeId, 'matched');
                }
                this.recordStep({
                    step: stepCount++,
                    stack: this.cloneStack(stack),
                    inputTokens: tokens,
                    pointer: ip,
                    actionType: 'ACCEPT',
                    production: '',
                    symbolInAction: '$',
                    explanation: `SUCCESS! Both Stack TOP and Lookahead Token reached '$'. Input string is valid and ACCEPTED.`,
                    activeNodeId: null
                });
                break;
            }

            // -------------------------------------------------------------
            // CASE 2: Stack Top is a Terminal (or end marker '$')
            // -------------------------------------------------------------
            if (this.grammar.isTerminal(X) || X === this.grammar.endMarker) {
                if (X === lookahead) {
                    // Micro-Step 2A: MATCH COMPARISON & HIGHLIGHT
                    this.recordStep({
                        step: stepCount++,
                        stack: this.cloneStack(stack),
                        inputTokens: tokens,
                        pointer: ip,
                        actionType: 'MATCH_COMPARE',
                        production: '',
                        symbolInAction: X,
                        matchedTerminal: X,
                        explanation: `MATCH VERIFIED: Stack TOP terminal '${X}' matches current lookahead token '${lookahead}'. Preparing to consume token.`,
                        activeNodeId: topObj.nodeId
                    });

                    // Micro-Step 2B: POP TERMINAL & ADVANCE INPUT POINTER
                    const matchedObj = stack.pop();
                    if (matchedObj.nodeId) {
                        this.setNodeStatus(matchedObj.nodeId, 'matched');
                    }
                    ip++; // Advance pointer

                    this.recordStep({
                        step: stepCount++,
                        stack: this.cloneStack(stack),
                        inputTokens: tokens,
                        pointer: ip,
                        actionType: 'MATCH_CONSUME',
                        production: '',
                        symbolInAction: X,
                        matchedTerminal: X,
                        explanation: `CONSUMED: Popped terminal '${X}' from stack and advanced lookahead tape pointer to '${tokens[ip] || '$'}'.`,
                        activeNodeId: matchedObj.nodeId
                    });
                } else {
                    // Terminal mismatch error
                    errorMessage = `Syntax Error: Terminal mismatch. Stack TOP is '${X}' but lookahead token is '${lookahead}'. Expected '${X}'.`;
                    this.recordStep({
                        step: stepCount++,
                        stack: this.cloneStack(stack),
                        inputTokens: tokens,
                        pointer: ip,
                        actionType: 'ERROR',
                        production: '',
                        symbolInAction: X,
                        explanation: errorMessage,
                        activeNodeId: topObj.nodeId
                    });
                    break;
                }
            }

            // -------------------------------------------------------------
            // CASE 3: Stack Top is a Non-Terminal
            // -------------------------------------------------------------
            else if (this.grammar.isNonTerminal(X)) {
                const rule = this.tableGenerator.lookup(X, lookahead);

                if (!rule) {
                    // Blank entry in table -> Syntax Error
                    const expected = this.tableGenerator.getExpectedTokens(X);
                    errorMessage = `Syntax Error: No production found in table M[${X}, '${lookahead}']. Expected one of: { ${expected.join(', ') || 'none'} }.`;
                    this.recordStep({
                        step: stepCount++,
                        stack: this.cloneStack(stack),
                        inputTokens: tokens,
                        pointer: ip,
                        actionType: 'ERROR',
                        production: '',
                        symbolInAction: X,
                        explanation: errorMessage,
                        activeNodeId: topObj.nodeId,
                        tableCell: { nt: X, terminal: lookahead }
                    });
                    break;
                }

                // Micro-Step 3A: TABLE PREDICTION
                this.recordStep({
                    step: stepCount++,
                    stack: this.cloneStack(stack),
                    inputTokens: tokens,
                    pointer: ip,
                    actionType: 'PREDICT',
                    production: `${X} -> ${rule.rawRhs}`,
                    symbolInAction: X,
                    explanation: `TABLE LOOKUP: Lookahead is '${lookahead}'. Selected production ${X} -> ${rule.rawRhs} from cell M[${X}, '${lookahead}'].`,
                    activeNodeId: topObj.nodeId,
                    tableCell: { nt: X, terminal: lookahead }
                });

                // Micro-Step 3B: POP NON-TERMINAL
                const poppedItem = stack.pop();
                const parentNodeId = poppedItem.nodeId;
                this.setNodeStatus(parentNodeId, 'expanded');

                // SUBCASE 3C: Epsilon production X -> ε
                if (rule.rhs.length === 1 && rule.rhs[0] === this.grammar.epsilon) {
                    const epsNode = {
                        id: nodeIdCounter++,
                        symbol: this.grammar.epsilon,
                        children: [],
                        parent: parentNodeId,
                        isTerminal: true,
                        isEpsilon: true,
                        status: 'matched'
                    };
                    this.treeNodes.push(epsNode);
                    const parentNode = this.treeNodes.find(n => n.id === parentNodeId);
                    if (parentNode) {
                        parentNode.children.push(epsNode.id);
                    }

                    this.recordStep({
                        step: stepCount++,
                        stack: this.cloneStack(stack),
                        inputTokens: tokens,
                        pointer: ip,
                        actionType: 'EPSILON',
                        production: `${X} -> ${this.grammar.epsilon}`,
                        symbolInAction: this.grammar.epsilon,
                        explanation: `EPSILON POP: Applied ${X} -> ε. Popped non-terminal '${X}' without pushing any symbols to the stack.`,
                        activeNodeId: parentNodeId,
                        tableCell: { nt: X, terminal: lookahead }
                    });
                }

                // SUBCASE 3D: Non-epsilon production X -> Y1 Y2 ... Yk
                else {
                    const rhsSymbols = rule.rhs;
                    const newChildIds = [];

                    // Create tree nodes for all children in forward order
                    for (const sym of rhsSymbols) {
                        const isTerm = this.grammar.isTerminal(sym);
                        const childNode = {
                            id: nodeIdCounter++,
                            symbol: sym,
                            children: [],
                            parent: parentNodeId,
                            isTerminal: isTerm,
                            isEpsilon: false,
                            status: 'pending'
                        };
                        this.treeNodes.push(childNode);
                        newChildIds.push(childNode.id);
                    }

                    const parentNode = this.treeNodes.find(n => n.id === parentNodeId);
                    if (parentNode) {
                        parentNode.children = newChildIds;
                    }

                    // Record POP state before pushes begin
                    this.recordStep({
                        step: stepCount++,
                        stack: this.cloneStack(stack),
                        inputTokens: tokens,
                        pointer: ip,
                        actionType: 'POP',
                        production: `${X} -> ${rule.rawRhs}`,
                        symbolInAction: X,
                        explanation: `POP: Removed '${X}' from stack top to prepare for reverse RHS push.`,
                        activeNodeId: parentNodeId,
                        tableCell: { nt: X, terminal: lookahead }
                    });

                    // PUSH EACH SYMBOL ONE-BY-ONE IN REVERSE ORDER (Yk down to Y1)
                    for (let r = rhsSymbols.length - 1; r >= 0; r--) {
                        const symToPush = rhsSymbols[r];
                        const childId = newChildIds[r];

                        stack.push({
                            symbol: symToPush,
                            nodeId: childId
                        });

                        const isFirstRhsSymbol = (r === 0);
                        const pushPosDesc = `(${rhsSymbols.length - r} of ${rhsSymbols.length})`;

                        this.recordStep({
                            step: stepCount++,
                            stack: this.cloneStack(stack),
                            inputTokens: tokens,
                            pointer: ip,
                            actionType: 'PUSH',
                            production: `${X} -> ${rule.rawRhs}`,
                            symbolInAction: symToPush,
                            pushedSymbol: symToPush,
                            isNewTop: isFirstRhsSymbol,
                            explanation: isFirstRhsSymbol
                                ? `PUSH COMPLETE: Pushed leading RHS symbol '${symToPush}' ${pushPosDesc}. '${symToPush}' is now the active stack TOP.`
                                : `PUSH: Pushed RHS symbol '${symToPush}' ${pushPosDesc} in reverse order.`,
                            activeNodeId: childId,
                            tableCell: { nt: X, terminal: lookahead }
                        });
                    }
                }
            } else {
                errorMessage = `Syntax Error: Unknown symbol '${X}' encountered on stack.`;
                this.recordStep({
                    step: stepCount++,
                    stack: this.cloneStack(stack),
                    inputTokens: tokens,
                    pointer: ip,
                    actionType: 'ERROR',
                    production: '',
                    symbolInAction: X,
                    explanation: errorMessage,
                    activeNodeId: null
                });
                break;
            }
        }

        if (stepCount >= this.maxSteps && !isAccepted) {
            errorMessage = `Parsing terminated: Maximum step threshold (${this.maxSteps}) exceeded.`;
            this.recordStep({
                step: stepCount++,
                stack: this.cloneStack(stack),
                inputTokens: tokens,
                pointer: ip,
                actionType: 'ERROR',
                production: '',
                symbolInAction: null,
                explanation: errorMessage,
                activeNodeId: null
            });
        }

        return {
            success: isAccepted,
            steps: this.steps,
            totalSteps: this.steps.length,
            errorMessage: errorMessage,
            tokens: tokens,
            parseTree: {
                root: this.treeRoot,
                nodes: this.treeNodes
            }
        };
    }

    /**
     * Clones the stack array for immutable snapshot preservation.
     */
    cloneStack(stack) {
        return stack.map(item => ({ symbol: item.symbol, nodeId: item.nodeId }));
    }

    /**
     * Updates node status in the tree.
     */
    setNodeStatus(nodeId, status) {
        if (!nodeId) return;
        const node = this.treeNodes.find(n => n.id === nodeId);
        if (node) {
            node.status = status;
        }
    }

    /**
     * Records an immutable granular step snapshot.
     */
    recordStep(data) {
        const remainingArr = data.inputTokens.slice(data.pointer);
        const remainingStr = remainingArr.join(' ');
        const currentToken = data.inputTokens[data.pointer] || '';
        const stackSymbols = data.stack.map(s => s.symbol);
        const stackTop = stackSymbols.length > 0 ? stackSymbols[stackSymbols.length - 1] : '';

        this.steps.push({
            step: data.step,
            stack: data.stack,
            stackSymbols: stackSymbols,
            stackTop: stackTop,
            inputTokens: data.inputTokens,
            pointer: data.pointer,
            remainingInput: remainingStr,
            currentToken: currentToken,
            actionType: data.actionType,
            production: data.production || '',
            symbolInAction: data.symbolInAction || null,
            pushedSymbol: data.pushedSymbol || null,
            matchedTerminal: data.matchedTerminal || null,
            isNewTop: data.isNewTop || false,
            explanation: data.explanation,
            activeNodeId: data.activeNodeId,
            tableCell: data.tableCell || null,
            nodeStatuses: this.treeNodes.map(n => ({ id: n.id, status: n.status }))
        });
    }
}

// Export for Node.js test environment or browser global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LL1Parser;
} else if (typeof window !== 'undefined') {
    window.LL1Parser = LL1Parser;
}
