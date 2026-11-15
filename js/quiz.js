/**
 * LL(1) Predictive Parser - Practice & Assessment Module
 * High-quality, mathematically verified questions across 8 compiler construction categories:
 * FIRST sets, FOLLOW sets, Parsing Table lookups, Transformations, Conflicts, Stack operations, Acceptance, and Theory.
 */

class QuizEngine {
    constructor() {
        this.questions = this.getQuestionBank();
        this.allQuestions = this.questions;
        this.currentQuiz = [];
        this.activeQuestions = [];
        this.currentIndex = 0;
        this.userAnswers = {}; // questionId -> selectedOptionIndex
        this.score = 0;
        this.filter = 'all'; // 'all', 'beginner', 'intermediate', 'advanced'
        this.startQuiz('all', 18);
    }

    /**
     * Complete bank of verified compiler questions with detailed pedagogical explanations.
     */
    getQuestionBank() {
        return [
            // 1. FIRST Sets (Beginner)
            {
                id: 'q1',
                category: 'FIRST Sets',
                difficulty: 'beginner',
                grammar: 'A -> + B | id\nB -> * id',
                question: 'What is FIRST(A) for the given grammar?',
                options: [
                    '{ +, id }',
                    '{ *, id }',
                    '{ +, * }',
                    '{ + }'
                ],
                correctIndex: 0,
                explanation: 'A has two alternatives: "+ B" and "id". The leading symbol of "+ B" is the terminal "+", and the leading symbol of "id" is "id". Therefore, FIRST(A) = { +, id }.'
            },

            // 2. FIRST Sets with Epsilon (Intermediate)
            {
                id: 'q2',
                category: 'FIRST Sets',
                difficulty: 'intermediate',
                grammar: "E -> T E'\nE' -> + T E' | ε\nT -> id",
                question: "What is FIRST(E') and does it contain ε?",
                options: [
                    "{ +, ε } (Yes, it contains ε)",
                    '{ + } (No, ε is excluded)',
                    '{ id, + }',
                    '{ $ }'
                ],
                correctIndex: 0,
                explanation: "E' derives '+ T E'' (leading terminal '+') and 'ε' (directly derives epsilon). Thus, FIRST(E') = { +, ε }."
            },

            // 3. FIRST Propagation through Nullable Symbols (Advanced)
            {
                id: 'q3',
                category: 'FIRST Sets',
                difficulty: 'advanced',
                grammar: 'S -> A B c\nA -> a | ε\nB -> b | ε',
                question: 'What is FIRST(S)?',
                options: [
                    '{ a, b, c }',
                    '{ a, b }',
                    '{ a, c }',
                    '{ a, b, c, ε }'
                ],
                correctIndex: 0,
                explanation: "FIRST(S) takes FIRST(A) \\ {ε} = {a}. Because A is nullable (can derive ε), evaluation continues to B, adding FIRST(B) \\ {ε} = {b}. Because B is also nullable, evaluation reaches terminal 'c'. Since 'c' cannot derive ε, S itself cannot derive ε. Thus, FIRST(S) = { a, b, c }."
            },

            // 4. FOLLOW Sets (Beginner)
            {
                id: 'q4',
                category: 'FOLLOW Sets',
                difficulty: 'beginner',
                grammar: "E -> T E'\nE' -> + T E' | ε",
                question: "What symbol is ALWAYS initially placed into FOLLOW(E), where E is the start symbol?",
                options: [
                    "'$' (End-of-input marker)",
                    "'ε' (Epsilon)",
                    "'+' (First operator)",
                    "'id' (First terminal)"
                ],
                correctIndex: 0,
                explanation: "By Rule 1 of the FOLLOW algorithm, the end-of-input marker '$' is unconditionally added to the FOLLOW set of the grammar's start symbol."
            },

            // 5. FOLLOW Suffix Derivation (Intermediate)
            {
                id: 'q5',
                category: 'FOLLOW Sets',
                difficulty: 'intermediate',
                grammar: "E -> T E'\nE' -> + T E' | ε\nT -> ( E ) | id",
                question: "In the rule T -> ( E ), what gets added to FOLLOW(E)?",
                options: [
                    "')' because ')' directly follows E",
                    "'+' from E'",
                    "'$' because of the start symbol rule",
                    "'id' because T derives id"
                ],
                correctIndex: 0,
                explanation: "By Rule 2 of FOLLOW, in production T -> ( E ), non-terminal E is followed by the suffix ')'. Therefore, FIRST(')') = { ')' } is added to FOLLOW(E)."
            },

            // 6. FOLLOW Suffix Epsilon Propagation (Advanced)
            {
                id: 'q6',
                category: 'FOLLOW Sets',
                difficulty: 'advanced',
                grammar: "E -> T E'\nE' -> + T E' | ε",
                question: "Why does everything in FOLLOW(E) also belong to FOLLOW(T)?",
                options: [
                    "Because in E -> T E', the suffix E' can derive ε, propagating FOLLOW(E) to T",
                    "Because T appears first in the production",
                    "Because T derives terminals",
                    "Because E and T share the same FIRST set"
                ],
                correctIndex: 0,
                explanation: "By Rule 3 of FOLLOW, in E -> T E', because E' can derive ε, there is no terminal blocking the right of T. Therefore, whatever can follow E can also follow T: FOLLOW(E) ⊆ FOLLOW(T)."
            },

            // 7. Parsing Table Lookup (Beginner)
            {
                id: 'q7',
                category: 'Parsing Table',
                difficulty: 'beginner',
                grammar: 'E -> T E’\nE’ -> + T E’ | ε\nT -> F T’\nF -> id',
                question: 'When the stack top is Non-Terminal F and the current lookahead token is id, which production is placed in M[F, id]?',
                options: [
                    'F -> id',
                    'F -> ε',
                    'F -> T',
                    'Error (Cell is empty)'
                ],
                correctIndex: 0,
                explanation: "For rule F -> id, FIRST(id) = {id}. By LL(1) table construction, F -> id is entered in M[F, id]."
            },

            // 8. Epsilon Placement in Table (Intermediate)
            {
                id: 'q8',
                category: 'Parsing Table',
                difficulty: 'intermediate',
                grammar: "E' -> + T E' | ε\nFOLLOW(E') = { ), $ }",
                question: "In which table cells is the epsilon rule E' -> ε placed?",
                options: [
                    "M[E', ')'] and M[E', '$'] (all terminals in FOLLOW(E'))",
                    "M[E', 'ε']",
                    "M[E', '+']",
                    "In every empty cell of the E' row"
                ],
                correctIndex: 0,
                explanation: "By LL(1) construction rules, if A -> ε, then A -> ε is added to cell M[A, b] for every terminal b in FOLLOW(A). Since FOLLOW(E') = { ), $ }, E' -> ε goes into M[E', ')'] and M[E', '$']."
            },

            // 9. Direct Left Recursion Elimination (Beginner)
            {
                id: 'q9',
                category: 'Grammar Transformation',
                difficulty: 'beginner',
                grammar: 'E -> E + T | T',
                question: "How is direct left recursion in 'E -> E + T | T' eliminated?",
                options: [
                    "E -> T E' and E' -> + T E' | ε",
                    "E -> + T E and E -> T",
                    "E -> T + E | ε",
                    "E -> ( E + T )"
                ],
                correctIndex: 0,
                explanation: "For A -> A α | β, the standard transformation introduces A' such that A -> β A' and A' -> α A' | ε. Here α = '+ T' and β = 'T', yielding E -> T E' and E' -> + T E' | ε."
            },

            // 10. Left Factoring (Intermediate)
            {
                id: 'q10',
                category: 'Grammar Transformation',
                difficulty: 'intermediate',
                grammar: 'S -> if E then S else S | if E then S',
                question: "What is the common prefix that requires Left Factoring in the grammar above?",
                options: [
                    "'if E then S'",
                    "'if E'",
                    "'else S'",
                    "'S'"
                ],
                correctIndex: 0,
                explanation: "Both alternatives begin with the exact token sequence 'if E then S'. A predictive parser cannot decide which alternative to expand without looking ahead past the 'then S'. Left factoring isolates 'if E then S' as a shared prefix."
            },

            // 11. FIRST/FIRST Conflict (Intermediate)
            {
                id: 'q11',
                category: 'LL(1) Conflicts',
                difficulty: 'intermediate',
                grammar: 'S -> a B | a C',
                question: "Why is the grammar 'S -> a B | a C' NOT LL(1)?",
                options: [
                    "FIRST/FIRST conflict: Both productions start with terminal 'a', so cell M[S, 'a'] contains both rules",
                    "FIRST/FOLLOW conflict on 'B'",
                    "Left recursion on 'S'",
                    "Because 'a' is not a valid terminal"
                ],
                correctIndex: 0,
                explanation: "Because FIRST(a B) = {a} and FIRST(a C) = {a}, both productions compete for table cell M[S, 'a']. With a single lookahead token 'a', the parser cannot choose deterministically."
            },

            // 12. FIRST/FOLLOW Conflict (Advanced)
            {
                id: 'q12',
                category: 'LL(1) Conflicts',
                difficulty: 'advanced',
                grammar: 'A -> a | ε\nFOLLOW(A) = { a, $ }',
                question: "Why does A -> a | ε with FOLLOW(A) = { a, $ } cause a FIRST/FOLLOW conflict?",
                options: [
                    "Because terminal 'a' appears in both FIRST(A) and FOLLOW(A), creating multiple entries in M[A, 'a']",
                    "Because epsilon cannot appear in FIRST",
                    "Because FOLLOW cannot contain terminals",
                    "Because start symbol is missing"
                ],
                correctIndex: 0,
                explanation: "A -> a puts A -> a into M[A, 'a']. Because A -> ε and 'a' ∈ FOLLOW(A), A -> ε is also entered into M[A, 'a']. The cell M[A, 'a'] contains two competing productions."
            },

            // 13. Stack Operations (Beginner)
            {
                id: 'q13',
                category: 'Stack Operations',
                difficulty: 'beginner',
                grammar: "E -> T E'",
                question: "When production E -> T E' is applied, in what order are symbols pushed onto the parsing stack?",
                options: [
                    "Right-to-left: First E', then T (so T ends up on TOP of the stack)",
                    "Left-to-right: First T, then E'",
                    "Simultaneously in any order",
                    "Only the first symbol T is pushed"
                ],
                correctIndex: 0,
                explanation: "Because the stack is a Last-In, First-Out (LIFO) structure, RHS symbols are pushed in reverse (right-to-left) order so that the leftmost symbol 'T' is at the top of the stack ready for the next operation."
            },

            // 14. Terminal Match Operation (Beginner)
            {
                id: 'q14',
                category: 'Stack Operations',
                difficulty: 'beginner',
                grammar: 'F -> id',
                question: "What happens when Stack TOP is terminal 'id' and current lookahead token is 'id'?",
                options: [
                    "Match: 'id' is popped from the stack, and the lookahead pointer advances to the next token",
                    "A production is looked up in the parsing table",
                    "Syntax Error",
                    "The string is immediately accepted"
                ],
                correctIndex: 0,
                explanation: "When the top of the stack matches the current lookahead terminal, the parser consumes the token: it pops the matching terminal from the stack and advances the input stream pointer."
            },

            // 15. Successful Acceptance Condition (Beginner)
            {
                id: 'q15',
                category: 'String Acceptance',
                difficulty: 'beginner',
                grammar: 'Standard CFG',
                question: "Under what exact condition does an LL(1) predictive parser declare the input string ACCEPTED?",
                options: [
                    "Stack TOP is '$' AND the current input lookahead is '$'",
                    "When the stack becomes completely empty",
                    "When all non-terminals have been expanded",
                    "When the first terminal is matched"
                ],
                correctIndex: 0,
                explanation: "An LL(1) parser accepts if and only if the stack has been completely reduced to the bottom marker '$' simultaneously with the input pointer reaching the end-of-string marker '$'."
            },

            // 16. Syntax Error Detection (Intermediate)
            {
                id: 'q16',
                category: 'String Acceptance',
                difficulty: 'intermediate',
                grammar: "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nF -> ( E ) | id",
                question: "Why is the input string 'id + * id' rejected by the LL(1) parser?",
                options: [
                    "Table lookup M[T, '*'] is empty (blank cell), because '*' cannot legally start a term T",
                    "Stack overflow",
                    "M[E, '+'] has a conflict",
                    "The string has too many tokens"
                ],
                correctIndex: 0,
                explanation: "After consuming 'id +', the stack expects non-terminal T. The lookahead is '*'. The parser looks up M[T, '*'], which is an empty cell (no production can begin with '*'). Thus, a syntax error is raised."
            },

            // 17. LL(1) Grammar Properties (Intermediate)
            {
                id: 'q17',
                category: 'Theory & Concepts',
                difficulty: 'intermediate',
                grammar: 'General Grammar Theory',
                question: 'What does the (1) in LL(1) stand for?',
                options: [
                    'One token of lookahead',
                    'One production rule per non-terminal',
                    'One parsing pass only',
                    'One non-terminal on the stack'
                ],
                correctIndex: 0,
                explanation: "In LL(k), the 'L' stands for Left-to-right scan of the input, the second 'L' stands for Leftmost derivation, and 'k' is the number of tokens of lookahead. For LL(1), k = 1."
            },

            // 18. Ambiguity and LL(1) (Advanced)
            {
                id: 'q18',
                category: 'Theory & Concepts',
                difficulty: 'advanced',
                grammar: 'General Grammar Theory',
                question: 'Can an ambiguous context-free grammar EVER be LL(1)?',
                options: [
                    'No, never! Ambiguous grammars are provably never LL(1)',
                    'Yes, always',
                    'Yes, if left factoring is applied',
                    'Yes, if left recursion is eliminated'
                ],
                correctIndex: 0,
                explanation: "Theorem: An ambiguous context-free grammar can NEVER be LL(1). Ambiguity implies that there exists a string with two distinct leftmost derivations, which inevitably produces multiple entries (a conflict) in the LL(1) parsing table."
            }
        ];
    }

