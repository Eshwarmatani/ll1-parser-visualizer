from ll1_parser import Grammar, FirstCalculator, FollowCalculator, ParsingTable, LL1Parser

test_suites = [
    {
        "name": "Grammar 1: Classic Arithmetic Expression (Dragon Book)",
        "grammar": """E  -> T E'
E' -> + T E' | ε
T  -> F T'
T' -> * F T' | ε
F  -> ( E ) | id""",
        "expected_first": {
            "E": {"(", "id"},
            "E'": {"+", "ε"},
            "T": {"(", "id"},
            "T'": {"*", "ε"},
            "F": {"(", "id"}
        },
        "expected_follow": {
            "E": {")", "$"},
            "E'": {")", "$"},
            "T": {")", "+", "$"},
            "T'": {")", "+", "$"},
            "F": {")", "*", "+", "$"}
        },
        "expected_ll1": True,
        "expected_conflicts": 0
    },
    {
        "name": "Grammar 2: Multivariable Nullable Cascade (Dragon Book Ex 4.28)",
        "grammar": """S -> A B C
A -> a | ε
B -> b | ε
C -> c | d""",
        "expected_first": {
            "S": {"a", "b", "c", "d"},
            "A": {"a", "ε"},
            "B": {"b", "ε"},
            "C": {"c", "d"}
        },
        "expected_follow": {
            "S": {"$"},
            "A": {"b", "c", "d"},
            "B": {"c", "d"},
            "C": {"$"}
        },
        "expected_ll1": True,
        "expected_conflicts": 0
    },
    {
        "name": "Grammar 3: Mutual End-Recursion (E -> T E', E' -> + E | ε)",
        "grammar": """E  -> T E'
E' -> + E | ε
T  -> id""",
        "expected_first": {
            "E": {"id"},
            "E'": {"+", "ε"},
            "T": {"id"}
        },
        "expected_follow": {
            "E": {"$"},
            "E'": {"$"},
            "T": {"+", "$"}
        },
        "expected_ll1": True,
        "expected_conflicts": 0
    },
    {
        "name": "Grammar 4: Repeated Nullables (S -> A a A b | B b B a)",
        "grammar": """S -> A a A b | B b B a
A -> ε
B -> ε""",
        "expected_first": {
            "S": {"a", "b"},
            "A": {"ε"},
            "B": {"ε"}
        },
        "expected_follow": {
            "S": {"$"},
            "A": {"a", "b"},
            "B": {"a", "b"}
        },
        "expected_ll1": True,
        "expected_conflicts": 0
    },
    {
        "name": "Grammar 5: FIRST/FIRST Conflict (If-Else Dangling Prefix)",
        "grammar": """S -> if E then S else S | if E then S | a
E -> b""",
        "expected_first": {
            "S": {"a", "if"},
            "E": {"b"}
        },
        "expected_follow": {
            "S": {"$", "else"},
            "E": {"then"}
        },
        "expected_ll1": False,
        "expected_min_conflicts": 1
    },
    {
        "name": "Grammar 6: FIRST/FOLLOW Conflict (Nullable Non-terminal with Overlap)",
        "grammar": """S -> A a b
A -> a | ε""",
        "expected_first": {
            "S": {"a"},
            "A": {"a", "ε"}
        },
        "expected_follow": {
            "S": {"$"},
            "A": {"a"}
        },
        "expected_ll1": False,
        "expected_min_conflicts": 1
    },
    {
        "name": "Grammar 7: Parentheses Nesting (Dyck language, LL(1))",
        "grammar": """S -> ( S ) S | ε""",
        "expected_first": {
            "S": {"(", "ε"}
        },
        "expected_follow": {
            "S": {")", "$"}
        },
        "expected_ll1": True,
        "expected_conflicts": 0
    },
    {
        "name": "Grammar 8: FIRST/FOLLOW Overlap (A -> a | ε, B -> a | b)",
        "grammar": """S -> A B
A -> a | ε
B -> a | b""",
        "expected_first": {
            "S": {"a", "b"},
            "A": {"a", "ε"},
            "B": {"a", "b"}
        },
        "expected_follow": {
            "S": {"$"},
            "A": {"a", "b"},
            "B": {"$"}
        },
        "expected_ll1": False,
        "expected_min_conflicts": 1
    },
    {
        "name": "Grammar 9: Pure Non-Terminal Chain (S -> A, A -> B, B -> C, C -> d | ε)",
        "grammar": """S -> A
A -> B
B -> C
C -> d | ε""",
        "expected_first": {
            "S": {"d", "ε"},
            "A": {"d", "ε"},
            "B": {"d", "ε"},
            "C": {"d", "ε"}
        },
        "expected_follow": {
            "S": {"$"},
            "A": {"$"},
            "B": {"$"},
            "C": {"$"}
        },
        "expected_ll1": True,
        "expected_conflicts": 0
    }
]

print("=" * 80)
print("PYTHON ENGINE: RIGOROUS MATHEMATICAL VERIFICATION OF FIRST, FOLLOW & TABLE")
print("=" * 80 + "\n")

all_ok = True
for s in test_suites:
    print(f"Checking {s['name']}...")
    g = Grammar(s['grammar'])
    fc = FirstCalculator(g)
    fc.compute()
    foc = FollowCalculator(g, fc)
    foc.compute()
    pt = ParsingTable(g, fc, foc)
    pt.generate()

    # Verify FIRST
    for nt, exp in s['expected_first'].items():
        act = fc.sets.get(nt, set())
        if act != exp:
            print(f"  ❌ FIRST({nt}) mismatch! Expected: {exp}, Got: {act}")
            all_ok = False
    print("  ✅ FIRST sets verified")

    # Verify FOLLOW
    for nt, exp in s['expected_follow'].items():
        act = foc.sets.get(nt, set())
        if act != exp:
            print(f"  ❌ FOLLOW({nt}) mismatch! Expected: {exp}, Got: {act}")
            all_ok = False
    print("  ✅ FOLLOW sets verified")

    # Verify LL1
    if "expected_ll1" in s:
        if pt.is_ll1 != s["expected_ll1"]:
            print(f"  ❌ LL(1) mismatch! Expected {s['expected_ll1']}, Got {pt.is_ll1}")
            all_ok = False
        else:
            print(f"  ✅ LL(1) verified: {pt.is_ll1}")

    if "expected_conflicts" in s:
        if len(pt.conflicts) != s["expected_conflicts"]:
            print(f"  ❌ Conflict count mismatch! Expected {s['expected_conflicts']}, Got {len(pt.conflicts)}")
            all_ok = False
        else:
            print(f"  ✅ Conflicts count: {len(pt.conflicts)}")

    if "expected_min_conflicts" in s:
        if len(pt.conflicts) < s["expected_min_conflicts"]:
            print(f"  ❌ Expected >= {s['expected_min_conflicts']} conflicts, Got {len(pt.conflicts)}")
            all_ok = False
        else:
            print(f"  ✅ Conflicts detected: {len(pt.conflicts)}")
    print()

if all_ok:
    print("=" * 80)
    print("🎉 ALL 9 TEST SUITES VERIFIED AND CONFIRMED 100% CORRECT IN PYTHON!")
    print("=" * 80)
else:
    print("FAILURES DETECTED IN PYTHON ENGINE!")
    exit(1)

