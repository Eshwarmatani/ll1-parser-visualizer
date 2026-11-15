"""
============================================================================
Project: LL(1) Predictive Parser Core Engine (Python 3 Implementation)
Course:  Compiler Construction (CC) University Final Project
Description: Standalone, zero-dependency Python implementation of Context-Free
             Grammar processing, FIRST/FOLLOW calculation, parsing table
             construction, and stack-based parsing simulation.
============================================================================
"""

import sys
from typing import Dict, List, Set, Tuple, Optional

EPSILON = 'ε'
END_MARKER = '$'

class Production:
    def __init__(self, rule_id: int, lhs: str, rhs: List[str]):
        self.id = rule_id
        self.lhs = lhs
        self.rhs = rhs
        self.raw_rhs = ' '.join(rhs)

    def __repr__(self):
        return f"{self.lhs} -> {self.raw_rhs}"


class Grammar:
    def __init__(self, grammar_text: str):
        self.raw_text = grammar_text
        self.rules: List[Production] = []
        self.non_terminals: List[str] = []
        self.terminals: List[str] = []
        self.start_symbol: Optional[str] = None
        self.warnings: List[str] = []
        self.parse_grammar(grammar_text)

    def parse_grammar(self, text: str):
        self.rules = []
        self.non_terminals = []
        self.terminals = []
        self.start_symbol = None
        self.warnings = []

        lines = [line.strip() for line in text.strip().split('\n') if line.strip() and not line.strip().startswith(('#', '//'))]
        if not lines:
            raise ValueError("Grammar text cannot be empty.")

        # Phase 1: Collect Non-Terminals from LHS
        for line in lines:
            arrow = '->' if '->' in line else ('::=' if '::=' in line else ('=>' if '=>' in line else None))
            if not arrow:
                continue
            lhs = line.split(arrow)[0].strip()
            if lhs and lhs not in self.non_terminals:
                self.non_terminals.append(lhs)
                if not self.start_symbol:
                    self.start_symbol = lhs

        # Phase 2: Parse RHS alternatives
        rule_counter = 1
        eps_aliases = {'epsilon', 'EPSILON', 'eps', 'EPS', 'ε', '^', '#'}

        for line in lines:
            arrow = '->' if '->' in line else ('::=' if '::=' in line else ('=>' if '=>' in line else None))
            if not arrow:
                continue
            lhs, rhs_all = line.split(arrow, 1)
            lhs = lhs.strip()
            alternatives = rhs_all.split('|')

            for alt in alternatives:
                tokens = self.tokenize_rhs(alt.strip(), eps_aliases)
                self.rules.append(Production(rule_counter, lhs, tokens))
                rule_counter += 1

        # Phase 3: Identify Terminals
        nt_set = set(self.non_terminals)
        term_set = set()
        for r in self.rules:
            for sym in r.rhs:
                if sym != EPSILON and sym != END_MARKER and sym not in nt_set:
                    term_set.add(sym)
        self.terminals = sorted(list(term_set))

        # Phase 4: Left Recursion Check (Direct & Indirect)
        for nt in self.non_terminals:
            nt_rules = [r for r in self.rules if r.lhs == nt]
            lr_rules = [r for r in nt_rules if r.rhs and r.rhs[0] == nt]
            if lr_rules:
                self.warnings.append(f"Direct Left Recursion in '{nt}': {', '.join(str(r) for r in lr_rules)}")

        # Indirect Left Recursion via graph cycle detection
        leading_graph: Dict[str, Set[str]] = {nt: set() for nt in self.non_terminals}
        for r in self.rules:
            A = r.lhs
            for sym in r.rhs:
                if self.is_non_terminal(sym) and sym != A:
                    leading_graph[A].add(sym)
                # If sym cannot derive epsilon, stop looking right
                sym_rules = [sr for sr in self.rules if sr.lhs == sym]
                is_nullable = any(len(sr.rhs) == 1 and sr.rhs[0] == EPSILON for sr in sym_rules)
                if not is_nullable:
                    break

        for nt in self.non_terminals:
            visited = set()
            path = []

            def dfs(curr: str) -> bool:
                visited.add(curr)
                path.append(curr)
                for neighbor in leading_graph.get(curr, set()):
                    if neighbor == nt and len(path) > 1:
                        cycle_str = ' ⇒ '.join(path + [nt])
                        self.warnings.append(f"Indirect Left Recursion in '{nt}': Chain {cycle_str}")
                        return True
                    if neighbor not in visited:
                        if dfs(neighbor):
                            return True
                path.pop()
                return False

            dfs(nt)

    def tokenize_rhs(self, alt: str, eps_aliases: Set[str]) -> List[str]:
        if not alt or alt in eps_aliases:
            return [EPSILON]

        parts = alt.split()
        tokens = []
        sorted_nt = sorted(self.non_terminals, key=len, reverse=True)

        for part in parts:
            if part in eps_aliases:
                tokens.append(EPSILON)
                continue
            if part in self.non_terminals:
                tokens.append(part)
                continue

            i = 0
            while i < len(part):
                matched = False
                for nt in sorted_nt:
                    if part.startswith(nt, i):
                        tokens.append(nt)
                        i += len(nt)
                        matched = True
                        break
                if matched:
                    continue

                if part[i] in '()+-*/=;,|<>':
                    tokens.append(part[i])
                    i += 1
                    continue

                # Identifiers or words
                j = i
                while j < len(part) and (part[j].isalnum() or part[j] == '_'):
                    j += 1
                if j > i:
                    tokens.append(part[i:j])
                    i = j
                else:
                    tokens.append(part[i])
                    i += 1

        if len(tokens) > 1:
            tokens = [t for t in tokens if t != EPSILON]
        return tokens if tokens else [EPSILON]

    def is_non_terminal(self, sym: str) -> bool:
        return sym in self.non_terminals

    def is_terminal(self, sym: str) -> bool:
        return sym in self.terminals