    /**
     * Initializes a new quiz session filtered by difficulty.
     */
    startQuiz(filter = 'all', count = 18) {
        this.filter = filter;
        let pool = this.questions;
        if (filter !== 'all') {
            pool = this.questions.filter(q => q.difficulty === filter);
        }

        // Shuffle questions
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        this.currentQuiz = shuffled.slice(0, Math.min(count, shuffled.length));
        this.activeQuestions = this.currentQuiz;
        this.currentIndex = 0;
        this.userAnswers = {};
        this.score = 0;
        return this.getCurrentQuestion();
    }

    setDifficultyFilter(filter) {
        return this.startQuiz(filter, 18);
    }

    reset() {
        return this.startQuiz(this.filter, 18);
    }

    getCurrentQuestion() {
        if (this.currentQuiz.length === 0 || this.currentIndex >= this.currentQuiz.length) {
            return null;
        }
        const rawQ = this.currentQuiz[this.currentIndex];
        const selected = this.userAnswers[rawQ.id] ?? null;

        return {
            ...rawQ,
            question: rawQ.question,
            rawQuestion: rawQ,
            index: this.currentIndex,
            total: this.currentQuiz.length,
            selectedOption: selected,
            userAnswerIndex: selected
        };
    }

    getStats() {
        const answered = Object.keys(this.userAnswers).length;
        const total = this.currentQuiz.length;
        const score = this.score;
        return {
            currentIndex: this.currentIndex,
            total,
            answered,
            score,
            scorePercentage: total > 0 ? Math.round((score / total) * 100) : 0,
            progressPercentage: total > 0 ? Math.round((answered / total) * 100) : 0
        };
    }

