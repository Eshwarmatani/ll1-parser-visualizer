# LL(1) Predictive Parser Visualizer v2.0
### Advanced Compiler Construction Platform & Educational Suite

A professional, full-stack, interactive compiler construction visualizer designed to teach and demonstrate Context-Free Grammar (CFG) analysis, deterministic LL(1) predictive parsing, stack machine simulation, syntax tree generation, and lexical scanning.

---

## 🌟 Key Features Across 12 Comprehensive Modules

### 1. 📊 Professional Dashboard
- Real-time compiler telemetry cards: Total Grammars Analyzed, Parsing Micro-Operations, Strings Accepted, Syntax Errors Diagnosed, and LL(1) Validated.
- Active grammar chips: Start Symbol, Non-Terminal variables, Terminal alphabet, and LL(1) Compatibility Status.
- Quick-access pipeline cards to jump between all compiler phases.
- Recent grammar history stored locally for instant one-click recall.

### 2. ✏️ Advanced Grammar Editor
- Line numbers gutter synchronized with scrolling and editing.
- Live syntax highlighting preview: Non-terminals (purple), Terminals (blue), Arrows (amber), Pipes (cyan), and Epsilons (gray).
- Custom start symbol dropdown selector (defaults to first LHS non-terminal).
- One-click rule manipulation buttons: **➕ Add Rule**, **➖ Remove Rule**, **⟲ Reset Default**, and **🗑️ Clear**.
- File Import (`.txt`, `.json`) and Export as pure TXT grammar.
- Preset templates library (Arithmetic, Assignment, Boolean logic, Left recursion demo, Left factoring demo).

### 3. 🔄 Context-Free Grammar Transformation Module
- **Direct Left Recursion Elimination:** $A \to A \alpha \mid \beta \implies A \to \beta A', A' \to \alpha A' \mid \epsilon$.
- **Indirect Left Recursion Elimination:** Dragon Book Algorithm 4.19 systematic non-terminal ordering and substitution.
- **Left Factoring (Common Prefix Extraction):** $A \to \alpha \beta_1 \mid \alpha \beta_2 \implies A \to \alpha A', A' \to \beta_1 \mid \beta_2$.
- Side-by-side Before/After diff viewer with changed productions highlighted.
- Detailed step-by-step mathematical reductions.
- One-click **Apply to Active Grammar** or **Discard** options.
- Instant post-transformation verification of LL(1) compatibility.

### 4. 🎯 Interactive FIRST Set Stepper
- Step-by-step mathematical fixed-point iteration playback with **▶ Play**, **⏮ Prev**, **⏭ Next**, and **⟲ Reset**.
- Live tracking: active production rule, target non-terminal, and examined symbol.
- Newly added symbols light up with pulsating animation badges.
- Tabular fixed-point iteration history demonstrating convergence loop-by-loop.

### 5. 🧭 Interactive FOLLOW Set Stepper
- Step-by-step derivations tracking:
  - Rule 1: Placing `$` into `FOLLOW(S)`.
  - Rule 2: Sub-string suffix FIRST propagation ($A \to \alpha B \beta$).
  - Rule 3: Epsilon nullable cascade propagation ($\beta \Rightarrow^* \epsilon$).
- Interactive playback controls and convergence tables.

### 6. 📋 Advanced LL(1) Parsing Table & Cell Inspector
- Interactive 2D matrix $M[A, a]$ mapping Non-Terminals $\times$ Terminals (including `$` end-marker).
- Visual cell states: Single Entry (Deterministic), Blank (Syntax Error), and Conflict (Multiple Productions).
- **Interactive Cell Inspector Modal:** Click ANY cell in the table to open a modal detailing:
  - FIRST-based justification.
  - FOLLOW-based justification (if $\epsilon$-deriving).
  - Formal LL(1) insertion formula applied.
  - Conflict diagnosis and remediation tips.

### 7. 🔬 Lexical Analysis (Scanner Module)
- Explores Phase 1 of the compiler front-end pipeline.
- Scans raw arithmetic and boolean source code into discrete typed tokens: `IDENTIFIER`, `NUMBER`, `OPERATOR`, `ASSIGN`, `PAREN`, `DELIMITER`, and `EOF`.
- Precise source coordinate tracking (Line, Column Start, Column End).
- Detailed Symbol & Token Table.
- Lexical error detection for unrecognized characters.
- **🚀 Send Tokens to LL(1) Parser:** Pipes scanned tokens directly into the LL(1) syntax analyzer!

### 8. ⚡ Animated Stack Simulator (Core Feature)
- **Vertical LIFO Stack Visualizer:** Prominent `TOP ▲` and `BOTTOM ▼` indicators.
- **Atomic Micro-Operations:** PUSH (reverse-order sliding), POP, MATCH_COMPARE (green pulse), MATCH_CONSUME, PREDICT, and EPSILON.
- **Lookahead Tape:** Horizontal token tape with advancing lookahead pointer.
- **Reversible Playback:** Previous Step (⏮) restores exact stack, tape, tree, and trace states.
- **Adjustable Speed:** Slow (1500ms default for teaching), Normal (700ms), Fast (250ms), and custom slider.
- **Synchronized Live Trace Table:** Rows glow with `▶ CURRENT` badge and auto-scroll into center view. Click any row to jump directly to that state!

