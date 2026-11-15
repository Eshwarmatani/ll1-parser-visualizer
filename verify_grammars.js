const Grammar = require('./js/grammar.js');
const FirstCalculator = require('./js/first.js');
const FollowCalculator = require('./js/follow.js');
const ParsingTableGenerator = require('./js/table.js');
const LL1Parser = require('./js/parser.js');

function setsEqual(s1, s2) {
    if (!s1 || !s2) return false;
    const a1 = Array.from(s1).sort();
    const a2 = Array.from(s2).sort();
    if (a1.length !== a2.length) return false;
    return a1.every((val, idx) => val === a2[idx]);
}

const testSuites = [
    {
        name: "Grammar 1: Classic Arithmetic Expression (Dragon Book)",
        grammar: `E  -> T E'
E' -> + T E' | ε
T  -> F T'
T' -> * F T' | ε
F  -> ( E ) | id`,
        expectedFirst: {
            "E": ["(", "id"],
            "E'": ["+", "ε"],
            "T": ["(", "id"],
            "T'": ["*", "ε"],
            "F": ["(", "id"]
        },
        expectedFollow: {
            "E": [")", "$"],
            "E'": [")", "$"],
            "T": [")", "+", "$"],
            "T'": [")", "+", "$"],
            "F": [")", "*", "+", "$"]
        },
        expectedLL1: true,
        expectedConflictsCount: 0
    },
    {
        name: "Grammar 2: Multivariable Nullable Cascade (Dragon Book Ex 4.28)",
        grammar: `S -> A B C
A -> a | ε
B -> b | ε
C -> c | d`,
        expectedFirst: {
            "S": ["a", "b", "c", "d"],
            "A": ["a", "ε"],
            "B": ["b", "ε"],
            "C": ["c", "d"]
        },
        expectedFollow: {
            "S": ["$"],
            "A": ["b", "c", "d"],
            "B": ["c", "d"],
            "C": ["$"]
        },
        expectedLL1: true,
        expectedConflictsCount: 0
    },
    {
        name: "Grammar 3: Mutual End-Recursion (E -> T E', E' -> + E | ε)",
        grammar: `E  -> T E'
E' -> + E | ε
T  -> id`,
        expectedFirst: {
            "E": ["id"],
            "E'": ["+", "ε"],
            "T": ["id"]
        },
        expectedFollow: {
            "E": ["$"],
            "E'": ["$"],
            "T": ["+", "$"]
        },
        expectedLL1: true,
        expectedConflictsCount: 0
    },
    {
        name: "Grammar 4: Repeated Nullables (S -> A a A b | B b B a)",
        grammar: `S -> A a A b | B b B a
A -> ε
B -> ε`,
        expectedFirst: {
            "S": ["a", "b"],
            "A": ["ε"],
            "B": ["ε"]
        },
        expectedFollow: {
            "S": ["$"],
            "A": ["a", "b"],
            "B": ["a", "b"]
        },
        expectedLL1: true,
        expectedConflictsCount: 0
    },
    {
        name: "Grammar 5: FIRST/FIRST Conflict (If-Else Dangling Prefix)",
        grammar: `S -> if E then S else S | if E then S | a
E -> b`,
        expectedFirst: {
            "S": ["a", "if"],
            "E": ["b"]
        },
        expectedFollow: {
            "S": ["$", "else"],
            "E": ["then"]
        },
        expectedLL1: false,
        expectedMinConflicts: 1
    },
    {
        name: "Grammar 6: FIRST/FOLLOW Conflict (Nullable Non-terminal with Overlap)",
        grammar: `S -> A a b
A -> a | ε`,
        expectedFirst: {
            "S": ["a"],
            "A": ["a", "ε"]
        },
        expectedFollow: {
            "S": ["$"],
            "A": ["a"]
        },
        expectedLL1: false,
        expectedMinConflicts: 1
    },
    {
        name: "Grammar 7: Parentheses Nesting (Dyck language, LL(1))",
        grammar: `S -> ( S ) S | ε`,
        expectedFirst: {
            "S": ["(", "ε"]
        },
        expectedFollow: {
            "S": [")", "$"]
        },
        expectedLL1: true,
        expectedConflictsCount: 0
    },
    {
        name: "Grammar 8: FIRST/FOLLOW Overlap (A -> a | ε, B -> a | b)",
        grammar: `S -> A B
A -> a | ε
B -> a | b`,
        expectedFirst: {
            "S": ["a", "b"],
            "A": ["a", "ε"],
            "B": ["a", "b"]
        },
        expectedFollow: {
            "S": ["$"],
            "A": ["a", "b"],
            "B": ["$"]
        },
        expectedLL1: false,
        expectedMinConflicts: 1
    },
    {
        name: "Grammar 9: Pure Non-Terminal Chain (S -> A, A -> B, B -> C, C -> d | ε)",
        grammar: `S -> A
A -> B
B -> C
C -> d | ε`,
        expectedFirst: {
            "S": ["d", "ε"],
            "A": ["d", "ε"],
            "B": ["d", "ε"],
            "C": ["d", "ε"]
        },
        expectedFollow: {
            "S": ["$"],
            "A": ["$"],
            "B": ["$"],
            "C": ["$"]
        },
        expectedLL1: true,
        expectedConflictsCount: 0
    }
];