    getIncorrectQuestions() {
        const results = this.getResults();
        return results.incorrectDetails;
    }

    submitAnswer(optionIndex) {
        const q = this.currentQuiz[this.currentIndex];
        if (!q) return null;

        const isCorrect = (optionIndex === q.correctIndex);
        const wasAlreadyAnswered = this.userAnswers.hasOwnProperty(q.id);

        if (!wasAlreadyAnswered && isCorrect) {
            this.score++;
        }

        this.userAnswers[q.id] = optionIndex;

        return {
            isCorrect,
            correctIndex: q.correctIndex,
            selectedOption: optionIndex,
            explanation: q.explanation,
            currentScore: this.score,
            totalAnswered: Object.keys(this.userAnswers).length,
            totalQuestions: this.currentQuiz.length
        };
    }

    nextQuestion() {
        if (this.currentIndex < this.currentQuiz.length - 1) {
            this.currentIndex++;
            return this.getCurrentQuestion();
        }
        return null;
    }

    prevQuestion() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return this.getCurrentQuestion();
        }
        return null;
    }

    getResults() {
        const total = this.currentQuiz.length;
        const correct = this.score;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        const incorrect = [];

        this.currentQuiz.forEach((q, idx) => {
            const userChoice = this.userAnswers[q.id];
            if (userChoice !== q.correctIndex) {
                incorrect.push({
                    questionNumber: idx + 1,
                    question: q.question,
                    category: q.category,
                    userAnswer: userChoice !== undefined ? q.options[userChoice] : 'Unanswered',
                    correctAnswer: q.options[q.correctIndex],
                    explanation: q.explanation
                });
            }
        });

        return {
            total,
            correct,
            incorrectCount: incorrect.length,
            percentage,
            incorrectDetails: incorrect,
            passed: percentage >= 70
        };
    }
}

// Export for Node.js test environment or browser global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuizEngine;
} else if (typeof window !== 'undefined') {
    window.QuizEngine = QuizEngine;
}