### 9. 🌳 Dynamic SVG Parse Tree
- Hierarchical syntax tree layout with smooth Bezier connecting edges.
- Real-time active node highlighting synchronized with stack operations.
- Interactive Pan (click & drag), Zoom (scroll wheel or buttons), and **Fit Screen**.
- One-click **📥 Export SVG** vector graphic.

### 10. 📝 Practice & Assessment Module (Compiler Quiz Engine)
- 18 algorithmically verified questions covering all 8 syllabus topics:
  1. FIRST Sets
  2. FOLLOW Sets
  3. Parsing Table Lookups
  4. Grammar Transformations
  5. LL(1) Conflict Detection
  6. Stack Operations
  7. String Acceptance Conditions
  8. Compiler Architecture Theory
- Difficulty filters: Beginner, Intermediate, Advanced, and All.
- Instant grading, score tracking, progress bar, and comprehensive pedagogical explanations.
- Final exam results card with score percentage and review of missed questions.

### 11. 💾 Export & Import Capabilities
- **Export Table (CSV):** Clean 2D spreadsheet of $M[A, a]$.
- **Export Trace (CSV):** Complete step-by-step derivation log with stack, tape, production, and action columns.
- **Export Grammar (TXT):** Standalone text file containing non-terminals, terminals, start symbol, and rules.
- **Export Sets (JSON):** Machine-readable snapshot of FIRST and FOLLOW sets.
- **Print / Save PDF Report:** Professional academic report with printable styling.
- **Export SVG Tree:** Standalone vector graphic of the generated parse tree.

### 12. 🎓 Theory Guide & Interactive Viva Examination Mode
- **Core Theory Guide:** Comprehensive coverage of 11 essential compiler topics (Compiler architecture, CFG, LL(1) definitions, FIRST, FOLLOW, Table generation, Left recursion, Left factoring, advantages & limitations).
- **Interactive Viva Mode:** 15 oral examination questions with collapsible model answers covering examiner traps, ambiguity proofs, and pushdown automata fundamentals.

---

## 🏗️ Project Architecture & Directory Layout

```
CC_Final_project/
├── index.html               # Main application interface with all 12 modules & modals
├── README.md                # Comprehensive documentation and project guide
├── start.bat                # 1-Click launcher to open Visualizer in browser
├── run_python.bat           # 1-Click launcher to run Python CLI parser
├── ll1_parser.py            # Standalone Python 3 LL(1) parser CLI
├── test_full_suite.js       # Complete 37-test integration test runner (Node.js)
├── test_core.js             # Core algorithm unit tests (Node.js)
├── test_samples.js          # Presets validation test runner (Node.js)
├── test_edge_cases.js       # Edge-cases test runner (Node.js)
├── verify_grammars.py       # Python 3 mathematical verification suite
├── test_edge_cases.py       # Python 3 edge-cases test runner
├── python/
│   └── ll1_parser.py        # Python 3 implementation of LL(1) parser
├── css/
│   ├── theme.css            # Dark/Light theme tokens, colors, and shadows
│   ├── layout.css           # Grid layouts, sidebar, topbar, and responsive containers
│   ├── components.css       # Cards, badges, tables, steppers, tokens, quiz UI
│   └── animations.css       # Keyframes for stack push/pop, matching pulses, error shake
└── js/
    ├── grammar.js           # CFG processing, symbol categorization, error detection
    ├── first.js             # Fixed-point FIRST algorithm & iteration history
    ├── follow.js            # Fixed-point FOLLOW algorithm & iteration history
    ├── table.js             # LL(1) parsing table generator & conflict detection
    ├── transform.js         # Grammar transformations (Direct LR, Indirect LR, Factoring)
    ├── lexer.js             # Lexical analysis scanner & token stream mapper
    ├── quiz.js              # Assessment quiz engine with 18 verified questions
    ├── export.js            # CSV, TXT, JSON, and printable PDF report exporters
    ├── parser.js            # Non-recursive LL(1) stack parser & snapshot recorder
    ├── animator.js          # Animation state machine, reversible playback, and speed presets
    ├── tree.js              # Interactive SVG parse tree visualizer (pan, zoom, export)
    ├── sample-grammars.js   # Built-in educational CFG presets
    ├── ui.js                # Master UI controller, event bindings, and navigation
    └── app.js               # Application bootstrap
```

---

## 🚀 Running the Application

### Option 1: Direct Browser Launch
Simply double-click `index.html` or open it in any modern web browser (Chrome, Edge, Firefox, Safari).  
*Zero external runtime dependencies required!*