class GrammarTransformer:
    """
    Grammar Transformation Engine in Python:
    1. Direct Left Recursion Elimination: A -> A a | b => A -> b A', A' -> a A' | eps
    2. Left Factoring: A -> a b1 | a b2 => A -> a A', A' -> b1 | b2
    """
    def __init__(self, grammar: Grammar):
        self.grammar = grammar

    def eliminate_direct_left_recursion(self) -> Tuple[str, List[str]]:
        new_rules: Dict[str, List[List[str]]] = {}
        steps: List[str] = []

        for nt in self.grammar.non_terminals:
            rules = [r for r in self.grammar.rules if r.lhs == nt]
            alpha_list: List[List[str]] = []
            beta_list: List[List[str]] = []

            for r in rules:
                if r.rhs and r.rhs[0] == nt:
                    tail = r.rhs[1:] if len(r.rhs) > 1 else [EPSILON]
                    alpha_list.append(tail)
                else:
                    beta_list.append(r.rhs if r.rhs else [EPSILON])

            if alpha_list:
                prime_nt = f"{nt}'"
                while prime_nt in self.grammar.non_terminals or prime_nt in new_rules:
                    prime_nt += "'"

                effective_betas = beta_list if beta_list else [[f"{nt}_base"]]
                new_a_rules = [b + [prime_nt] if b != [EPSILON] else [prime_nt] for b in effective_betas]
                new_prime_rules = [a + [prime_nt] if a != [EPSILON] else [prime_nt] for a in alpha_list]
                new_prime_rules.append([EPSILON])

                new_rules[nt] = new_a_rules
                new_rules[prime_nt] = new_prime_rules
                steps.append(f"Eliminated direct left recursion on '{nt}' -> introduced '{prime_nt}'")
            else:
                new_rules[nt] = [r.rhs for r in rules]

        lines = [f"{nt} -> {' | '.join(' '.join(alt) for alt in alts)}" for nt, alts in new_rules.items()]
        return '\n'.join(lines), steps

    def left_factor(self) -> Tuple[str, List[str]]:
        new_rules: Dict[str, List[List[str]]] = {}
        steps: List[str] = []

        for nt in self.grammar.non_terminals:
            current_alts = [list(r.rhs) for r in self.grammar.rules if r.lhs == nt]
            prime_count = 1

            # Find common prefix of length >= 1
            changed = True
            while changed and len(current_alts) >= 2:
                changed = False
                prefix_map: Dict[str, List[List[str]]] = {}
                for alt in current_alts:
                    if alt and alt[0] != EPSILON:
                        leader = alt[0]
                        prefix_map.setdefault(leader, []).append(alt)

                for leader, matching in prefix_map.items():
                    if len(matching) >= 2:
                        changed = True
                        prime_nt = f"{nt}{"'" * prime_count}"
                        prime_count += 1

                        non_matching = [a for a in current_alts if a not in matching]
                        suffixes = [a[1:] if len(a) > 1 else [EPSILON] for a in matching]
                        current_alts = non_matching + [[leader, prime_nt]]
                        new_rules[prime_nt] = suffixes
                        steps.append(f"Left-factored common prefix '{leader}' from '{nt}' -> introduced '{prime_nt}'")
                        break

            new_rules[nt] = current_alts

        lines = [f"{nt} -> {' | '.join(' '.join(alt) for alt in alts)}" for nt, alts in new_rules.items()]
        return '\n'.join(lines), steps


