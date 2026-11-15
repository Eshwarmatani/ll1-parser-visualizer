from ll1_parser import Grammar, FirstCalculator, FollowCalculator, ParsingTable, LL1Parser

print("=" * 80)
print("PYTHON: TESTING RECURSION, CONFLICTS, MALFORMED & INVALID CASES")
print("=" * 80 + "\n")

all_passed = True

# 1. Left Recursion (Direct & Indirect)
print("--- 1. Testing Left Recursion ---")
g_dir = Grammar("E -> E + T | T\nT -> id")
print("1A Direct LR:", g_dir.warnings)
if any("Direct Left Recursion in 'E'" in w for w in g_dir.warnings):
    print("  ✅ PASS: Direct Left Recursion identified in 'E'")
else:
    print("  ❌ FAIL: Direct Left Recursion missed")
    all_passed = False

g_ind = Grammar("A -> B a | c\nB -> A b | d")
print("1B Indirect LR:", g_ind.warnings)
if any("Indirect Left Recursion" in w for w in g_ind.warnings):
    print("  ✅ PASS: Indirect Left Recursion identified in 'A' & 'B'")
else:
    print("  ❌ FAIL: Indirect Left Recursion missed")
    all_passed = False

# 2. FIRST/FIRST Conflict
print("\n--- 2. Testing FIRST/FIRST Conflicts ---")
g_ff = Grammar("S -> if E then S else S | if E then S | a\nE -> b")
fc_ff = FirstCalculator(g_ff)
fc_ff.compute()
foc_ff = FollowCalculator(g_ff, fc_ff)
foc_ff.compute()
pt_ff = ParsingTable(g_ff, fc_ff, foc_ff)
pt_ff.generate()
print("FIRST/FIRST conflicts:", pt_ff.conflicts)
if not pt_ff.is_ll1 and any("M[S, 'if']" in c for c in pt_ff.conflicts):
    print("  ✅ PASS: FIRST/FIRST conflict detected in M[S, 'if']")
else:
    print("  ❌ FAIL: FIRST/FIRST conflict missed")
    all_passed = False

# 3. FIRST/FOLLOW Conflict
print("\n--- 3. Testing FIRST/FOLLOW Conflicts ---")
g_ffo = Grammar("S -> A a b\nA -> a | ε")
fc_ffo = FirstCalculator(g_ffo)
fc_ffo.compute()
foc_ffo = FollowCalculator(g_ffo, fc_ffo)
foc_ffo.compute()
pt_ffo = ParsingTable(g_ffo, fc_ffo, foc_ffo)
pt_ffo.generate()
print("FIRST/FOLLOW conflicts:", pt_ffo.conflicts)
if not pt_ffo.is_ll1 and any("M[A, 'a']" in c for c in pt_ffo.conflicts):
    print("  ✅ PASS: FIRST/FOLLOW conflict detected in M[A, 'a']")
else:
    print("  ❌ FAIL: FIRST/FOLLOW conflict missed")
    all_passed = False

# 4. Malformed Productions
print("\n--- 4. Testing Malformed Productions Handling ---")
try:
    Grammar("")
    print("  ❌ FAIL: Empty grammar did not raise ValueError")
    all_passed = False
except ValueError as e:
    print(f"  ✅ PASS: Empty grammar properly caught: '{e}'")

# 5. Invalid Input Strings
print("\n--- 5. Testing Invalid Input Strings ---")
g_std = Grammar("E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id")
fc_std = FirstCalculator(g_std)
fc_std.compute()
foc_std = FollowCalculator(g_std, fc_std)
foc_std.compute()
pt_std = ParsingTable(g_std, fc_std, foc_std)
pt_std.generate()
parser = LL1Parser(g_std, pt_std)

invalid_inputs = [
    ("id + * id", "Consecutive operators (+ *)"),
    ("+ id", "Missing leading operand (+ id)"),
    ("id +", "Missing trailing operand (id +)"),
    ("( id + id", "Unclosed opening parenthesis"),
    ("id + id )", "Unmatched closing parenthesis"),
    (") id + id (", "Reversed parentheses"),
    ("id id", "Missing operator between identifiers"),
    ("", "Empty string"),
    ("   ", "Whitespace only"),
    ("id + @#$ * id", "Lexical unknown characters (@#$)")
]

for inp, label in invalid_inputs:
    ok, msg = parser.parse(inp, print_trace=False)
    if not ok:
        print(f"  ✅ PASS: {label:<35} => REJECTED ({msg})")
    else:
        print(f"  ❌ FAIL: {label} was unexpectedly ACCEPTED!")
        all_passed = False

print("\n" + "=" * 80)
if all_passed:
    print("🎉 ALL EDGE-CASE TESTS IN PYTHON EVALUATED AND PASSED PERFECTLY!")
else:
    print("FAILURES DETECTED IN PYTHON EDGE-CASE SUITE!")
print("=" * 80)