### Option 2: Local HTTP Server (Python)
```powershell
python -m http.server 8000
```
Open your browser to: `http://localhost:8000`

---

## 🧪 Comprehensive Verification & Test Suite

Run the full integration test suite covering all modules:
```powershell
# Run the complete integration test suite (37 tests)
node test_full_suite.js

# Run core algorithm tests
node test_core.js

# Run all sample grammars tests
node test_samples.js

# Run edge-cases tests (recursion, conflicts, malformed inputs)
node test_edge_cases.js

# Run Python mathematical verification engine
python verify_grammars.py

# Run Python edge-cases test suite
python test_edge_cases.py
```

### Benchmark Test Cases

| Test Case | Input String | Expected Result | Verified Result | Steps |
|---|---|---|---|---|
| **Test 1** | `id + id * id` | **ACCEPTED** | ✅ PASSED | 49 steps |
| **Test 2** | `id + * id` | **REJECTED** | ✅ PASSED (Syntax Error) | 24 steps |
| **Test 3** | `( id + id ) * id` | **ACCEPTED** | ✅ PASSED | 70 steps |
| **Test 4** | `id + id )` | **REJECTED** | ✅ PASSED (Mismatched `$`) | 37 steps |

---

## 🎓 University Final Project Demonstration Script

Follow this script during your final exam, project presentation, or viva:

1. **Step 1: Dashboard Overview (Section 1)**
   - Highlight the real-time telemetry metrics: 5 overview counters and LL(1) Compatibility Status.
   - Click the **🚀 Guided Tour** button in the topbar to walk through the 8-step compiler pipeline.

2. **Step 2: Advanced Grammar Editor (Section 2)**
   - Show the line numbers gutter and live syntax highlighting preview.
   - Use the **Custom Start Symbol** selector to demonstrate top-level axiom re-targeting.
   - Demonstrate **📥 Import** and **📤 Export TXT**.

3. **Step 3: Grammar Transformations (Section 3)**
   - Load Preset 5 (*Direct Left-Recursive Grammar*).
   - Click **🔄 Eliminate Direct Left Recursion**.
   - Show the before/after side-by-side diff and the step-by-step reduction.
   - Show that the transformed grammar is verified to be LL(1) compatible!
   - Click **⚡ Apply to Active Grammar**.

4. **Step 4: Step-by-Step FIRST & FOLLOW Steppers (Sections 4 & 5)**
   - Click **▶ Play Stepper** in the FIRST module. Observe the active rule, target non-terminal, and examined symbol.
   - Show the **Fixed-Point Iteration Convergence** table proving convergence loop-by-loop.
   - Repeat for the FOLLOW module, explaining Rule 1 (`$`), Rule 2 (suffix FIRST), and Rule 3 ($\epsilon$ cascade).

5. **Step 5: LL(1) Parsing Table & Cell Inspector (Section 6)**
   - Inspect the $M[A, a]$ matrix.
   - **Click any cell** to trigger the **Cell Inspector Modal**, explaining the exact mathematical FIRST/FOLLOW justification and insertion rule formula.

6. **Step 6: Lexical Scanner Module (Section 7)**
   - Enter source code `total = a + 25 * b`.
   - Click **⚡ Scan & Tokenize**. Show the token stream pills and detailed coordinate table.
   - Click **🚀 Send Tokens to LL(1) Parser** to demonstrate seamless Phase 1 $\to$ Phase 2 compiler bridging.

7. **Step 7: Animated Stack Simulator (Section 8 - The Climax)**
   - Set speed to *Slow* (1500ms) and click **▶ Play**.
   - Point out:
     - The vertical stack with prominent `TOP ▲`.
     - Reverse-order RHS push: symbols slide onto the stack in reverse order so that the leftmost variable is at the top.
     - Terminal matching: glowing pulse when stack top matches lookahead token.
     - Advancing lookahead pointer on the tape.
     - Live derivation table with glowing `▶ CURRENT` badge.
   - Click **Pause**, then click **⏮ Previous Step** to show reversible rollback.
   - Test invalid string `id + * id` to demonstrate error diagnostics and expected alternatives.

8. **Step 8: Interactive SVG Parse Tree (Section 9)**
   - Explore the dynamic SVG syntax tree: drag to pan, scroll to zoom, and click **🎯 Fit Screen**.
   - Click **📥 Export SVG** to download the standalone vector graphic.

9. **Step 9: Practice & Assessment Quiz (Section 10)**
   - Select difficulty filters and answer questions.
   - Show instant algorithmically verified grading, score tracking, and detailed explanations.

10. **Step 10: Viva Preparation & Theory (Section 11 & 12)**
    - Show the Core Theory Guide (11 topics) and switch to the Interactive Viva Mode (15 accordion Q&A).
    - Demonstrate exporting: CSV table, CSV trace, JSON sets, and printable PDF report.