class FirstCalculator:
    def __init__(self, grammar: Grammar):
        self.grammar = grammar
        self.sets: Dict[str, Set[str]] = {nt: set() for nt in grammar.non_terminals}

    def compute(self):
        changed = True
        iterations = 0
        while changed and iterations < 50:
            changed = False
            iterations += 1
            for rule in self.grammar.rules:
                A = rule.lhs
                first_A = self.sets[A]
                rhs = rule.rhs

                if not rhs or (len(rhs) == 1 and rhs[0] == EPSILON):
                    if EPSILON not in first_A:
                        first_A.add(EPSILON)
                        changed = True
                    continue

                all_derive_eps = True
                for sym in rhs:
                    if self.grammar.is_terminal(sym):
                        if sym not in first_A:
                            first_A.add(sym)
                            changed = True
                        all_derive_eps = False
                        break
                    elif self.grammar.is_non_terminal(sym):
                        first_sym = self.sets[sym]
                        for s in first_sym:
                            if s != EPSILON and s not in first_A:
                                first_A.add(s)
                                changed = True
                        if EPSILON not in first_sym:
                            all_derive_eps = False
                            break

                if all_derive_eps and EPSILON not in first_A:
                    first_A.add(EPSILON)
                    changed = True

    def compute_for_sequence(self, sequence: List[str]) -> Set[str]:
        result = set()
        if not sequence:
            result.add(EPSILON)
            return result

        all_derive_eps = True
        for sym in sequence:
            if sym == EPSILON:
                continue
            if self.grammar.is_terminal(sym):
                result.add(sym)
                all_derive_eps = False
                break
            elif self.grammar.is_non_terminal(sym):
                sym_first = self.sets.get(sym, set())
                result.update(s for s in sym_first if s != EPSILON)
                if EPSILON not in sym_first:
                    all_derive_eps = False
                    break

        if all_derive_eps:
            result.add(EPSILON)
        return result


class FollowCalculator:
    def __init__(self, grammar: Grammar, first_calc: FirstCalculator):
        self.grammar = grammar
        self.first_calc = first_calc
        self.sets: Dict[str, Set[str]] = {nt: set() for nt in grammar.non_terminals}

    def compute(self):
        # Rule 1: Add '$' to start symbol
        if self.grammar.start_symbol:
            self.sets[self.grammar.start_symbol].add(END_MARKER)

        changed = True
        iterations = 0
        while changed and iterations < 50:
            changed = False
            iterations += 1
            for rule in self.grammar.rules:
                A = rule.lhs
                rhs = rule.rhs

                for i, B in enumerate(rhs):
                    if not self.grammar.is_non_terminal(B):
                        continue

                    follow_B = self.sets[B]
                    beta = rhs[i + 1:]

                    if beta:
                        first_beta = self.first_calc.compute_for_sequence(beta)
                        for s in first_beta:
                            if s != EPSILON and s not in follow_B:
                                follow_B.add(s)
                                changed = True

                    beta_can_derive_eps = (not beta) or (EPSILON in self.first_calc.compute_for_sequence(beta))
                    if beta_can_derive_eps and A != B:
                        follow_A = self.sets[A]
                        for s in follow_A:
                            if s not in follow_B:
                                follow_B.add(s)
                                changed = True


