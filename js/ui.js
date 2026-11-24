/**
 * LL(1) Predictive Parser - User Interface Controller
 * Full-stack educational controller connecting Grammar parser, FIRST/FOLLOW calculators,
 * Table Generator, Grammar Transformer, Lexer, Quiz Engine, Data Exporter,
 * and Animation Simulator with Interactive Step-by-Step Steppers.
 */

class UIController {
    constructor() {
        this.grammar = null;
        this.firstCalc = null;
        this.followCalc = null;
        this.tableGen = null;
        this.parser = null;
        this.animator = null;
        this.treeVisualizer = null;
        this.transformer = null;
        this.lexer = (typeof Lexer !== 'undefined') ? new Lexer() : null;
        this.quiz = (typeof QuizEngine !== 'undefined') ? new QuizEngine() : null;

        this.currentTheme = localStorage.getItem('ll1_theme') || 'dark';

        // Stepper state tracking
        this.firstStepperIndex = 0;
        this.firstStepperTimer = null;
        this.followStepperIndex = 0;
        this.followStepperTimer = null;

        // Guided Tour state
        this.tourStepIndex = 0;
        this.tourSteps = [
            {
                section: 'section-dashboard',
                title: '1. Compiler Construction Dashboard',
                content: 'Welcome to the LL(1) Predictive Parser Visualizer! The dashboard displays real-time compiler telemetry: total grammars analyzed, micro-parsing operations, string acceptance counts, and LL(1) compatibility.'
            },
            {
                section: 'section-editor',
                title: '2. Context-Free Grammar Editor',
                content: 'Define productions using -> or ::=, and alternatives using |. Features include line numbers, live syntax highlighting, custom start symbol selection, presets, and TXT file import/export.'
            },
            {
                section: 'section-transformation',
                title: '3. Grammar Transformations',
                content: 'Eliminate direct and indirect Left Recursion and apply Left Factoring with one click. Compare side-by-side diffs, inspect mathematical explanations, and apply the transformed grammar directly.'
            },
            {
                section: 'section-first',
                title: '4. Interactive FIRST Set Stepper',
                content: 'Observe fixed-point calculation symbol-by-symbol! Use the Play, Next, and Prev controls to follow rule evaluation, epsilon propagation, and iteration convergence tables.'
            },
            {
                section: 'section-follow',
                title: '5. Interactive FOLLOW Set Stepper',
                content: 'Step through FOLLOW set derivations: start-symbol $ placement, suffix FIRST propagation, and epsilon-triggered rule propagation across loop iterations.'
            },
            {
                section: 'section-table',
                title: '6. LL(1) Parsing Table & Cell Inspector',
                content: 'Explore the M[A, a] matrix. Click ANY cell in the table to open the interactive Cell Inspector modal showing the exact FIRST/FOLLOW justification and formal insertion rule.'
            },
            {
                section: 'section-lexer',
                title: '7. Lexical Scanner Module',
                content: 'Explore Phase 1 of compilation! Tokenize arithmetic and boolean source code into typed tokens (IDENTIFIER, NUMBER, OPERATOR), view coordinate tables, and bridge directly into the LL(1) parser.'
            },
            {
                section: 'section-stack',
                title: '8. Stack Simulator & Live Derivation',
                content: 'Watch the step-by-step parsing stack (PUSH, POP, MATCH, EPSILON, ACCEPT) with adjustable speed, reversible rollback, and a live derivation table tracking the active step.'
            }
        ];

        // Metrics stored locally
        this.metrics = {
            totalAnalyzed: parseInt(localStorage.getItem('ll1_stat_grammars') || '1', 10),
            totalOps: parseInt(localStorage.getItem('ll1_stat_ops') || '49', 10),
            successes: parseInt(localStorage.getItem('ll1_stat_successes') || '1', 10),
            failures: parseInt(localStorage.getItem('ll1_stat_failures') || '0', 10),
            ll1Count: parseInt(localStorage.getItem('ll1_stat_ll1') || '1', 10)
        };

        this.recentHistory = [];
        try {
            this.recentHistory = JSON.parse(localStorage.getItem('ll1_recent_history') || '[]');
        } catch (_) {
            this.recentHistory = [];
        }
    }

    /**
     * Initializes UI controller and binds all event listeners.
     */
    init() {
        this.applyTheme(this.currentTheme);
        if (typeof ParseTreeVisualizer !== 'undefined') {
            this.treeVisualizer = new ParseTreeVisualizer('parse-tree-container');
            this.treeVisualizer.init();
        }

        this.bindNavigation();
        this.bindThemeToggle();
        this.bindGrammarEditor();
        this.bindEditorLineNumbersAndPreview();
        this.bindTransformationControls();
        this.bindFirstStepper();
        this.bindFollowStepper();
        this.bindAnimationControls();
        this.bindTestCases();
        this.bindLexerControls();
        this.bindQuizControls();
        this.bindExportControls();
        this.bindTourControls();
        this.bindVivaTabs();
        this.loadSampleGrammarSelect();

        this.updateDashboardMetrics();

        // Default grammar definitions
        const defaultGrammar = (typeof SAMPLE_GRAMMARS !== 'undefined' && SAMPLE_GRAMMARS.expression)
            ? SAMPLE_GRAMMARS.expression.grammar
            : "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id";
        const defaultInput = (typeof SAMPLE_GRAMMARS !== 'undefined' && SAMPLE_GRAMMARS.expression)
            ? SAMPLE_GRAMMARS.expression.defaultInput
            : 'id + id * id';

        // Pre-populate editor fields immediately
        const grammarInput = document.getElementById('grammar-editor-input');
        if (grammarInput && (!grammarInput.value || !grammarInput.value.trim())) {
            grammarInput.value = defaultGrammar;
        }
        const parserInput = document.getElementById('parser-input-string');
        if (parserInput && (!parserInput.value || !parserInput.value.trim())) {
            parserInput.value = defaultInput;
        }

        this.updateEditorLineNumbers();
        this.renderSyntaxPreview(grammarInput ? grammarInput.value : defaultGrammar);

        // Load default grammar on startup
        this.loadGrammarFromText(grammarInput ? grammarInput.value : defaultGrammar, defaultInput);
    }

    /**
     * Sets active theme (dark or light).
     */
    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('ll1_theme', theme);