console.log("================================================================================");
console.log("       RIGOROUS MATHEMATICAL VERIFICATION OF FIRST, FOLLOW & PARSING TABLE     ");
console.log("================================================================================\n");

let allPassed = true;

for (const suite of testSuites) {
    console.log(`Checking ${suite.name}...`);
    const g = new Grammar(suite.grammar);
    const fc = new FirstCalculator(g);
    const computedFirst = fc.compute();
    const foc = new FollowCalculator(g, fc);
    const computedFollow = foc.compute();
    const tg = new ParsingTableGenerator(g, fc, foc);
    const tableData = tg.generate();

    // Verify FIRST sets
    let firstOk = true;
    for (const nt of Object.keys(suite.expectedFirst)) {
        const expected = new Set(suite.expectedFirst[nt]);
        const actual = fc.sets.get(nt) || new Set();
        if (!setsEqual(expected, actual)) {
            console.error(`  ❌ FIRST(${nt}) MISMATCH! Expected: [${Array.from(expected).join(', ')}], Got: [${Array.from(actual).join(', ')}]`);
            firstOk = false;
        }
    }
    if (firstOk) console.log(`  ✅ FIRST sets verified`);
    else allPassed = false;

    // Verify FOLLOW sets
    let followOk = true;
    for (const nt of Object.keys(suite.expectedFollow)) {
        const expected = new Set(suite.expectedFollow[nt]);
        const actual = foc.sets.get(nt) || new Set();
        if (!setsEqual(expected, actual)) {
            console.error(`  ❌ FOLLOW(${nt}) MISMATCH! Expected: [${Array.from(expected).join(', ')}], Got: [${Array.from(actual).join(', ')}]`);
            followOk = false;
        }
    }
    if (followOk) console.log(`  ✅ FOLLOW sets verified`);
    else allPassed = false;

    // Verify LL(1) Compatibility
    if (suite.expectedLL1 !== undefined) {
        if (tableData.isLL1 !== suite.expectedLL1) {
            console.error(`  ❌ LL(1) Verdict MISMATCH! Expected isLL1=${suite.expectedLL1}, Got: ${tableData.isLL1}`);
            allPassed = false;
        } else {
            console.log(`  ✅ LL(1) compatibility verified: isLL1=${tableData.isLL1}`);
        }
    }

    if (suite.expectedConflictsCount !== undefined) {
        if (tableData.conflicts.length !== suite.expectedConflictsCount) {
            console.error(`  ❌ Conflicts count MISMATCH! Expected ${suite.expectedConflictsCount}, Got: ${tableData.conflicts.length}`);
            allPassed = false;
        } else {
            console.log(`  ✅ Conflicts count verified: ${tableData.conflicts.length}`);
        }
    }

    if (suite.expectedMinConflicts !== undefined) {
        if (tableData.conflicts.length < suite.expectedMinConflicts) {
            console.error(`  ❌ Expected at least ${suite.expectedMinConflicts} conflicts, Got: ${tableData.conflicts.length}`);
            allPassed = false;
        } else {
            console.log(`  ✅ Expected conflicts detected: ${tableData.conflicts.length}`);
        }
    }

    console.log();
}

if (allPassed) {
    console.log("================================================================================");
    console.log("🎉 ALL 8 TEST SUITES VERIFIED AND CONFIRMED 100% CORRECT!");
    console.log("================================================================================");
} else {
    console.error("FAILURES DETECTED! Review outputs above.");
    process.exit(1);
}