class ParsingTable:
    def __init__(self, grammar: Grammar, first_calc: FirstCalculator, follow_calc: FollowCalculator):
        self.grammar = grammar
        self.first_calc = first_calc
        self.follow_calc = follow_calc
        self.table: Dict[str, Dict[str, List[Production]]] = {}
        self.conflicts: List[str] = []
        self.is_ll1 = True
        self.terminals_with_dollar = self.grammar.terminals + [END_MARKER]

    def generate(self):
        self.table = {nt: {t: [] for t in self.terminals_with_dollar} for nt in self.grammar.non_terminals}
        self.conflicts = []
        self.is_ll1 = True

        for rule in self.grammar.rules:
            A = rule.lhs
            first_alpha = self.first_calc.compute_for_sequence(rule.rhs)

            for a in first_alpha:
                if a != EPSILON:
                    self.table[A][a].append(rule)

            if EPSILON in first_alpha:
                follow_A = self.follow_calc.sets.get(A, set())
                for b in follow_A:
                    self.table[A][b].append(rule)

        for nt in self.grammar.non_terminals:
            for t in self.terminals_with_dollar:
                if len(self.table[nt][t]) > 1:
                    self.is_ll1 = False
                    rules_str = ' vs '.join(str(r) for r in self.table[nt][t])
                    self.conflicts.append(f"Conflict in cell M[{nt}, '{t}']: {rules_str}")


class LL1Parser:
    def __init__(self, grammar: Grammar, table: ParsingTable):
        self.grammar = grammar
        self.table = table

    def tokenize(self, input_string: str) -> List[str]:
        raw = input_string.strip()
        if not raw:
            return [END_MARKER]

        sorted_terminals = sorted(self.grammar.terminals, key=len, reverse=True)
        tokens = []
        i = 0
        while i < len(raw):
            if raw[i].isspace():
                i += 1
                continue

            matched = False
            for term in sorted_terminals:
                if raw.startswith(term, i):
                    tokens.append(term)
                    i += len(term)
                    matched = True
                    break

            if not matched:
                # Word / identifier token fallback
                j = i
                while j < len(raw) and (raw[j].isalnum() or raw[j] == '_'):
                    j += 1
                if j > i:
                    tokens.append(raw[i:j])
                    i = j
                else:
                    tokens.append(raw[i])
                    i += 1

        tokens.append(END_MARKER)
        return tokens

    def parse(self, input_string: str, print_trace: bool = True) -> Tuple[bool, str]:
        tokens = self.tokenize(input_string)
        stack = [END_MARKER, self.grammar.start_symbol]
        ip = 0
        step = 1

        if print_trace:
            print(f"\n{'=' * 96}")
            print(f"PARSING TRACE FOR INPUT: \"{input_string}\"")
            print(f"{'=' * 96}")
            print(f"{'Step':<6} {'Stack (Bottom -> TOP)':<28} {'Remaining Input':<26} {'Production':<20} {'Action'}")
            print(f"{'-' * 96}")

        while stack:
            X = stack[-1]
            lookahead = tokens[ip] if ip < len(tokens) else END_MARKER

            stack_str = ' '.join(stack)
            input_str = ' '.join(tokens[ip:])

            # Case 1: Stack Top is '$' and Input is '$' -> Accept!
            if X == END_MARKER and lookahead == END_MARKER:
                if print_trace:
                    print(f"{step:<6} {stack_str:<28} {input_str:<26} {'—':<20} ACCEPTED (Success!)")
                    print(f"{'=' * 96}\n")
                return True, "Accepted"

            # Case 2: Terminal on Stack Top
            if self.grammar.is_terminal(X) or X == END_MARKER:
                if X == lookahead:
                    stack.pop()
                    ip += 1
                    if print_trace:
                        print(f"{step:<6} {stack_str:<28} {input_str:<26} {'—':<20} MATCH '{X}'")
                    step += 1
                else:
                    err = f"Syntax Error: Terminal mismatch. Stack TOP is '{X}' but input lookahead is '{lookahead}'."
                    if print_trace:
                        print(f"{step:<6} {stack_str:<28} {input_str:<26} {'—':<20} ERROR (Mismatch)")
                        print(f"{'=' * 96}")
                        print(f"FAILED: {err}\n")
                    return False, err

            # Case 3: Non-Terminal on Stack Top
            elif self.grammar.is_non_terminal(X):
                entries = self.table.table.get(X, {}).get(lookahead, [])
                if not entries:
                    valid = [t for t in self.table.terminals_with_dollar if self.table.table[X][t]]
                    err = f"Syntax Error: No rule in M[{X}, '{lookahead}']. Valid expected tokens: {valid}"
                    if print_trace:
                        print(f"{step:<6} {stack_str:<28} {input_str:<26} {'—':<20} ERROR (Empty Cell)")
                        print(f"{'=' * 96}")
                        print(f"FAILED: {err}\n")
                    return False, err

                rule = entries[0]
                stack.pop()

                if len(rule.rhs) == 1 and rule.rhs[0] == EPSILON:
                    if print_trace:
                        print(f"{step:<6} {stack_str:<28} {input_str:<26} {str(rule):<20} Pop '{X}' (ε-derive)")
                    step += 1
                else:
                    if print_trace:
                        print(f"{step:<6} {stack_str:<28} {input_str:<26} {str(rule):<20} Pop '{X}'")
                    step += 1
                    # Push each RHS symbol in reverse order
                    for r_idx, sym in enumerate(reversed(rule.rhs)):
                        stack.append(sym)
                        stack_now = ' '.join(stack)
                        is_top = (r_idx == len(rule.rhs) - 1)
                        action_desc = f"Push '{sym}' (new TOP)" if is_top else f"Push '{sym}'"
                        if print_trace:
                            print(f"{step:<6} {stack_now:<28} {input_str:<26} {'—':<20} {action_desc}")
                        step += 1

            else:
                return False, f"Unknown symbol '{X}' on stack."

        return False, "Stack emptied prematurely."