        const btn = document.getElementById('theme-toggle-btn');
        if (btn) {
            btn.innerHTML = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
        }
    }

    /**
     * Binds navigation tabs (Sidebar & Mobile Header).
     */
    bindNavigation() {
        const sidebar = document.getElementById('app-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const mobileToggleBtn = document.getElementById('mobile-menu-toggle');

        const toggleSidebar = () => {
            if (!sidebar) return;
            const isOpen = sidebar.classList.toggle('mobile-open');
            if (overlay) {
                if (isOpen) overlay.classList.add('active');
                else overlay.classList.remove('active');
            }
        };

        const closeSidebar = () => {
            if (sidebar) sidebar.classList.remove('mobile-open');
            if (overlay) overlay.classList.remove('active');
        };

        if (mobileToggleBtn) {
            mobileToggleBtn.addEventListener('click', toggleSidebar);
        }

        if (overlay) {
            overlay.addEventListener('click', closeSidebar);
        }

        const navLinks = document.querySelectorAll('.nav-item');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSectionId = link.getAttribute('data-target');
                this.switchSection(targetSectionId);
                closeSidebar();
            });
        });

        // Quick navigation buttons across sections
        document.querySelectorAll('[data-goto]').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-goto');
                this.switchSection(target);
                closeSidebar();
            });
        });
    }

    /**
     * Switches visible dashboard section.
     */
    switchSection(sectionId) {
        if (!sectionId) return;

        // Update sidebar links active class
        document.querySelectorAll('.nav-item').forEach(link => {
            if (link.getAttribute('data-target') === sectionId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update content sections visibility
        document.querySelectorAll('.content-section').forEach(sec => {
            if (sec.id === sectionId) {
                sec.classList.remove('hidden');
                sec.classList.add('active-section');
            } else {
                sec.classList.add('hidden');
                sec.classList.remove('active-section');
            }
        });

        // If switching to tree or stack view, re-center SVG
        if (sectionId === 'section-stack' || sectionId === 'section-results') {
            setTimeout(() => {
                if (this.treeVisualizer) this.treeVisualizer.centerTree();
            }, 100);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Binds Dark / Light theme toggle button.
     */
    bindThemeToggle() {
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
                this.applyTheme(newTheme);
            });
        }
    }

    /**
     * Populates sample grammar select dropdown.
     */
    loadSampleGrammarSelect() {
        const select = document.getElementById('sample-grammar-select');
        if (!select || typeof SAMPLE_GRAMMARS === 'undefined') return;

        select.innerHTML = '';
        for (const key of Object.keys(SAMPLE_GRAMMARS)) {
            const sg = SAMPLE_GRAMMARS[key];
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = `${sg.title} (${sg.category})`;
            if (key === 'expression') {
                opt.selected = true;
            }
            select.appendChild(opt);
        }

        select.addEventListener('change', (e) => {
            const chosen = SAMPLE_GRAMMARS[e.target.value];
            if (chosen) {
                const txt = document.getElementById('grammar-editor-input');
                const inp = document.getElementById('parser-input-string');
                if (txt) txt.value = chosen.grammar;
                if (inp) inp.value = chosen.defaultInput;
                this.updateEditorLineNumbers();
                this.renderSyntaxPreview(chosen.grammar);
                this.loadGrammarFromText(chosen.grammar, chosen.defaultInput);
            }
        });
    }

    /**
     * Dashboard Metrics & History management
     */
    updateDashboardMetrics() {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setVal('dashboard-stat-grammars', this.metrics.totalAnalyzed);
        setVal('dashboard-stat-operations', this.metrics.totalOps);
        setVal('dashboard-stat-successes', this.metrics.successes);
        setVal('dashboard-stat-failures', this.metrics.failures);
        setVal('dashboard-stat-ll1', this.metrics.ll1Count);

        localStorage.setItem('ll1_stat_grammars', this.metrics.totalAnalyzed);
        localStorage.setItem('ll1_stat_ops', this.metrics.totalOps);
        localStorage.setItem('ll1_stat_successes', this.metrics.successes);
        localStorage.setItem('ll1_stat_failures', this.metrics.failures);
        localStorage.setItem('ll1_stat_ll1', this.metrics.ll1Count);

        // Render Recent Grammar History
        const historyContainer = document.getElementById('dashboard-recent-history-list');
        if (historyContainer) {
            if (this.recentHistory.length === 0) {
                historyContainer.innerHTML = '<div class="text-muted" style="font-size: 13px;">No previous grammars saved yet.</div>';
            } else {
                historyContainer.innerHTML = this.recentHistory.map((item, idx) => `
                    <div class="card" style="padding: 12px; display: flex; justify-content: space-between; align-items: center; background: var(--bg-input);">
                        <div>
                            <div style="font-weight: 700; font-size: 13px; font-family: var(--font-mono); color: var(--accent-blue);">
                                ${this.escapeHtml(item.snippet)}
                            </div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                                ${this.escapeHtml(item.timestamp)} • ${item.isLL1 ? '<span style="color: #10b981; font-weight: 700;">LL(1) Valid</span>' : '<span style="color: #ef4444; font-weight: 700;">Not LL(1)</span>'}
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-sm btn-load-history" data-index="${idx}">
                            Load
                        </button>
                    </div>
                `).join('');

                historyContainer.querySelectorAll('.btn-load-history').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = parseInt(btn.getAttribute('data-index'), 10);
                        const hItem = this.recentHistory[idx];
                        if (hItem && hItem.grammar) {
                            const txt = document.getElementById('grammar-editor-input');
                            if (txt) txt.value = hItem.grammar;
                            this.updateEditorLineNumbers();
                            this.renderSyntaxPreview(hItem.grammar);
                            this.loadGrammarFromText(hItem.grammar);
                            this.switchSection('section-editor');
                        }
                    });
                });
            }
        }
    }

    addGrammarToHistory(grammarText, isLL1) {
        if (!grammarText || !grammarText.trim()) return;
        const firstLine = grammarText.trim().split('\n')[0] || 'Grammar';
        const snippet = firstLine.length > 35 ? firstLine.slice(0, 35) + '...' : firstLine;
        const now = new Date();
        const timestamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Prevent duplicates
        this.recentHistory = this.recentHistory.filter(h => h.grammar !== grammarText);
        this.recentHistory.unshift({
            snippet,
            grammar: grammarText,
            timestamp,
            isLL1
        });

        if (this.recentHistory.length > 5) {
            this.recentHistory.pop();
        }

        try {
            localStorage.setItem('ll1_recent_history', JSON.stringify(this.recentHistory));
        } catch (_) {}
    }

    /**
     * Binds grammar editor actions: parse button, helper insertion keys, reset, add/remove rule, import/export.
     */
    bindGrammarEditor() {
        const parseBtn = document.getElementById('btn-parse-grammar');
        const resetBtn = document.getElementById('btn-reset-grammar');
        const clearBtn = document.getElementById('btn-clear-grammar');
        const addRuleBtn = document.getElementById('btn-add-rule');
        const removeRuleBtn = document.getElementById('btn-remove-rule');
        const importBtn = document.getElementById('btn-import-file-btn');
        const fileInput = document.getElementById('grammar-file-input');
        const exportBtn = document.getElementById('btn-export-grammar-file-btn');
        const grammarInput = document.getElementById('grammar-editor-input');
        const startSymbolSelect = document.getElementById('grammar-start-symbol-select');

        if (parseBtn) {
            parseBtn.addEventListener('click', () => {
                const text = grammarInput ? grammarInput.value : '';
                const inputVal = document.getElementById('parser-input-string')?.value || 'id + id * id';
                this.loadGrammarFromText(text, inputVal);
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Reset grammar editor to default arithmetic grammar?')) {
                    const defaultG = (typeof SAMPLE_GRAMMARS !== 'undefined') ? SAMPLE_GRAMMARS.expression : null;
                    if (defaultG) {
                        if (grammarInput) grammarInput.value = defaultG.grammar;
                        const inp = document.getElementById('parser-input-string');
                        if (inp) inp.value = defaultG.defaultInput;
                        this.updateEditorLineNumbers();
                        this.renderSyntaxPreview(defaultG.grammar);
                        this.loadGrammarFromText(defaultG.grammar, defaultG.defaultInput);
                    }
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Clear editor text?')) {
                    if (grammarInput) grammarInput.value = '';
                    this.updateEditorLineNumbers();
                    this.renderSyntaxPreview('');
                }
            });
        }

        if (addRuleBtn && grammarInput) {
            addRuleBtn.addEventListener('click', () => {
                const val = grammarInput.value.trim();
                const template = "\nA -> a | ε";
                grammarInput.value = val ? `${val}${template}` : "S -> a S | b";
                this.updateEditorLineNumbers();
                this.renderSyntaxPreview(grammarInput.value);
                grammarInput.focus();
            });
        }

        if (removeRuleBtn && grammarInput) {
            removeRuleBtn.addEventListener('click', () => {
                const lines = grammarInput.value.trim().split('\n');
                if (lines.length > 1) {
                    lines.pop();
                    grammarInput.value = lines.join('\n');
                    this.updateEditorLineNumbers();
                    this.renderSyntaxPreview(grammarInput.value);
                } else {
                    alert('Cannot remove the only remaining production rule.');
                }
            });
        }

        // File Import
        if (importBtn && fileInput) {
            importBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const text = evt.target.result;
                    if (grammarInput) grammarInput.value = text;
                    this.updateEditorLineNumbers();
                    this.renderSyntaxPreview(text);
                    this.loadGrammarFromText(text);
                };
                reader.readAsText(file);
            });
        }

        // File Export TXT
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (typeof DataExporter !== 'undefined' && this.grammar) {
                    DataExporter.exportGrammarTXT(this.grammar);
                }
            });
        }

        // Custom Start Symbol Select
        if (startSymbolSelect) {
            startSymbolSelect.addEventListener('change', (e) => {
                if (this.grammar) {
                    const customSym = e.target.value;
                    this.grammar.startSymbol = customSym;
                    this.recomputeWithCustomStart();
                }
            });
        }

        // Quick symbol insert helper buttons: ε, ->, |
        document.querySelectorAll('.insert-sym-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sym = btn.getAttribute('data-sym');
                if (grammarInput && sym) {
                    const start = grammarInput.selectionStart;
                    const end = grammarInput.selectionEnd;
                    const val = grammarInput.value;
                    grammarInput.value = val.substring(0, start) + sym + val.substring(end);
                    grammarInput.focus();
                    grammarInput.selectionStart = grammarInput.selectionEnd = start + sym.length;
                    this.updateEditorLineNumbers();
                    this.renderSyntaxPreview(grammarInput.value);
                }
            });
        });
    }

    /**
     * Line numbers and syntax preview synchronizer
     */
    bindEditorLineNumbersAndPreview() {
        const textarea = document.getElementById('grammar-editor-input');
        if (!textarea) return;

        textarea.addEventListener('input', () => {
            this.updateEditorLineNumbers();
            this.renderSyntaxPreview(textarea.value);
        });

        textarea.addEventListener('scroll', () => {
            const gutter = document.getElementById('editor-line-numbers');
            if (gutter) gutter.scrollTop = textarea.scrollTop;
        });

        this.updateEditorLineNumbers();
        this.renderSyntaxPreview(textarea.value);
    }

    updateEditorLineNumbers() {
        const textarea = document.getElementById('grammar-editor-input');
        const gutter = document.getElementById('editor-line-numbers');
        if (!textarea || !gutter) return;

        const lineCount = (textarea.value.match(/\n/g) || []).length + 1;
        let linesHtml = '';
        for (let i = 1; i <= Math.max(lineCount, 5); i++) {
            linesHtml += `${i}<br>`;
        }
        gutter.innerHTML = linesHtml;
    }

    renderSyntaxPreview(text) {
        const previewEl = document.getElementById('grammar-syntax-preview');
        if (!previewEl) return;

        if (!text || !text.trim()) {
            previewEl.innerHTML = '<span class="text-muted" style="font-family: var(--font-mono); font-size: 13px;">Enter CFG productions to see live syntax highlighting...</span>';
            return;
        }

        const lines = text.split('\n');
        let html = '';

        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
                html += `<div class="syntax-line syntax-comment">${this.escapeHtml(line || ' ')}</div>`;
                return;
            }

            const arrowMatch = trimmed.match(/^(.*?)(->|::=|=>)(.*)$/);
            if (!arrowMatch) {
                html += `<div class="syntax-line syntax-error-line">⚠️ Line ${idx + 1}: ${this.escapeHtml(line)}</div>`;
                return;
            }

            const lhs = arrowMatch[1].trim();
            const arrow = arrowMatch[2];
            const rhs = arrowMatch[3];

            const alternatives = rhs.split('|').map(alt => {
                const tokens = alt.trim().split(/\s+/).filter(Boolean);
                if (tokens.length === 0) {
                    return '<span class="badge badge-eps">ε</span>';
                }
                return tokens.map(tok => {
                    if (tok === 'ε' || tok.toLowerCase() === 'epsilon') {
                        return '<span class="badge badge-eps">ε</span>';
                    }
                    if (tok === lhs || (this.grammar && this.grammar.isNonTerminal(tok))) {
                        return `<span class="badge badge-nt">${this.escapeHtml(tok)}</span>`;
                    }
                    return `<span class="badge badge-term">${this.escapeHtml(tok)}</span>`;
                }).join(' ');
            }).join(' <span class="syntax-pipe">|</span> ');

            html += `<div class="syntax-line"><span class="badge badge-nt" style="font-weight: 800;">${this.escapeHtml(lhs)}</span> <span class="syntax-arrow">${this.escapeHtml(arrow)}</span> ${alternatives}</div>`;
        });

        previewEl.innerHTML = html;
    }

    /**
     * Binds Grammar Transformation controls (Direct LR, Indirect LR, Left Factoring)
     */
    bindTransformationControls() {
        const btnDirect = document.getElementById('btn-transform-direct-lr');
        const btnIndirect = document.getElementById('btn-transform-indirect-lr');
        const btnLeftFactor = document.getElementById('btn-transform-left-factor');
        const btnApply = document.getElementById('btn-apply-transformation');
        const btnDiscard = document.getElementById('btn-discard-transformation');

        if (btnDirect) {
            btnDirect.addEventListener('click', () => {
                if (!this.ensureTransformer()) return;
                const res = this.transformer.eliminateDirectLeftRecursion();
                this.renderTransformationResult('Elimination of Direct Left Recursion', res);
            });
        }

        if (btnIndirect) {
            btnIndirect.addEventListener('click', () => {
                if (!this.ensureTransformer()) return;
                const res = this.transformer.eliminateLeftRecursionComprehensive();
                this.renderTransformationResult('Elimination of Indirect Left Recursion', res);
            });
        }

        if (btnLeftFactor) {
            btnLeftFactor.addEventListener('click', () => {
                if (!this.ensureTransformer()) return;
                const res = this.transformer.applyLeftFactoring();
                this.renderTransformationResult('Left Factoring (Common Prefix Extraction)', res);
            });
        }

        if (btnApply) {
            btnApply.addEventListener('click', () => {
                if (!this.transformer || !this.transformer.transformedGrammarText) return;
                const txt = document.getElementById('grammar-editor-input');
                if (txt) {
                    txt.value = this.transformer.transformedGrammarText;
                    this.updateEditorLineNumbers();
                    this.renderSyntaxPreview(txt.value);
                }
                this.loadGrammarFromText(this.transformer.transformedGrammarText);
                btnApply.disabled = true;
                if (btnDiscard) btnDiscard.disabled = true;
                this.switchSection('section-analysis');
            });
        }

        if (btnDiscard) {
            btnDiscard.addEventListener('click', () => {
                const origBox = document.getElementById('transform-original-preview');
                const resBox = document.getElementById('transform-result-preview');
                const stepsBox = document.getElementById('transformation-steps-container');
                const statusBox = document.getElementById('transformation-ll1-status');
                if (origBox) origBox.textContent = '';
                if (resBox) resBox.textContent = '';
                if (stepsBox) stepsBox.innerHTML = '<p class="text-muted" style="margin: 0;">Click one of the transformation buttons above to view step-by-step mathematical reductions.</p>';
                if (statusBox) statusBox.innerHTML = '';
                btnApply.disabled = true;
                btnDiscard.disabled = true;
            });
        }
    }

    ensureTransformer() {
        if (!this.grammar) return false;
        if (typeof GrammarTransformer !== 'undefined') {
            this.transformer = new GrammarTransformer(this.grammar);
            return true;
        }
        return false;
    }

    renderTransformationResult(title, result) {
        const origBox = document.getElementById('transform-original-preview');
        const resBox = document.getElementById('transform-result-preview');
        const stepsBox = document.getElementById('transformation-steps-container');
        const statusBox = document.getElementById('transformation-ll1-status');
        const btnApply = document.getElementById('btn-apply-transformation');
        const btnDiscard = document.getElementById('btn-discard-transformation');

        if (origBox) origBox.textContent = result.originalGrammar;
        if (resBox) resBox.textContent = result.transformedGrammar;

        if (stepsBox) {
            stepsBox.innerHTML = result.steps.map((st, i) => `
                <div class="derivation-step-item" style="margin-bottom: 10px;">
                    <div class="step-badge" style="background: var(--accent-blue);">Step ${i + 1}</div>
                    <div class="step-details">
                        <div class="step-rule"><strong>Rule:</strong> <code>${this.escapeHtml(st.rule)}</code></div>
                        <div class="step-reason">${this.escapeHtml(st.explanation)}</div>
                    </div>
                </div>
            `).join('');
        }

        // Verify if transformed grammar is LL(1)
        if (statusBox && this.transformer) {
            const verification = this.transformer.verifyTransformedGrammar();
            if (verification.isLL1) {
                statusBox.innerHTML = `
                    <div class="alert-success" style="padding: 12px; border-radius: var(--radius-md); font-size: 13.5px;">
                        ✓ <strong>Transformation Succeeded:</strong> Transformed grammar is mathematically confirmed to be <strong>LL(1) Compatible</strong> (0 conflicts detected).
                    </div>
                `;
            } else {
                statusBox.innerHTML = `
                    <div class="alert-error" style="padding: 12px; border-radius: var(--radius-md); font-size: 13.5px;">
                        ⚠️ <strong>Caution:</strong> Transformed grammar still has ambiguities (${verification.conflicts.length} conflict(s) remaining). While this specific recursion or prefix was removed, additional transformations may be required.
                    </div>
                `;
            }
        }

        if (btnApply) btnApply.disabled = false;
        if (btnDiscard) btnDiscard.disabled = false;
    }

    /**
     * Binds Step-by-Step FIRST calculation stepper
     */
    bindFirstStepper() {
        const btnPlay = document.getElementById('btn-first-play');
        const btnPrev = document.getElementById('btn-first-prev');
        const btnNext = document.getElementById('btn-first-next');
        const btnReset = document.getElementById('btn-first-reset');

        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                if (this.firstStepperTimer) {
                    this.stopFirstStepperPlay();
                } else {
                    this.startFirstStepperPlay();
                }
            });
        }

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                this.stopFirstStepperPlay();
                const total = this.firstCalc ? this.firstCalc.stepByStepLog.length : 0;
                if (this.firstStepperIndex < total - 1) {
                    this.firstStepperIndex++;
                    this.renderFirstStepperStep(this.firstStepperIndex);
                }
            });
        }

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                this.stopFirstStepperPlay();
                if (this.firstStepperIndex > 0) {
                    this.firstStepperIndex--;
                    this.renderFirstStepperStep(this.firstStepperIndex);
                }
            });
        }

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                this.stopFirstStepperPlay();
                this.firstStepperIndex = 0;
                this.renderFirstStepperStep(0);
            });
        }

        const btnScrollFirst = document.getElementById('btn-scroll-to-current-first-step');
        if (btnScrollFirst) {
            btnScrollFirst.addEventListener('click', () => {
                this.highlightFirstDerivationTableRow(this.firstStepperIndex);
            });
        }
    }

    startFirstStepperPlay() {
        const btnPlay = document.getElementById('btn-first-play');
        if (btnPlay) btnPlay.innerHTML = '<span class="icon">⏸</span> Pause Stepper';

        this.firstStepperTimer = setInterval(() => {
            const total = this.firstCalc ? this.firstCalc.stepByStepLog.length : 0;
            if (this.firstStepperIndex < total - 1) {
                this.firstStepperIndex++;
                this.renderFirstStepperStep(this.firstStepperIndex);
            } else {
                this.stopFirstStepperPlay();
            }
        }, 1100);
    }

    stopFirstStepperPlay() {
        if (this.firstStepperTimer) {
            clearInterval(this.firstStepperTimer);
            this.firstStepperTimer = null;
        }
        const btnPlay = document.getElementById('btn-first-play');
        if (btnPlay) btnPlay.innerHTML = '<span class="icon">▶</span> Play Stepper';
    }

    renderFirstStepperStep(idx) {
        if (!this.firstCalc || !this.firstCalc.stepByStepLog || this.firstCalc.stepByStepLog.length === 0) return;
        const total = this.firstCalc.stepByStepLog.length;
        const step = this.firstCalc.stepByStepLog[idx] || this.firstCalc.stepByStepLog[0];

        const pill = document.getElementById('first-stepper-step-pill');
        const iterBadge = document.getElementById('first-stepper-iteration-badge');
        const activeRule = document.getElementById('first-stepper-active-rule');
        const targetNt = document.getElementById('first-stepper-target-nt');
        const activeSym = document.getElementById('first-stepper-active-sym');
        const expl = document.getElementById('first-stepper-explanation');

        if (pill) pill.textContent = `Step ${idx + 1} of ${total}`;
        if (iterBadge) iterBadge.textContent = `Iteration ${step.iteration || 1}`;
        if (activeRule) activeRule.textContent = step.rule || '—';
        if (targetNt) targetNt.textContent = step.nonTerminal || '—';
        if (activeSym) activeSym.textContent = step.symbolExamined || '—';
        if (expl) expl.textContent = step.reason || 'Derivation step in progress.';

        // Render sets using the step's snapshot if available, or final sets
        const snapshot = step.snapshot;
        const grid = document.getElementById('first-sets-grid');
        if (grid && this.grammar) {
            grid.innerHTML = '';
            for (const nt of this.grammar.nonTerminals) {
                const syms = snapshot ? (snapshot[nt] || []) : Array.from(this.firstCalc.sets.get(nt) || []);
                const isTarget = (nt === step.nonTerminal);
                const card = document.createElement('div');
                card.className = `set-display-card ${isTarget ? 'card-stepper-active' : ''}`;
                card.innerHTML = `
                    <div class="set-header">
                        <span class="set-title">FIRST(${this.escapeHtml(nt)})</span>
                        <span class="set-count">${syms.length} symbol${syms.length === 1 ? '' : 's'}</span>
                    </div>
                    <div class="set-symbols-chips">
                        ${syms.map(s => {
                            const isNewlyAdded = isTarget && ((step.added && step.added.includes(s)) || (step.newSymbols && step.newSymbols.includes(s)));
                            return `<span class="badge ${s === 'ε' ? 'badge-eps' : 'badge-term'} ${isNewlyAdded ? 'badge-newly-added' : ''}">${this.escapeHtml(s)}</span>`;
                        }).join('') || '<span class="text-muted">∅</span>'}
                    </div>
                `;
                grid.appendChild(card);
            }
        }

        // Highlight active step in FIRST derivation table
        this.highlightFirstDerivationTableRow(idx);
    }

    /**
     * Binds Step-by-Step FOLLOW calculation stepper
     */
    bindFollowStepper() {
        const btnPlay = document.getElementById('btn-follow-play');
        const btnPrev = document.getElementById('btn-follow-prev');
        const btnNext = document.getElementById('btn-follow-next');
        const btnReset = document.getElementById('btn-follow-reset');

        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                if (this.followStepperTimer) {
                    this.stopFollowStepperPlay();
                } else {
                    this.startFollowStepperPlay();
                }
            });
        }

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                this.stopFollowStepperPlay();
                const total = this.followCalc ? this.followCalc.stepByStepLog.length : 0;
                if (this.followStepperIndex < total - 1) {
                    this.followStepperIndex++;
                    this.renderFollowStepperStep(this.followStepperIndex);
                }
            });
        }

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                this.stopFollowStepperPlay();
                if (this.followStepperIndex > 0) {
                    this.followStepperIndex--;
                    this.renderFollowStepperStep(this.followStepperIndex);
                }
            });
        }

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                this.stopFollowStepperPlay();
                this.followStepperIndex = 0;
                this.renderFollowStepperStep(0);
            });
        }

        const btnScrollFollow = document.getElementById('btn-scroll-to-current-follow-step');
        if (btnScrollFollow) {
            btnScrollFollow.addEventListener('click', () => {
                this.highlightFollowDerivationTableRow(this.followStepperIndex);
            });
        }
    }

    startFollowStepperPlay() {
        const btnPlay = document.getElementById('btn-follow-play');
        if (btnPlay) btnPlay.innerHTML = '<span class="icon">⏸</span> Pause Stepper';

        this.followStepperTimer = setInterval(() => {
            const total = this.followCalc ? this.followCalc.stepByStepLog.length : 0;
            if (this.followStepperIndex < total - 1) {
                this.followStepperIndex++;
                this.renderFollowStepperStep(this.followStepperIndex);
            } else {
                this.stopFollowStepperPlay();
            }
        }, 1100);
    }

    stopFollowStepperPlay() {
        if (this.followStepperTimer) {
            clearInterval(this.followStepperTimer);
            this.followStepperTimer = null;
        }
        const btnPlay = document.getElementById('btn-follow-play');
        if (btnPlay) btnPlay.innerHTML = '<span class="icon">▶</span> Play Stepper';
    }

    renderFollowStepperStep(idx) {
        if (!this.followCalc || !this.followCalc.stepByStepLog || this.followCalc.stepByStepLog.length === 0) return;
        const total = this.followCalc.stepByStepLog.length;
        const step = this.followCalc.stepByStepLog[idx] || this.followCalc.stepByStepLog[0];

        const pill = document.getElementById('follow-stepper-step-pill');
        const iterBadge = document.getElementById('follow-stepper-iteration-badge');
        const activeRule = document.getElementById('follow-stepper-active-rule');
        const targetNt = document.getElementById('follow-stepper-target-nt');
        const triggerTag = document.getElementById('follow-stepper-trigger-tag');
        const expl = document.getElementById('follow-stepper-explanation');

        if (pill) pill.textContent = `Step ${idx + 1} of ${total}`;
        if (iterBadge) iterBadge.textContent = `Iteration ${step.iteration || 1}`;
        if (activeRule) activeRule.textContent = step.rule || '—';
        if (targetNt) targetNt.textContent = step.nonTerminal || '—';
        if (triggerTag) triggerTag.textContent = step.trigger || 'Rule 1 (Start Symbol)';
        if (expl) expl.textContent = step.reason || 'Derivation step in progress.';

        // Render sets using snapshot or final sets
        const snapshot = step.snapshot;
        const grid = document.getElementById('follow-sets-grid');
        if (grid && this.grammar) {
            grid.innerHTML = '';
            for (const nt of this.grammar.nonTerminals) {
                const syms = snapshot ? (snapshot[nt] || []) : Array.from(this.followCalc.sets.get(nt) || []);
                const isTarget = (nt === step.nonTerminal);
                const card = document.createElement('div');
                card.className = `set-display-card ${isTarget ? 'card-stepper-active' : ''}`;
                card.innerHTML = `
                    <div class="set-header">
                        <span class="set-title">FOLLOW(${this.escapeHtml(nt)})</span>
                        <span class="set-count">${syms.length} symbol${syms.length === 1 ? '' : 's'}</span>
                    </div>
                    <div class="set-symbols-chips">
                        ${syms.map(s => {
                            const isNewlyAdded = isTarget && ((step.added && step.added.includes(s)) || (step.newSymbols && step.newSymbols.includes(s)));
                            return `<span class="badge ${s === '$' ? 'badge-dollar' : 'badge-term'} ${isNewlyAdded ? 'badge-newly-added' : ''}">${this.escapeHtml(s)}</span>`;
                        }).join('') || '<span class="text-muted">∅</span>'}
                    </div>
                `;
                grid.appendChild(card);
            }
        }

        // Highlight active step in FOLLOW derivation table
        this.highlightFollowDerivationTableRow(idx);
    }

    /**
     * Binds animation controls: Play, Pause, Next, Prev, Restart, Speed buttons & slider.
     */
    bindAnimationControls() {
        const playPauseBtn = document.getElementById('btn-play-pause');
        const nextBtn = document.getElementById('btn-step-next');
        const prevBtn = document.getElementById('btn-step-prev');
        const restartBtn = document.getElementById('btn-step-restart');
        const speedSlider = document.getElementById('anim-speed-slider');
        const speedValueLabel = document.getElementById('anim-speed-label');

        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                if (!this.animator) return;
                if (this.animator.isPlaying) {
                    this.animator.pause();
                } else {
                    this.animator.play();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.animator) {
                    this.animator.pause();
                    this.animator.stepForward();
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.animator) {
                    this.animator.pause();
                    this.animator.stepBackward();
                }
            });
        }

        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                if (this.animator) {
                    this.animator.restart();
                }
            });
        }

        const btnJumpTrace = document.getElementById('btn-jump-to-trace');
        if (btnJumpTrace) {
            btnJumpTrace.addEventListener('click', () => {
                const card = document.getElementById('section-stack-trace-card');
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }

        // Speed preset buttons (Slow, Normal, Fast)
        document.querySelectorAll('.btn-speed-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-speed-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const preset = btn.getAttribute('data-speed');
                if (this.animator && this.animator.speedPresets[preset]) {
                    const delay = this.animator.speedPresets[preset];
                    this.animator.setSpeed(delay);
                    if (speedSlider) speedSlider.value = delay;
                    if (speedValueLabel) speedValueLabel.textContent = `${delay} ms`;
                }
            });
        });

        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                if (speedValueLabel) speedValueLabel.textContent = `${val} ms`;
                if (this.animator) this.animator.setSpeed(val);
                document.querySelectorAll('.btn-speed-preset').forEach(b => b.classList.remove('active'));
            });
        }

        // Section 7 Table Tab Switcher & Focus Step button
        const btnTraceTab = document.getElementById('btn-view-trace-tab');
        const btnMatrixTab = document.getElementById('btn-view-matrix-tab');
        const traceContainer = document.getElementById('parsing-trace-table-container');
        const matrixContainer = document.getElementById('section-stack-matrix-container');

        if (btnTraceTab && btnMatrixTab) {
            btnTraceTab.addEventListener('click', () => {
                btnTraceTab.classList.add('active');
                btnMatrixTab.classList.remove('active');
                traceContainer?.classList.remove('hidden');
                matrixContainer?.classList.add('hidden');
            });

            btnMatrixTab.addEventListener('click', () => {
                btnMatrixTab.classList.add('active');
                btnTraceTab.classList.remove('active');
                matrixContainer?.classList.remove('hidden');
                traceContainer?.classList.add('hidden');
            });
        }

        const btnFocusStep = document.getElementById('btn-scroll-to-current-step');
        if (btnFocusStep) {
            btnFocusStep.addEventListener('click', () => {
                if (this.animator) {
                    this.updateTraceTableHighlight(this.animator.currentStepIndex);
                }
            });
        }

        // Keyboard navigation shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.code === 'Space') {
                e.preventDefault();
                playPauseBtn?.click();
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                nextBtn?.click();
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                prevBtn?.click();
            } else if (e.code === 'KeyR') {
                e.preventDefault();
                restartBtn?.click();
            }
        });
    }

    /**
     * Binds Built-in and Custom Test Cases.
     */
    bindTestCases() {
        const runCustomBtn = document.getElementById('btn-parse-input-string');
        const customInputEl = document.getElementById('parser-input-string');

        if (runCustomBtn && customInputEl) {
            runCustomBtn.addEventListener('click', () => {
                this.executeParsing(customInputEl.value.trim());
                this.switchSection('section-stack');
            });
        }
    }

    bindBuiltinTestButtons() {
        const customInputEl = document.getElementById('parser-input-string');
        document.querySelectorAll('.btn-run-builtin-test').forEach(btn => {
            btn.addEventListener('click', () => {
                const testInput = btn.getAttribute('data-input');
                if (customInputEl) customInputEl.value = testInput;
                this.executeParsing(testInput);
                this.switchSection('section-stack');
            });
        });
    }

    /**
     * Master method: processes grammar, calculates FIRST/FOLLOW, generates parsing table,
     * performs full validation, and prepares simulation.
     */
    loadGrammarFromText(grammarText, defaultInput = 'id + id * id') {
        // Fallback if empty or whitespace: read from textarea or sample
        if (!grammarText || !grammarText.trim()) {
            const txt = document.getElementById('grammar-editor-input');
            if (txt && txt.value && txt.value.trim()) {
                grammarText = txt.value.trim();
            } else if (typeof SAMPLE_GRAMMARS !== 'undefined' && SAMPLE_GRAMMARS.expression) {
                grammarText = SAMPLE_GRAMMARS.expression.grammar;
            }
        }

        // Keep editor textarea synchronized
        const editorTextarea = document.getElementById('grammar-editor-input');
        if (editorTextarea && editorTextarea.value !== grammarText) {
            editorTextarea.value = grammarText;
        }

        // Keep line numbers and preview in sync
        this.updateEditorLineNumbers();
        this.renderSyntaxPreview(grammarText);

        // Keep input string field synchronized
        const inputField = document.getElementById('parser-input-string');
        if (inputField && (!inputField.value || !inputField.value.trim())) {
            inputField.value = defaultInput || 'id + id * id';
        }

        // 1. Process Grammar
        this.grammar = new Grammar(grammarText);
        window.currentGrammar = this.grammar;

        // Display grammar validation status
        this.renderGrammarOverview();

        if (this.grammar.errors.length > 0) {
            this.showGrammarErrors(this.grammar.errors);
            return;
        }

        // 2. Compute FIRST & FOLLOW
        this.firstCalc = new FirstCalculator(this.grammar);
        this.firstCalc.compute();

        this.followCalc = new FollowCalculator(this.grammar, this.firstCalc);
        this.followCalc.compute();

        // 3. Generate Table
        this.tableGen = new ParsingTableGenerator(this.grammar, this.firstCalc, this.followCalc);
        this.tableGen.generate();

        // 4. Update Start Symbol Dropdown
        this.populateStartSymbolDropdown();

        // 5. Update Metrics & History
        this.metrics.totalAnalyzed++;
        const isLL1 = this.tableGen.isLL1 && this.grammar.isLL1Compatible && this.tableGen.conflicts.length === 0;
        if (isLL1) this.metrics.ll1Count++;
        this.updateDashboardMetrics();
        this.addGrammarToHistory(grammarText, isLL1);

        // 6. Render Analysis, Sets, Tables, and Iterations
        this.renderAnalysisSection();
        this.renderFirstSets();
        this.renderFirstDerivationTable();
        this.renderFollowSets();
        this.renderFollowDerivationTable();
        this.renderParsingTable();
        this.renderTestCasesList();
        this.renderIterationsTables();

        // 7. Reset Steppers
        this.firstStepperIndex = 0;
        this.followStepperIndex = 0;
        this.renderFirstStepperStep(0);
        this.renderFollowStepperStep(0);

        // 8. Execute initial parse for default input
        const inputStr = defaultInput || document.getElementById('parser-input-string')?.value || 'id + id * id';
        this.executeParsing(inputStr);
    }

    recomputeWithCustomStart() {
        if (!this.grammar) return;
        this.firstCalc = new FirstCalculator(this.grammar);
        this.firstCalc.compute();

        this.followCalc = new FollowCalculator(this.grammar, this.firstCalc);
        this.followCalc.compute();

        this.tableGen = new ParsingTableGenerator(this.grammar, this.firstCalc, this.followCalc);
        this.tableGen.generate();

        this.renderGrammarOverview();
        this.renderAnalysisSection();
        this.renderFirstSets();
        this.renderFirstDerivationTable();
        this.renderFollowSets();
        this.renderFollowDerivationTable();
        this.renderParsingTable();
        this.renderIterationsTables();

        const inputStr = document.getElementById('parser-input-string')?.value || 'id + id * id';
        this.executeParsing(inputStr);
    }

    populateStartSymbolDropdown() {
        const select = document.getElementById('grammar-start-symbol-select');
        if (!select) return;

        const nonTerminals = (this.grammar && this.grammar.nonTerminals && this.grammar.nonTerminals.length > 0)
            ? this.grammar.nonTerminals
            : ['E', "E'", 'T', "T'", 'F'];

        const startSymbol = (this.grammar && this.grammar.startSymbol)
            ? this.grammar.startSymbol
            : nonTerminals[0];

        select.innerHTML = '';
        for (const nt of nonTerminals) {
            const opt = document.createElement('option');
            opt.value = nt;
            opt.textContent = nt;
            if (nt === startSymbol) {
                opt.selected = true;
            }
            select.appendChild(opt);
        }
    }

    /**
     * Displays grammar overview chips (Non-Terminals, Terminals, Start Symbol).
     */
    renderGrammarOverview() {
        const errorBox = document.getElementById('grammar-error-messages');
        if (errorBox) {
            if (this.grammar.errors.length > 0) {
                errorBox.classList.remove('hidden');
                errorBox.innerHTML = this.grammar.errors.map(e => `<div class="alert-error">⚠️ ${this.escapeHtml(e)}</div>`).join('');
            } else {
                errorBox.classList.add('hidden');
                errorBox.innerHTML = '';
            }
        }

        const ntContainer = document.getElementById('grammar-non-terminals-list');
        if (ntContainer) {
            ntContainer.innerHTML = this.grammar.nonTerminals.map(nt =>
                `<span class="badge badge-nt">${this.escapeHtml(nt)}</span>`
            ).join(' ');
        }

        const tContainer = document.getElementById('grammar-terminals-list');
        if (tContainer) {
            tContainer.innerHTML = this.grammar.terminals.map(t =>
                `<span class="badge badge-term">${this.escapeHtml(t)}</span>`
            ).join(' ');
        }

        const startEl = document.getElementById('grammar-start-symbol-badge');
        if (startEl) {
            startEl.textContent = this.grammar.startSymbol || 'None';
        }
    }

    showGrammarErrors(errors) {
        const errorBox = document.getElementById('grammar-error-messages');
        if (errorBox) {
            errorBox.classList.remove('hidden');
            errorBox.innerHTML = errors.map(e => `<div class="alert-error">⚠️ ${this.escapeHtml(e)}</div>`).join('');
        }
    }

    /**
     * Renders Grammar Analysis section (Diagnostics, Left Recursion, Factoring, LL(1) verdict).
     */
    renderAnalysisSection() {
        const verdictBox = document.getElementById('analysis-ll1-verdict');
        const warningsContainer = document.getElementById('analysis-warnings-list');
        const dashBadge = document.getElementById('dashboard-ll1-badge');

        const isLL1 = this.tableGen.isLL1 && this.grammar.isLL1Compatible && this.tableGen.conflicts.length === 0;

        if (dashBadge) {
            dashBadge.innerHTML = isLL1 
                ? '<span class="badge badge-accept" style="font-size: 14px;">LL(1) VALID</span>'
                : '<span class="badge badge-error" style="font-size: 14px;">NOT LL(1)</span>';
        }

        if (verdictBox) {
            if (isLL1) {
                verdictBox.className = 'verdict-card verdict-success';
                verdictBox.innerHTML = `
                    <div class="verdict-icon">✓</div>
                    <div class="verdict-content">
                        <h3>Grammar is LL(1) Compatible</h3>
                        <p>No left recursion, no common prefix ambiguities, and zero parsing table conflicts detected. This grammar is suitable for deterministic predictive parsing.</p>
                    </div>
                `;
            } else {
                verdictBox.className = 'verdict-card verdict-error';
                verdictBox.innerHTML = `
                    <div class="verdict-icon">✕</div>
                    <div class="verdict-content">
                        <h3>Grammar is NOT LL(1) Compatible</h3>
                        <p>One or more conflicts detected. An LL(1) parser cannot deterministically choose a production with a single lookahead token.</p>
                    </div>
                `;
            }
        }

        if (warningsContainer) {
            warningsContainer.innerHTML = '';

            // Grammar warnings (Left recursion, common prefix)
            this.grammar.warnings.forEach(w => {
                const card = document.createElement('div');
                card.className = `diagnostic-card diagnostic-${w.severity}`;
                card.innerHTML = `
                    <div class="diag-header">
                        <span class="diag-badge badge-${w.severity}">${w.type}</span>
                        <strong>Target Symbol: ${this.escapeHtml(w.symbol)}</strong>
                    </div>
                    <div class="diag-message">${this.escapeHtml(w.message)}</div>
                    <div class="diag-suggestion">💡 <strong>Remedy:</strong> <pre>${this.escapeHtml(w.suggestion)}</pre></div>
                `;
                warningsContainer.appendChild(card);
            });

            // Table conflicts
            this.tableGen.conflicts.forEach(c => {
                const card = document.createElement('div');
                card.className = 'diagnostic-card diagnostic-error';
                card.innerHTML = `
                    <div class="diag-header">
                        <span class="diag-badge badge-error">${c.type}</span>
                        <strong>Cell: M[${this.escapeHtml(c.nonTerminal)}, '${this.escapeHtml(c.terminal)}']</strong>
                    </div>
                    <div class="diag-message">${this.escapeHtml(c.explanation)}</div>
                    <div class="diag-suggestion">💡 <strong>Remedy:</strong> ${this.escapeHtml(c.remedy)}</div>
                `;
                warningsContainer.appendChild(card);
            });

            if (this.grammar.warnings.length === 0 && this.tableGen.conflicts.length === 0) {
                warningsContainer.innerHTML = '<div class="alert-success">✓ Perfect! No grammar anomalies or ambiguities detected.</div>';
            }
        }
    }

    /**
     * Renders FIRST sets.
     */
    renderFirstSets() {
        const container = document.getElementById('first-sets-grid');
        if (container) {
            container.innerHTML = '';
            for (const nt of this.grammar.nonTerminals) {
                const setVals = this.firstCalc.sets.get(nt) || new Set();
                const card = document.createElement('div');
                card.className = 'set-display-card';
                card.innerHTML = `
                    <div class="set-header">
                        <span class="set-title">FIRST(${this.escapeHtml(nt)})</span>
                        <span class="set-count">${setVals.size} symbol${setVals.size === 1 ? '' : 's'}</span>
                    </div>
                    <div class="set-symbols-chips">
                        ${Array.from(setVals).map(s => `<span class="badge ${s === 'ε' ? 'badge-eps' : 'badge-term'}">${this.escapeHtml(s)}</span>`).join('') || '<span class="text-muted">∅</span>'}
                    </div>
                `;
                container.appendChild(card);
            }
        }
    }

    /**
     * Renders FOLLOW sets.
     */
    renderFollowSets() {
        const container = document.getElementById('follow-sets-grid');
        if (container) {
            container.innerHTML = '';
            for (const nt of this.grammar.nonTerminals) {
                const setVals = this.followCalc.sets.get(nt) || new Set();
                const card = document.createElement('div');
                card.className = 'set-display-card';
                card.innerHTML = `
                    <div class="set-header">
                        <span class="set-title">FOLLOW(${this.escapeHtml(nt)})</span>
                        <span class="set-count">${setVals.size} symbol${setVals.size === 1 ? '' : 's'}</span>
                    </div>
                    <div class="set-symbols-chips">
                        ${Array.from(setVals).map(s => `<span class="badge ${s === '$' ? 'badge-dollar' : 'badge-term'}">${this.escapeHtml(s)}</span>`).join('') || '<span class="text-muted">∅</span>'}
                    </div>
                `;
                container.appendChild(card);
            }
        }
    }

    /**
     * Renders Live Step-by-Step FIRST Derivation Table in Section 5
     */
    renderFirstDerivationTable() {
        const tbody = document.getElementById('first-derivation-tbody');
        if (!tbody || !this.firstCalc || !this.firstCalc.stepByStepLog) return;

        tbody.innerHTML = '';
        const steps = this.firstCalc.stepByStepLog;
        if (steps.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-muted" style="text-align:center; padding: 18px;">No derivation steps recorded.</td></tr>';
            return;
        }

        steps.forEach((step, idx) => {
            const tr = document.createElement('tr');
            tr.id = `first-trace-row-${idx}`;
            tr.setAttribute('data-step-index', idx);
            tr.className = `trace-row ${idx === 0 ? 'active-row' : ''}`;

            const isFirst = (idx === 0);
            const addedSymbols = (step.added && step.added.length > 0) ? step.added : (step.newSymbols || []);
            const addedChips = addedSymbols.length > 0
                ? addedSymbols.map(s => `<span class="badge ${s === 'ε' ? 'badge-eps' : 'badge-newly-added'}">${this.escapeHtml(s)}</span>`).join(' ')
                : '<span class="text-muted">None (no change)</span>';

            const nt = step.nonTerminal || '—';
            const setVals = (step.snapshot && step.snapshot[nt]) ? step.snapshot[nt] : [];
            const setDisplay = setVals.length > 0
                ? setVals.map(s => {
                    const isNew = addedSymbols.includes(s);
                    return `<span class="badge ${s === 'ε' ? 'badge-eps' : (isNew ? 'badge-newly-added' : 'badge-term')}">${this.escapeHtml(s)}</span>`;
                }).join(' ')
                : '<span class="text-muted">∅</span>';

            tr.innerHTML = `
                <td class="td-step-num" style="text-align: center;">
                    ${isFirst ? '<span class="active-step-badge"><span class="pulse-dot"></span>▶ CURRENT</span>' : `<span class="step-num-badge">Step ${idx + 1}</span>`}
                </td>
                <td><span class="stepper-iteration-badge" style="font-size: 11px;">Iter ${step.iteration || 1}</span></td>
                <td><strong style="color: var(--accent-amber); font-family: var(--font-mono);">FIRST(${this.escapeHtml(nt)})</strong></td>
                <td><code style="color: var(--accent-blue); font-weight: 600;">${this.escapeHtml(step.rule || '—')}</code></td>
                <td><span class="examined-symbol-tag" style="padding: 2px 8px; font-size: 12px;">${this.escapeHtml(step.symbol || step.symbolExamined || '—')}</span></td>
                <td>${addedChips}</td>
                <td><code>{ </code>${setDisplay}<code> }</code></td>
                <td class="td-trace-note" title="${this.escapeHtml(step.reason || '')}">${this.escapeHtml(step.reason || 'Derivation step')}</td>
            `;

            tr.addEventListener('click', () => {
                this.stopFirstStepperPlay();
                this.firstStepperIndex = idx;
                this.renderFirstStepperStep(idx);
            });

            tbody.appendChild(tr);
        });

        this.highlightFirstDerivationTableRow(0);
    }

    /**
     * Highlights the active row in FIRST Derivation Table and auto-scrolls to keep it centered.
     */
    highlightFirstDerivationTableRow(idx) {
        const chip = document.getElementById('first-trace-chip-text');
        const total = this.firstCalc && this.firstCalc.stepByStepLog ? this.firstCalc.stepByStepLog.length : 1;
        const currentStep = this.firstCalc && this.firstCalc.stepByStepLog ? this.firstCalc.stepByStepLog[idx] : null;
        if (chip) {
            chip.textContent = `Step ${idx + 1} of ${total}${currentStep ? ' • Iteration ' + (currentStep.iteration || 1) : ''}`;
        }

        document.querySelectorAll('#first-derivation-tbody .trace-row').forEach((r, i) => {
            if (i === idx) {
                r.classList.add('active-row');
                const numCell = r.querySelector('.td-step-num');
                if (numCell) numCell.innerHTML = '<span class="active-step-badge"><span class="pulse-dot"></span>▶ CURRENT</span>';
            } else {
                r.classList.remove('active-row');
                const numCell = r.querySelector('.td-step-num');
                if (numCell) numCell.innerHTML = `<span class="step-num-badge">Step ${i + 1}</span>`;
            }
        });

        const container = document.getElementById('first-trace-table-container');
        if (container && container.offsetParent !== null) {
            const activeRow = document.getElementById(`first-trace-row-${idx}`);
            if (activeRow) {
                const rowTop = activeRow.offsetTop;
                const containerHeight = container.clientHeight;
                const targetScroll = Math.max(0, rowTop - (containerHeight / 2) + (activeRow.clientHeight / 2));
                container.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }
        }
    }

    /**
     * Renders Live Step-by-Step FOLLOW Derivation Table in Section 6
     */
    renderFollowDerivationTable() {
        const tbody = document.getElementById('follow-derivation-tbody');
        if (!tbody || !this.followCalc || !this.followCalc.stepByStepLog) return;

        tbody.innerHTML = '';
        const steps = this.followCalc.stepByStepLog;
        if (steps.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-muted" style="text-align:center; padding: 18px;">No derivation steps recorded.</td></tr>';
            return;
        }

        steps.forEach((step, idx) => {
            const tr = document.createElement('tr');
            tr.id = `follow-trace-row-${idx}`;
            tr.setAttribute('data-step-index', idx);
            tr.className = `trace-row ${idx === 0 ? 'active-row' : ''}`;

            const isFirst = (idx === 0);
            const addedSymbols = (step.added && step.added.length > 0) ? step.added : (step.newSymbols || []);
            const addedChips = addedSymbols.length > 0
                ? addedSymbols.map(s => `<span class="badge ${s === '$' ? 'badge-dollar' : 'badge-newly-added'}">${this.escapeHtml(s)}</span>`).join(' ')
                : '<span class="text-muted">None (no change)</span>';

            const nt = step.nonTerminal || '—';
            const setVals = (step.snapshot && step.snapshot[nt]) ? step.snapshot[nt] : [];
            const setDisplay = setVals.length > 0
                ? setVals.map(s => {
                    const isNew = addedSymbols.includes(s);
                    return `<span class="badge ${s === '$' ? 'badge-dollar' : (isNew ? 'badge-newly-added' : 'badge-term')}">${this.escapeHtml(s)}</span>`;
                }).join(' ')
                : '<span class="text-muted">∅</span>';

            tr.innerHTML = `
                <td class="td-step-num" style="text-align: center;">
                    ${isFirst ? '<span class="active-step-badge"><span class="pulse-dot"></span>▶ CURRENT</span>' : `<span class="step-num-badge">Step ${idx + 1}</span>`}
                </td>
                <td><span class="stepper-iteration-badge" style="font-size: 11px;">Iter ${step.iteration || 1}</span></td>
                <td><strong style="color: var(--accent-amber); font-family: var(--font-mono);">FOLLOW(${this.escapeHtml(nt)})</strong></td>
                <td><code style="color: var(--accent-green); font-weight: 600;">${this.escapeHtml(step.rule || '—')}</code></td>
                <td>${addedChips}</td>
                <td><code>{ </code>${setDisplay}<code> }</code></td>
                <td class="td-trace-note" title="${this.escapeHtml(step.reason || '')}">${this.escapeHtml(step.reason || 'Derivation step')}</td>
            `;

            tr.addEventListener('click', () => {
                this.stopFollowStepperPlay();
                this.followStepperIndex = idx;
                this.renderFollowStepperStep(idx);
            });

            tbody.appendChild(tr);
        });

        this.highlightFollowDerivationTableRow(0);
    }

    /**
     * Highlights the active row in FOLLOW Derivation Table and auto-scrolls to keep it centered.
     */
    highlightFollowDerivationTableRow(idx) {
        const chip = document.getElementById('follow-trace-chip-text');
        const total = this.followCalc && this.followCalc.stepByStepLog ? this.followCalc.stepByStepLog.length : 1;
        const currentStep = this.followCalc && this.followCalc.stepByStepLog ? this.followCalc.stepByStepLog[idx] : null;
        if (chip) {
            chip.textContent = `Step ${idx + 1} of ${total}${currentStep ? ' • Iteration ' + (currentStep.iteration || 1) : ''}`;
        }

        document.querySelectorAll('#follow-derivation-tbody .trace-row').forEach((r, i) => {
            if (i === idx) {
                r.classList.add('active-row');
                const numCell = r.querySelector('.td-step-num');
                if (numCell) numCell.innerHTML = '<span class="active-step-badge"><span class="pulse-dot"></span>▶ CURRENT</span>';
            } else {
                r.classList.remove('active-row');
                const numCell = r.querySelector('.td-step-num');
                if (numCell) numCell.innerHTML = `<span class="step-num-badge">Step ${i + 1}</span>`;
            }
        });

        const container = document.getElementById('follow-trace-table-container');
        if (container && container.offsetParent !== null) {
            const activeRow = document.getElementById(`follow-trace-row-${idx}`);
            if (activeRow) {
                const rowTop = activeRow.offsetTop;
                const containerHeight = container.clientHeight;
                const targetScroll = Math.max(0, rowTop - (containerHeight / 2) + (activeRow.clientHeight / 2));
                container.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }
        }
    }

    /**
     * Renders Fixed-Point Iterations Convergence tables for FIRST and FOLLOW
     */
    renderIterationsTables() {
        const firstTableEl = document.getElementById('first-iterations-table');
        const followTableEl = document.getElementById('follow-iterations-table');

        if (firstTableEl && this.firstCalc && this.firstCalc.iterationHistory) {
            const hist = this.firstCalc.iterationHistory;
            if (hist.length === 0) {
                firstTableEl.innerHTML = '<span class="text-muted">No iterations recorded.</span>';
            } else {
                let html = '<table class="trace-table" style="font-size: 12.5px;"><thead><tr><th>Iteration</th>';
                for (const nt of this.grammar.nonTerminals) {
                    html += `<th>FIRST(${this.escapeHtml(nt)})</th>`;
                }
                html += '<th>Status</th></tr></thead><tbody>';

                hist.forEach((h, idx) => {
                    const isLast = (idx === hist.length - 1);
                    html += `<tr><td><strong>Iteration ${h.iteration}</strong></td>`;
                    for (const nt of this.grammar.nonTerminals) {
                        const vals = (h.snapshot && h.snapshot[nt]) || (h.sets && h.sets[nt]) || [];
                        html += `<td><code>{ ${vals.join(', ') || '∅'} }</code></td>`;
                    }
                    html += `<td>${isLast ? '<span class="badge badge-accept">Converged (Fixpoint)</span>' : '<span class="badge badge-expand">Growing</span>'}</td></tr>`;
                });
                html += '</tbody></table>';
                firstTableEl.innerHTML = html;
            }
        }

        if (followTableEl && this.followCalc && this.followCalc.iterationHistory) {
            const hist = this.followCalc.iterationHistory;
            if (hist.length === 0) {
                followTableEl.innerHTML = '<span class="text-muted">No iterations recorded.</span>';
            } else {
                let html = '<table class="trace-table" style="font-size: 12.5px;"><thead><tr><th>Iteration</th>';
                for (const nt of this.grammar.nonTerminals) {
                    html += `<th>FOLLOW(${this.escapeHtml(nt)})</th>`;
                }
                html += '<th>Status</th></tr></thead><tbody>';

                hist.forEach((h, idx) => {
                    const isLast = (idx === hist.length - 1);
                    html += `<tr><td><strong>Iteration ${h.iteration}</strong></td>`;
                    for (const nt of this.grammar.nonTerminals) {
                        const vals = (h.snapshot && h.snapshot[nt]) || (h.sets && h.sets[nt]) || [];
                        html += `<td><code>{ ${vals.join(', ') || '∅'} }</code></td>`;
                    }
                    html += `<td>${isLast ? '<span class="badge badge-accept">Converged (Fixpoint)</span>' : '<span class="badge badge-expand">Growing</span>'}</td></tr>`;
                });
                html += '</tbody></table>';
                followTableEl.innerHTML = html;
            }
        }
    }

    /**
     * Renders the LL(1) Predictive Parsing Table matrix M[NonTerminal, Terminal]
     * with click-to-inspect Cell Inspector support.
     */
    renderParsingTable() {
        const containers = [
            document.getElementById('parsing-table-wrapper'),
            document.getElementById('section-stack-matrix-render')
        ].filter(Boolean);

        if (containers.length === 0) return;

        const terminals = this.tableGen.terminalsWithDollar;
        const nonTerminals = this.grammar.nonTerminals;

        let html = `
            <table class="ll1-table" id="ll1-parsing-table">
                <thead>
                    <tr>
                        <th class="th-corner">Non-Terminal \\ Lookahead</th>
                        ${terminals.map(t => `<th class="th-terminal ${t === '$' ? 'th-dollar' : ''}">${this.escapeHtml(t)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        for (const nt of nonTerminals) {
            html += `<tr><td class="td-nt">${this.escapeHtml(nt)}</td>`;
            for (const t of terminals) {
                const entries = this.tableGen.table[nt][t] || [];
                const cellClass = `cell-target-${this.cleanId(nt)}-${this.cleanId(t)}`;

                if (entries.length === 0) {
                    html += `<td class="td-cell td-empty ${cellClass}" data-nt="${this.escapeHtml(nt)}" data-term="${this.escapeHtml(t)}" title="Click to inspect cell M[${this.escapeHtml(nt)}, '${this.escapeHtml(t)}']"><span class="cell-empty-dash">—</span></td>`;
                } else if (entries.length === 1) {
                    const r = entries[0];
                    html += `
                        <td class="td-cell td-filled ${cellClass}" data-nt="${this.escapeHtml(nt)}" data-term="${this.escapeHtml(t)}" title="Click to inspect cell M[${this.escapeHtml(nt)}, '${this.escapeHtml(t)}']">
                            <span class="cell-rule">${this.escapeHtml(nt)} → ${this.escapeHtml(r.rawRhs)}</span>
                        </td>
                    `;
                } else {
                    // Conflict cell
                    html += `
                        <td class="td-cell td-conflict ${cellClass}" data-nt="${this.escapeHtml(nt)}" data-term="${this.escapeHtml(t)}" title="Conflict! Click to inspect details">
                            <div class="conflict-badge">CONFLICT (${entries.length})</div>
                            ${entries.map(r => `<span class="cell-rule-conflict">${this.escapeHtml(nt)} → ${this.escapeHtml(r.rawRhs)}</span>`).join('')}
                        </td>
                    `;
                }
            }
            html += `</tr>`;
        }

        html += `</tbody></table>`;
        containers.forEach(container => {
            container.innerHTML = html;
        });

        this.bindCellInspector();
    }

    /**
     * Binds click events on table cells to open the Cell Inspector Modal.
     */
    bindCellInspector() {
        document.querySelectorAll('.td-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const nt = cell.getAttribute('data-nt');
                const term = cell.getAttribute('data-term');
                if (nt && term) {
                    this.openCellInspector(nt, term);
                }
            });
        });

        const closeBtn = document.getElementById('btn-close-cell-inspector');
        const modal = document.getElementById('cell-inspector-modal');
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        }
    }

    /**
     * Displays detailed mathematical justification for a specific cell M[A, a].
     */
    openCellInspector(nt, terminal) {
        const modal = document.getElementById('cell-inspector-modal');
        const titleEl = document.getElementById('inspector-modal-title');
        const bodyEl = document.getElementById('inspector-modal-body');
        if (!modal || !bodyEl) return;

        const entries = (this.tableGen && this.tableGen.table[nt]) ? (this.tableGen.table[nt][terminal] || []) : [];
        const firstNt = this.firstCalc ? Array.from(this.firstCalc.sets.get(nt) || []) : [];
        const followNt = this.followCalc ? Array.from(this.followCalc.sets.get(nt) || []) : [];

        if (titleEl) {
            titleEl.textContent = `🔍 Cell Inspector: M[ ${nt}, ' ${terminal} ' ]`;
        }

        let statusBadge = '<span class="badge badge-term">Empty (Error Cell)</span>';
        if (entries.length === 1) statusBadge = '<span class="badge badge-accept">Single Entry (Deterministic)</span>';
        if (entries.length > 1) statusBadge = `<span class="badge badge-error">CONFLICT (${entries.length} Productions)</span>`;

        let content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="font-size: 15px; font-weight: 700; font-family: var(--font-mono);">
                    Target: M[ <strong>${this.escapeHtml(nt)}</strong>, '<strong>${this.escapeHtml(terminal)}</strong>' ]
                </div>
                <div>${statusBadge}</div>
            </div>

            <div class="card" style="margin-bottom: 16px; background: var(--bg-input);">
                <div style="font-size: 12px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px;">Relevant Context Sets:</div>
                <div style="font-size: 13.5px; line-height: 1.7; font-family: var(--font-mono);">
                    <div><strong>FIRST(${this.escapeHtml(nt)})</strong> = { ${firstNt.join(', ') || '∅'} }</div>
                    <div><strong>FOLLOW(${this.escapeHtml(nt)})</strong> = { ${followNt.join(', ') || '∅'} }</div>
                </div>
            </div>
        `;

        if (entries.length === 0) {
            content += `
                <div class="alert-error" style="margin-bottom: 16px; font-size: 13.5px;">
                    <strong>Blank Entry (Syntax Error):</strong> When the stack top is <code>${this.escapeHtml(nt)}</code> and lookahead token is <code>${this.escapeHtml(terminal)}</code>, no production can legally begin with or derive this terminal. The parser will raise a syntax error.
                </div>
                <div style="font-size: 13px; color: var(--text-secondary);">
                    💡 <strong>Expected Tokens:</strong> ${firstNt.filter(s => s !== 'ε').map(s => `<code>${s}</code>`).join(', ') || 'None'}.
                </div>
            `;
        } else {
            content += `
                <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
                    Productions Placed in this Cell:
                </div>
            `;

            entries.forEach((prod, i) => {
                const firstRhs = this.firstCalc ? Array.from(this.firstCalc.computeFirstOfString(prod.rhs) || []) : [];
                const derivesEps = firstRhs.includes('ε');
                const isFirstJustified = firstRhs.includes(terminal);
                const isFollowJustified = derivesEps && followNt.includes(terminal);

                content += `
                    <div class="card" style="margin-bottom: 12px; border-left: 4px solid var(--accent-blue);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <strong style="font-size: 15px; font-family: var(--font-mono); color: var(--accent-blue);">
                                ${this.escapeHtml(nt)} → ${this.escapeHtml(prod.rawRhs)}
                            </strong>
                            <span class="badge ${isFirstJustified ? 'badge-nt' : 'badge-dollar'}">Rule ${isFirstJustified ? '1 (FIRST)' : '2 (FOLLOW)'}</span>
                        </div>
                        <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
                            <div>• <strong>FIRST(RHS):</strong> <code>{ ${firstRhs.join(', ')} }</code></div>
                            ${isFirstJustified ? `<div>• <strong>Justification:</strong> Terminal <code>${this.escapeHtml(terminal)}</code> is in FIRST(<code>${this.escapeHtml(prod.rawRhs)}</code>). Rule 1 applies.</div>` : ''}
                            ${isFollowJustified ? `<div>• <strong>Justification:</strong> Since <code>${this.escapeHtml(prod.rawRhs)}</code> derives ε and terminal <code>${this.escapeHtml(terminal)}</code> is in FOLLOW(<code>${this.escapeHtml(nt)}</code>), Rule 2 places this production under all terminals in FOLLOW.</div>` : ''}
                        </div>
                    </div>
                `;
            });

            if (entries.length > 1) {
                content += `
                    <div class="alert-error" style="font-size: 13px; margin-top: 14px;">
                        ⚠️ <strong>LL(1) Table Conflict:</strong> Because 2 or more productions occupy this single entry, the deterministic parser cannot decide which production to choose with 1 lookahead token.
                    </div>
                `;
            }
        }

        bodyEl.innerHTML = content;
        modal.classList.remove('hidden');
    }

    /**
     * Renders built-in test cases interactive cards.
     */
    renderTestCasesList() {
        const container = document.getElementById('test-cases-cards-container');
        if (!container) return;

        const tests = [
            { input: 'id + id * id', expected: 'ACCEPTED', desc: 'Valid expression with multiplication precedence' },
            { input: 'id + * id', expected: 'REJECTED', desc: 'Syntax Error: consecutive operators (+ *)' },
            { input: '( id + id ) * id', expected: 'ACCEPTED', desc: 'Valid parenthesized sub-expression' },
            { input: 'id + id )', expected: 'REJECTED', desc: 'Syntax Error: unexpected closing parenthesis' }
        ];

        container.innerHTML = tests.map((tc, idx) => `
            <div class="test-card">
                <div class="test-card-header">
                    <span class="test-num">Test ${idx + 1}</span>
                    <span class="test-badge badge-${tc.expected.toLowerCase()}">${tc.expected}</span>
                </div>
                <div class="test-input-string"><code>${this.escapeHtml(tc.input)}</code></div>
                <div class="test-desc">${this.escapeHtml(tc.desc)}</div>
                <button class="btn btn-secondary btn-sm btn-run-builtin-test" data-input="${this.escapeHtml(tc.input)}">
                    ▶ Simulate This Test
                </button>
            </div>
        `).join('');

        this.bindBuiltinTestButtons();
    }

    /**
     * Executes the parser on the provided input string and loads the animation simulator.
     */
    executeParsing(inputString) {
        if (!this.grammar || !this.tableGen) return;

        // Hide old celebration banners
        const banner = document.getElementById('parsing-success-banner');
        if (banner) {
            banner.classList.add('hidden');
            banner.classList.remove('show-celebration');
        }

        this.parser = new LL1Parser(this.grammar, this.tableGen);
        const parseResult = this.parser.parse(inputString);

        // Update Global Metrics
        this.metrics.totalOps += parseResult.totalSteps;
        if (parseResult.success) {
            this.metrics.successes++;
        } else {
            this.metrics.failures++;
        }
        this.updateDashboardMetrics();

        // Initialize Animator
        if (!this.animator) {
            this.animator = new AnimationController(this.parser, this.treeVisualizer);
        }

        // Hook animator onStepChange to update trace table and highlight parsing table cell
        this.animator.onStepChange = (step, stepIndex, totalSteps) => {
            this.updateTraceTableHighlight(stepIndex);
            this.highlightActiveTableCell(step);
        };

        this.animator.loadSteps(parseResult.steps, parseResult.parseTree);

        // Render full Trace Table
        this.renderTraceTable(parseResult.steps);

        // Update Results Summary Card & Error Detection Diagnostics
        this.renderResultsSummary(parseResult, inputString);
    }

    /**
     * Highlights the parsing table cell currently being referenced in the simulator.
     */
    highlightActiveTableCell(step) {
        document.querySelectorAll('.td-cell.cell-highlight-active').forEach(c => {
            c.classList.remove('cell-highlight-active');
        });

        if (step && step.tableCell) {
            const targetClass = `cell-target-${this.cleanId(step.tableCell.nt)}-${this.cleanId(step.tableCell.terminal)}`;
            document.querySelectorAll(`.${targetClass}`).forEach(cell => {
                cell.classList.add('cell-highlight-active');
            });
        }
    }

    /**
     * Renders the complete live Parsing Trace Table in both Section 7 and Section 8.
     */
    renderTraceTable(steps) {
        const bodies = [
            document.getElementById('parsing-trace-tbody'),
            document.getElementById('section8-trace-tbody')
        ].filter(Boolean);

        if (bodies.length === 0) return;

        bodies.forEach(tbody => {
            tbody.innerHTML = '';
        });

        steps.forEach((step, idx) => {
            const stackStr = step.stackSymbols.join(' ');
            const inputStr = step.inputTokens.slice(step.pointer).join(' ');
            const isFirst = (idx === 0);
            const badgeClass = `badge-${step.actionType.toLowerCase().replace(/_/g, '-')}`;
            const formattedAction = step.actionType.replace(/_/g, ' ');

            bodies.forEach(tbody => {
                const tr = document.createElement('tr');
                tr.id = `${tbody.id}-row-${idx}`;
                tr.setAttribute('data-step-index', idx);
                tr.setAttribute('data-step-num', idx + 1);
                tr.className = `trace-row trace-${step.actionType.toLowerCase().replace(/_/g, '-')}`;

                tr.innerHTML = `
                    <td class="td-step-num" style="text-align: center;">
                        ${isFirst ? '<span class="active-step-badge"><span class="pulse-dot"></span>▶ CURRENT</span>' : `<span class="step-num-badge">Step ${idx + 1}</span>`}
                    </td>
                    <td class="td-trace-stack"><code>${this.escapeHtml(stackStr)}</code></td>
                    <td class="td-trace-input"><code>${this.escapeHtml(inputStr)}</code></td>
                    <td class="td-trace-prod"><code>${this.escapeHtml(step.production || (step.actionType.startsWith('MATCH') ? 'Match terminal' : '—'))}</code></td>
                    <td class="td-trace-action"><span class="badge ${badgeClass}">${this.escapeHtml(formattedAction)}</span></td>
                    <td class="td-trace-note" title="${this.escapeHtml(step.explanation)}">${this.escapeHtml(step.explanation)}</td>
                `;

                tr.addEventListener('click', () => {
                    if (this.animator) {
                        this.animator.jumpToStep(idx);
                    }
                });

                tbody.appendChild(tr);
            });
        });

        this.updateTraceTableHighlight(0);
    }

    /**
     * Highlights the active row in the trace table with glowing badge and auto-scrolls it into view.
     */
    updateTraceTableHighlight(stepIndex) {
        const chip = document.getElementById('trace-chip-text');
        const total = this.animator && this.animator.steps ? this.animator.steps.length : 1;
        const currentStep = this.animator && this.animator.steps ? this.animator.steps[stepIndex] : null;
        const actionLabel = currentStep ? currentStep.actionType.replace(/_/g, ' ') : '';
        if (chip) {
            chip.textContent = `Step ${stepIndex + 1} of ${total}${actionLabel ? ' • ' + actionLabel : ''}`;
        }

        document.querySelectorAll('.trace-row.active-row').forEach(r => {
            r.classList.remove('active-row');
            const numCell = r.querySelector('.td-step-num');
            const stepNum = r.getAttribute('data-step-num');
            if (numCell && stepNum) {
                numCell.innerHTML = `<span class="step-num-badge">Step ${stepNum}</span>`;
            }
        });

        const rowIds = [
            `parsing-trace-tbody-row-${stepIndex}`,
            `section8-trace-tbody-row-${stepIndex}`,
            `trace-row-${stepIndex}`
        ];

        rowIds.forEach(id => {
            const row = document.getElementById(id);
            if (row) {
                row.classList.add('active-row');
                const numCell = row.querySelector('.td-step-num');
                if (numCell) {
                    numCell.innerHTML = `<span class="active-step-badge"><span class="pulse-dot"></span>▶ CURRENT</span>`;
                }
            }
        });

        const containers = [
            document.getElementById('parsing-trace-table-container'),
            document.getElementById('section8-trace-table-container')
        ].filter(Boolean);

        containers.forEach(container => {
            if (container.offsetParent !== null) {
                const activeRow = container.querySelector('.trace-row.active-row');
                if (activeRow) {
                    const rowTop = activeRow.offsetTop;
                    const containerHeight = container.clientHeight;
                    const targetScroll = Math.max(0, rowTop - (containerHeight / 2) + (activeRow.clientHeight / 2));
                    container.scrollTo({
                        top: targetScroll,
                        behavior: 'smooth'
                    });
                }
            }
        });
    }

    /**
     * Renders final results card (Verdict, Total Steps, Error / Success details, suggested fixes).
     */
    renderResultsSummary(result, inputString) {
        const statusBadge = document.getElementById('results-status-badge');
        const verdictMsg = document.getElementById('results-verdict-msg');
        const totalStepsEl = document.getElementById('results-total-steps');
        const inputEchoEl = document.getElementById('results-input-echo');

        if (inputEchoEl) inputEchoEl.textContent = inputString;
        if (totalStepsEl) totalStepsEl.textContent = result.totalSteps;

        if (result.success) {
            if (statusBadge) {
                statusBadge.textContent = 'ACCEPTED';
                statusBadge.className = 'status-badge status-accepted';
            }
            if (verdictMsg) {
                verdictMsg.innerHTML = '<strong>Success:</strong> Input string is syntactically valid according to the grammar rules. The predictive parse stack successfully reached <code>$</code>.';
            }
        } else {
            if (statusBadge) {
                statusBadge.textContent = 'REJECTED';
                statusBadge.className = 'status-badge status-rejected';
            }
            if (verdictMsg) {
                verdictMsg.innerHTML = `
                    <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--accent-red); padding: 12px; border-radius: var(--radius-md);">
                        <div style="font-weight: 700; color: var(--accent-red); margin-bottom: 4px;">❌ Syntax Error Diagnosed:</div>
                        <div style="margin-bottom: 8px;">${this.escapeHtml(result.errorMessage || 'Invalid input string.')}</div>
                        <div style="font-size: 12.5px; color: var(--text-secondary);">
                            <strong>Suggested Correction:</strong> Verify that consecutive operators (+, *) are separated by identifiers/numbers, parenthesized sub-expressions are balanced, and lookahead tokens match valid table transitions.
                        </div>
                    </div>
                `;
            }
        }
    }

    /**
     * Binds Lexical Analysis (Scanner Module)
     */
    bindLexerControls() {
        const scanBtn = document.getElementById('btn-scan-tokens');
        const sendBtn = document.getElementById('btn-send-tokens-to-parser');
        const inputEl = document.getElementById('lexer-input-code');

        document.querySelectorAll('.lexer-sample-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-code');
                if (inputEl) inputEl.value = code;
                this.runLexerScan();
            });
        });

        if (scanBtn) {
            scanBtn.addEventListener('click', () => this.runLexerScan());
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                if (!this.lexer) return;
                const tokens = this.lexer.tokens || [];
                const mappedTokens = this.lexer.getParserTokenStream();

                if (mappedTokens.length === 0) {
                    alert('Please scan source code first to produce tokens.');
                    return;
                }

                const str = mappedTokens.join(' ');
                const parserInp = document.getElementById('parser-input-string');
                if (parserInp) parserInp.value = str;

                this.executeParsing(str);
                this.switchSection('section-stack');
            });
        }
    }

    runLexerScan() {
        const inputEl = document.getElementById('lexer-input-code');
        const streamContainer = document.getElementById('lexer-tokens-stream');
        const tableBody = document.getElementById('lexer-tokens-table-tbody');
        const errorsContainer = document.getElementById('lexer-errors-container');
        if (!inputEl || !this.lexer) return;

        const code = inputEl.value;
        const tokens = this.lexer.tokenize(code);

        // Render Token Stream Pills
        if (streamContainer) {
            streamContainer.innerHTML = tokens.map(tok => {
                const badgeType = tok.type.toLowerCase().replace(/_/g, '-');
                return `<span class="token-pill token-pill-${badgeType}"><strong>${this.escapeHtml(tok.type)}</strong>: "${this.escapeHtml(tok.lexeme)}"</span>`;
            }).join(' ');
        }

        // Render Table
        if (tableBody) {
            tableBody.innerHTML = tokens.map((tok, i) => `
                <tr>
                    <td><strong>${i + 1}</strong></td>
                    <td><span class="badge badge-nt">${this.escapeHtml(tok.type)}</span></td>
                    <td><code>${this.escapeHtml(tok.lexeme)}</code></td>
                    <td>${tok.line}</td>
                    <td>${tok.columnStart}-${tok.columnEnd}</td>
                    <td><span class="badge badge-term">${this.escapeHtml(tok.mappedTerminal)}</span></td>
                </tr>
            `).join('');
        }

        // Display Lexical Errors if any
        if (errorsContainer) {
            if (this.lexer.errors.length > 0) {
                errorsContainer.classList.remove('hidden');
                errorsContainer.innerHTML = this.lexer.errors.map(err => `
                    <div class="alert-error" style="margin-bottom: 6px;">
                        ⚠️ Lexical Error at line ${err.line}, col ${err.column}: Unrecognized character <code>${this.escapeHtml(err.char)}</code>
                    </div>
                `).join('');
            } else {
                errorsContainer.classList.add('hidden');
                errorsContainer.innerHTML = '';
            }
        }
    }

    /**
     * Binds Practice & Assessment Quiz Engine
     */
    bindQuizControls() {
        if (!this.quiz) return;

        // Difficulty filter buttons
        document.querySelectorAll('.quiz-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.quiz-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const diff = btn.getAttribute('data-filter');
                this.quiz.setDifficultyFilter(diff);
                this.renderQuizQuestion();
            });
        });

        const nextBtn = document.getElementById('btn-quiz-next');
        const prevBtn = document.getElementById('btn-quiz-prev');
        const restartBtn = document.getElementById('btn-quiz-restart');
        const retryBtn = document.getElementById('btn-quiz-retry');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.quiz.nextQuestion()) {
                    this.renderQuizQuestion();
                } else {
                    this.showQuizResults();
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.quiz.prevQuestion()) {
                    this.renderQuizQuestion();
                }
            });
        }

        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.quiz.reset();
                this.renderQuizQuestion();
            });
        }

        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.quiz.reset();
                this.renderQuizQuestion();
            });
        }

        this.renderQuizQuestion();
    }

    renderQuizQuestion() {
        if (!this.quiz) return;
        const qContainer = document.getElementById('quiz-question-container');
        const resContainer = document.getElementById('quiz-results-container');
        if (!qContainer) return;

        qContainer.classList.remove('hidden');
        if (resContainer) resContainer.classList.add('hidden');

        const q = this.quiz.getCurrentQuestion();
        if (!q) {
            qContainer.innerHTML = '<div class="text-muted">No questions found for this filter.</div>';
            return;
        }

        const stats = this.quiz.getStats();

        // Update headers
        const catEl = document.getElementById('quiz-q-category');
        const diffEl = document.getElementById('quiz-q-difficulty');
        const numEl = document.getElementById('quiz-q-number');
        const textEl = document.getElementById('quiz-q-text');
        const grammarBox = document.getElementById('quiz-q-grammar-box');
        const grammarText = document.getElementById('quiz-q-grammar');
        const optionsContainer = document.getElementById('quiz-options-container');
        const feedbackBox = document.getElementById('quiz-feedback-box');
        const scorePill = document.getElementById('quiz-score-pill');
        const progressBar = document.getElementById('quiz-progress-bar');

        if (catEl) catEl.textContent = q.category;
        if (diffEl) {
            diffEl.textContent = q.difficulty.toUpperCase();
            diffEl.className = `badge badge-${q.difficulty}`;
        }
        if (numEl) numEl.textContent = `Question ${stats.currentIndex + 1} of ${stats.total}`;
        if (textEl) textEl.textContent = q.question;

        if (grammarBox && grammarText) {
            if (q.grammar) {
                grammarBox.style.display = 'block';
                grammarText.textContent = q.grammar;
            } else {
                grammarBox.style.display = 'none';
            }
        }

        if (scorePill) scorePill.textContent = `Score: ${stats.score} / ${stats.answered}`;
        if (progressBar) progressBar.style.width = `${stats.progressPercentage}%`;

        // Render options
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
            q.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = 'quiz-option-btn';
                btn.innerHTML = `<span class="opt-letter">${String.fromCharCode(65 + idx)}</span> <span>${this.escapeHtml(opt)}</span>`;

                if (q.userAnswerIndex !== null) {
                    btn.disabled = true;
                    if (idx === q.correctIndex) {
                        btn.classList.add('opt-correct');
                    } else if (idx === q.userAnswerIndex) {
                        btn.classList.add('opt-incorrect');
                    }
                }

                btn.addEventListener('click', () => {
                    const result = this.quiz.submitAnswer(idx);
                    this.renderQuizQuestion();
                });

                optionsContainer.appendChild(btn);
            });
        }

        // Render feedback box if already answered
        if (feedbackBox) {
            if (q.userAnswerIndex !== null) {
                feedbackBox.classList.remove('hidden');
                const isCorrect = (q.userAnswerIndex === q.correctIndex);
                feedbackBox.className = isCorrect ? 'quiz-feedback-box alert-success' : 'quiz-feedback-box alert-error';
                feedbackBox.innerHTML = `
                    <div style="font-weight: 700; margin-bottom: 4px;">
                        ${isCorrect ? '✓ Correct!' : '✕ Incorrect.'}
                    </div>
                    <div style="font-size: 13.5px; line-height: 1.6;">${this.escapeHtml(q.explanation)}</div>
                `;
            } else {
                feedbackBox.classList.add('hidden');
                feedbackBox.innerHTML = '';
            }
        }
    }

    showQuizResults() {
        if (!this.quiz) return;
        const qContainer = document.getElementById('quiz-question-container');
        const resContainer = document.getElementById('quiz-results-container');
        if (!resContainer) return;

        if (qContainer) qContainer.classList.add('hidden');
        resContainer.classList.remove('hidden');

        const stats = this.quiz.getStats();
        const scoreText = document.getElementById('quiz-result-score-text');
        const feedbackEl = document.getElementById('quiz-result-feedback');
        const iconEl = document.getElementById('quiz-result-icon');
        const incorrectReviewBox = document.getElementById('quiz-incorrect-review-box');
        const incorrectList = document.getElementById('quiz-incorrect-list');

        if (scoreText) scoreText.textContent = `You scored ${stats.score} out of ${stats.total} (${stats.scorePercentage}%)`;

        if (stats.scorePercentage >= 80) {
            if (iconEl) iconEl.textContent = '🏆';
            if (feedbackEl) feedbackEl.textContent = 'Outstanding Mastery! You have a rock-solid theoretical and practical command of LL(1) grammars, FIRST/FOLLOW derivations, and predictive parsing.';
        } else if (stats.scorePercentage >= 50) {
            if (iconEl) iconEl.textContent = '👍';
            if (feedbackEl) feedbackEl.textContent = 'Good Effort! You understand the foundational concepts. Review the incorrect questions below to sharpen your precision on edge-case conflicts.';
        } else {
            if (iconEl) iconEl.textContent = '📚';
            if (feedbackEl) feedbackEl.textContent = 'Keep Practicing! Review the Theory & Viva Guide module to reinforce left recursion, epsilon propagation, and table construction formulas.';
        }

        // Review missed questions
        const missed = this.quiz.getIncorrectQuestions();
        if (incorrectReviewBox && incorrectList) {
            if (missed.length > 0) {
                incorrectReviewBox.classList.remove('hidden');
                incorrectList.innerHTML = missed.map(m => `
                    <div class="card" style="padding: 12px; background: var(--bg-input);">
                        <div style="font-weight: 700; font-size: 13.5px; margin-bottom: 4px;">${this.escapeHtml(m.question)}</div>
                        <div style="font-size: 12.5px; color: var(--accent-red);">Your Answer: ${this.escapeHtml(m.options[m.userAnswerIndex])}</div>
                        <div style="font-size: 12.5px; color: #10b981; font-weight: 700;">Correct: ${this.escapeHtml(m.options[m.correctIndex])}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">💡 ${this.escapeHtml(m.explanation)}</div>
                    </div>
                `).join('');
            } else {
                incorrectReviewBox.classList.add('hidden');
                incorrectList.innerHTML = '';
            }
        }
    }

    /**
     * Binds Topbar and Inline Export buttons
     */
    bindExportControls() {
        const menuBtn = document.getElementById('btn-export-menu');
        const menuDropdown = document.getElementById('export-dropdown-menu');

        if (menuBtn && menuDropdown) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menuDropdown.classList.toggle('hidden');
            });

            document.addEventListener('click', () => {
                menuDropdown.classList.add('hidden');
            });
        }

        // CSV Table
        const btnTableCsv = document.getElementById('btn-export-table-csv');
        const btnTableCsvPage = document.getElementById('btn-export-table-csv-page');
        const exportTable = () => {
            if (typeof DataExporter !== 'undefined' && this.tableGen && this.grammar) {
                DataExporter.exportTableCSV(this.tableGen, this.grammar);
            }
        };
        if (btnTableCsv) btnTableCsv.addEventListener('click', exportTable);
        if (btnTableCsvPage) btnTableCsvPage.addEventListener('click', exportTable);

        // CSV Trace
        const btnTraceCsv = document.getElementById('btn-export-trace-csv');
        if (btnTraceCsv) {
            btnTraceCsv.addEventListener('click', () => {
                if (typeof DataExporter !== 'undefined' && this.animator) {
                    DataExporter.exportTraceCSV(this.animator.steps || []);
                }
            });
        }

        // TXT Grammar
        const btnGrammarTxt = document.getElementById('btn-export-grammar-txt');
        if (btnGrammarTxt) {
            btnGrammarTxt.addEventListener('click', () => {
                if (typeof DataExporter !== 'undefined' && this.grammar) {
                    DataExporter.exportGrammarTXT(this.grammar);
                }
            });
        }

        // JSON Sets
        const btnSetsJson = document.getElementById('btn-export-sets-json');
        if (btnSetsJson) {
            btnSetsJson.addEventListener('click', () => {
                if (typeof DataExporter !== 'undefined' && this.firstCalc && this.followCalc && this.grammar) {
                    DataExporter.exportSetsJSON(this.firstCalc, this.followCalc, this.grammar);
                }
            });
        }

        // Printable PDF Report
        const btnReportPdf = document.getElementById('btn-export-report-pdf');
        if (btnReportPdf) {
            btnReportPdf.addEventListener('click', () => {
                if (typeof DataExporter !== 'undefined' && this.grammar && this.tableGen) {
                    const inputStr = document.getElementById('parser-input-string')?.value || 'id + id * id';
                    const steps = this.animator ? (this.animator.steps || []) : [];
                    DataExporter.exportReportPDF(this.grammar, this.tableGen, this.firstCalc, this.followCalc, steps, inputStr);
                }
            });
        }

        // SVG Parse Tree Export & Fit
        const btnExportSvg = document.getElementById('btn-export-svg-tree');
        const btnFitTree = document.getElementById('btn-fit-tree');
        if (btnExportSvg && this.treeVisualizer) {
            btnExportSvg.addEventListener('click', () => this.treeVisualizer.exportSVG());
        }
        if (btnFitTree && this.treeVisualizer) {
            btnFitTree.addEventListener('click', () => this.treeVisualizer.centerTree());
        }
    }

    /**
     * Binds 8-Step Interactive Guided Tour
     */
    bindTourControls() {
        const startBtn = document.getElementById('btn-start-tour');
        const modal = document.getElementById('guided-tour-modal');
        const closeBtn = document.getElementById('btn-close-tour');
        const nextBtn = document.getElementById('btn-tour-next');
        const prevBtn = document.getElementById('btn-tour-prev');

        if (startBtn && modal) {
            startBtn.addEventListener('click', () => {
                this.tourStepIndex = 0;
                this.renderTourStep();
                modal.classList.remove('hidden');
            });
        }

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.tourStepIndex < this.tourSteps.length - 1) {
                    this.tourStepIndex++;
                    this.renderTourStep();
                } else {
                    if (modal) modal.classList.add('hidden');
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.tourStepIndex > 0) {
                    this.tourStepIndex--;
                    this.renderTourStep();
                }
            });
        }
    }

    renderTourStep() {
        const step = this.tourSteps[this.tourStepIndex];
        if (!step) return;

        const titleEl = document.getElementById('tour-step-title');
        const contentEl = document.getElementById('tour-step-content');
        const counterEl = document.getElementById('tour-step-counter');
        const nextBtn = document.getElementById('btn-tour-next');

        if (titleEl) titleEl.textContent = step.title;
        if (contentEl) contentEl.innerHTML = `<p>${step.content}</p>`;
        if (counterEl) counterEl.textContent = `Step ${this.tourStepIndex + 1} of ${this.tourSteps.length}`;
        if (nextBtn) {
            nextBtn.textContent = (this.tourStepIndex === this.tourSteps.length - 1) ? 'Finish Tour ✓' : 'Next Step ⏭';
        }

        // Switch to relevant section in background
        this.switchSection(step.section);
    }

    /**
     * Binds Theory vs Viva Mode tab switcher
     */
    bindVivaTabs() {
        const btnTheory = document.getElementById('btn-tab-theory-guide');
        const btnViva = document.getElementById('btn-tab-viva-mode');
        const viewTheory = document.getElementById('view-theory-guide');
        const viewViva = document.getElementById('view-viva-mode');

        if (btnTheory && btnViva && viewTheory && viewViva) {
            btnTheory.addEventListener('click', () => {
                btnTheory.className = 'btn btn-primary btn-sm';
                btnViva.className = 'btn btn-secondary btn-sm';
                viewTheory.classList.remove('hidden');
                viewViva.classList.add('hidden');
            });

            btnViva.addEventListener('click', () => {
                btnViva.className = 'btn btn-primary btn-sm';
                btnTheory.className = 'btn btn-secondary btn-sm';
                viewViva.classList.remove('hidden');
                viewTheory.classList.add('hidden');
            });
        }
    }

    cleanId(str) {
        return String(str).replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}

// Export for Node.js test environment or browser global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
} else if (typeof window !== 'undefined') {
    window.UIController = UIController;
}