def main():
    print("=" * 80)
    print("   LL(1) PREDICTIVE PARSER - COMPILER CONSTRUCTION PYTHON ENGINE   ")
    print("=" * 80)

    # Standard LL(1) Arithmetic Expression Grammar
    grammar_text = """
    E  -> T E'
    E' -> + T E' | ε
    T  -> F T'
    T' -> * F T' | ε
    F  -> ( E ) | id
    """

    grammar = Grammar(grammar_text)
    print(f"\n[1] Grammar Symbols:")
    print(f"    Non-Terminals: {grammar.non_terminals}")
    print(f"    Terminals:     {grammar.terminals}")
    print(f"    Start Symbol:  {grammar.start_symbol}")

    first_calc = FirstCalculator(grammar)
    first_calc.compute()
    print(f"\n[2] Computed FIRST Sets:")
    for nt in grammar.non_terminals:
        print(f"    FIRST({nt:<3}) = {sorted(list(first_calc.sets[nt]))}")

    follow_calc = FollowCalculator(grammar, first_calc)
    follow_calc.compute()
    print(f"\n[3] Computed FOLLOW Sets:")
    for nt in grammar.non_terminals:
        print(f"    FOLLOW({nt:<3}) = {sorted(list(follow_calc.sets[nt]))}")

    table = ParsingTable(grammar, first_calc, follow_calc)
    table.generate()
    print(f"\n[4] LL(1) Table Verification:")
    print(f"    Is LL(1) Compatible: {'YES (Zero Conflicts)' if table.is_ll1 else 'NO'}")

    parser = LL1Parser(grammar, table)

    # Run Benchmark Test Suite
    test_cases = [
        ("id + id * id", True, "Test 1: Standard expression (id + id * id)"),
        ("id + * id", False, "Test 2: Syntax error (id + * id)"),
        ("( id + id ) * id", True, "Test 3: Parenthesized expression (( id + id ) * id)"),
        ("id + id )", False, "Test 4: Unmatched paren (id + id ))"),
    ]

    print(f"\n[5] Executing Benchmark Test Suite:")
    all_passed = True
    for text, expected, label in test_cases:
        passed, msg = parser.parse(text, print_trace=True)
        is_ok = (passed == expected)
        print(f">>> RESULT: [{'PASS' if is_ok else 'FAIL'}] {label} => {'ACCEPTED' if passed else 'REJECTED'}")
        if not is_ok:
            all_passed = False

    print(f"\n{'=' * 80}")
    if all_passed:
        print("🎉 ALL 4 BENCHMARK TESTS PASSED PERFECTLY IN PYTHON!")
    print(f"{'=' * 80}\n")


if __name__ == "__main__":
    main()

