/**
 * LL(1) Predictive Parser - Animation Controller
 * Orchestrates granular step-by-step slow-motion parsing animation with
 * reversible state rollback, atomic transitions (push, pop, match-compare, match-consume, epsilon),
 * and synchronized stack / tape / tree rendering.
 */

class AnimationController {
    constructor(parser, treeVisualizer) {
        this.parser = parser;
        this.treeVisualizer = treeVisualizer;
        this.steps = [];
        this.currentStepIndex = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.timer = null;

        // Speed presets in milliseconds (Default must be SLOW for university demonstration)
        this.speedPresets = {
            slow: 1400,
            normal: 700,
            fast: 250
        };
        this.delayMs = this.speedPresets.slow; // Default SLOW

        this.onStepChange = null;
        this.onComplete = null;
        this.onError = null;
    }

    /**
     * Loads fresh steps from a parser run.
     */
    loadSteps(steps, parseTree = null) {
        this.stop();
        this.steps = steps || [];
        this.parseTree = parseTree;
        this.currentStepIndex = 0;
        this.isPaused = false;

        if (this.steps.length > 0) {
            this.renderStep(0, 'jump');
        }
    }

    /**
     * Sets playback speed in milliseconds.
     */
    setSpeed(ms) {
        this.delayMs = Math.max(60, Math.min(ms, 3000));
        if (this.isPlaying) {
            this.pause();
            this.play();
        }
    }

    /**
     * Starts continuous playback from current step.
     */
    play() {
        if (this.steps.length === 0) return;
        if (this.currentStepIndex >= this.steps.length - 1) {
            this.currentStepIndex = 0; // Restart from beginning if at the end
        }

        this.isPlaying = true;
        this.isPaused = false;
        this.updatePlayPauseButtonUI(true);

        const tick = () => {
            if (!this.isPlaying) return;

            if (this.currentStepIndex < this.steps.length - 1) {
                this.stepForward();
                this.timer = setTimeout(tick, this.delayMs);
            } else {
                this.pause();
                if (this.onComplete) this.onComplete(this.steps[this.steps.length - 1]);
            }
        };

        this.timer = setTimeout(tick, this.delayMs);
    }

    /**
     * Pauses playback.
     */
    pause() {
        this.isPlaying = false;
        this.isPaused = true;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.updatePlayPauseButtonUI(false);
    }

    /**
     * Completely stops playback and resets timer.
     */
    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.updatePlayPauseButtonUI(false);
    }

    /**
     * Restarts animation from step 0.
     */
    restart() {
        this.stop();
        this.currentStepIndex = 0;
        this.renderStep(0, 'jump');
    }

    /**
     * Advances exactly one step forward.
     */
    stepForward() {
        if (this.currentStepIndex < this.steps.length - 1) {
            this.currentStepIndex++;
            this.renderStep(this.currentStepIndex, 'forward');
            return true;
        }
        return false;
    }

    /**
     * Reversible rollback: exactly restores the previous state snapshot.
     */
    stepBackward() {
        this.pause();
        if (this.currentStepIndex > 0) {
            this.currentStepIndex--;
            this.renderStep(this.currentStepIndex, 'backward');
            return true;
        }
        return false;
    }

    /**
     * Jumps directly to an arbitrary step index.
     */
    jumpToStep(index) {
        this.pause();
        if (index >= 0 && index < this.steps.length) {
            this.currentStepIndex = index;
            this.renderStep(index, 'jump');
        }
    }

    /**
     * Renders a given step into the DOM with visual animation cues.
     */
    renderStep(index, direction = 'forward') {
        const step = this.steps[index];
        if (!step) return;

        // 1. Update Stack View
        this.renderStack(step, direction);

        // 2. Update Input Tape View
        this.renderInputTape(step, direction);

        // 3. Update Action, Top, Token, Production Info Badges
        this.renderStatusPanels(step);

        // 4. Update Parse Tree
        if (this.treeVisualizer && this.parseTree) {
            this.treeVisualizer.render(this.parseTree, step.activeNodeId, step.nodeStatuses);
        }

        // 5. Notify UI listeners (trace table auto-scroll & highlight)
        if (this.onStepChange) {
            this.onStepChange(step, index, this.steps.length);
        }

        // 6. Handle Acceptance / Error banners
        if (typeof document !== 'undefined') {
            if (step.actionType === 'ACCEPT') {
                this.triggerAcceptanceAnimation();
            } else if (step.actionType === 'ERROR') {
                this.triggerErrorAnimation(step.explanation);
            } else {
                // Hide acceptance celebration banner if rewinding backwards
                const banner = document.getElementById('parsing-success-banner');
                if (banner) {
                    banner.classList.add('hidden');
                    banner.classList.remove('show-celebration');
                }
            }
        }
    }

    /**
     * Renders vertical stack with clear TOP and BOTTOM indicators.
     */
    renderStack(step, direction) {
        if (typeof document === 'undefined') return;
        const stackContainer = document.getElementById('visual-stack-items');
        if (!stackContainer) return;

        stackContainer.innerHTML = '';
        const stackArr = step.stack || [];

        if (stackArr.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'stack-empty-msg';
            emptyEl.textContent = '[ Empty Stack ]';
            stackContainer.appendChild(emptyEl);
            return;
        }

        for (let i = stackArr.length - 1; i >= 0; i--) {
            const item = stackArr[i];
            const sym = item.symbol;
            const isTop = (i === stackArr.length - 1);
            const isBottom = (i === 0 && sym === '$');

            const itemEl = document.createElement('div');
            itemEl.className = 'stack-item';

            if (isTop) itemEl.classList.add('is-top');
            if (isBottom) itemEl.classList.add('is-bottom');

            // Apply semantic class
            if (sym === '$') {
                itemEl.classList.add('sym-dollar');
            } else if (window.currentGrammar && window.currentGrammar.isTerminal(sym)) {
                itemEl.classList.add('sym-terminal');
            } else {
                itemEl.classList.add('sym-nonterminal');
            }

            // Micro-action specific styling
            let actionBadgeText = isTop ? 'TOP ▲' : '';
            if (isTop) {
                if (step.actionType === 'PUSH') {
                    itemEl.classList.add('animate-push');
                    actionBadgeText = `PUSHED ↙`;
                } else if (step.actionType === 'MATCH_COMPARE') {
                    itemEl.classList.add('animate-match');
                    actionBadgeText = `MATCHING ✓`;
                } else if (step.actionType === 'MATCH_CONSUME') {
                    actionBadgeText = `POPPING ↗`;
                } else if (step.actionType === 'PREDICT') {
                    actionBadgeText = `PREDICT 🔍`;
                } else if (step.actionType === 'POP') {
                    actionBadgeText = `POP ↗`;
                } else if (step.actionType === 'EPSILON') {
                    actionBadgeText = `ε REMOVE`;
                }
            }

            itemEl.innerHTML = `
                <div class="stack-symbol">${this.escapeHtml(sym)}</div>
                ${isTop ? `<div class="stack-badge top-badge">${actionBadgeText}</div>` : ''}
                ${isBottom ? '<div class="stack-badge bottom-badge">BOTTOM ▼</div>' : ''}
            `;

            stackContainer.appendChild(itemEl);
        }
    }

    /**
     * Renders the input tokens and lookahead tape pointer.
     */
    renderInputTape(step) {
        if (typeof document === 'undefined') return;
        const tapeContainer = document.getElementById('input-tape-tokens');
        if (!tapeContainer) return;

        tapeContainer.innerHTML = '';
        const tokens = step.inputTokens || [];
        const ptr = step.pointer;

        tokens.forEach((tok, idx) => {
            const tokEl = document.createElement('div');
            tokEl.className = 'tape-token';

            if (idx < ptr) {
                tokEl.classList.add('token-consumed');
            } else if (idx === ptr) {
                tokEl.classList.add('token-current');
                if (step.actionType === 'MATCH_COMPARE') {
                    tokEl.classList.add('animate-match');
                } else if (step.actionType === 'ERROR') {
                    tokEl.classList.add('animate-token-error');
                }
            } else {
                tokEl.classList.add('token-upcoming');
            }

            tokEl.innerHTML = `
                <span class="tok-label">${this.escapeHtml(tok)}</span>
                ${idx === ptr ? '<div class="tok-pointer">▲ Lookahead</div>' : ''}
            `;
            tapeContainer.appendChild(tokEl);
        });
    }

    /**
     * Updates real-time diagnostic info cards: Action, Top, Token, Production.
     */
    renderStatusPanels(step) {
        if (typeof document === 'undefined') return;
        const stepNumEl = document.getElementById('anim-step-number');
        if (stepNumEl) stepNumEl.textContent = `Step ${step.step + 1} of ${this.steps.length}`;

        const progressBar = document.getElementById('anim-progress-bar');
        if (progressBar) {
            const pct = Math.round(((step.step + 1) / this.steps.length) * 100);
            progressBar.style.width = `${pct}%`;
        }

        const topEl = document.getElementById('anim-current-top');
        if (topEl) topEl.textContent = step.stackTop || '—';

        const tokEl = document.getElementById('anim-current-token');
        if (tokEl) tokEl.textContent = step.currentToken || '—';

        const prodEl = document.getElementById('anim-current-production');
        if (prodEl) {
            prodEl.textContent = step.production || (step.actionType.startsWith('MATCH') ? 'Match terminal' : '—');
        }

        const actionBadge = document.getElementById('anim-action-badge');
        if (actionBadge) {
            const formattedAction = step.actionType.replace('_', ' ');
            actionBadge.textContent = formattedAction;
            actionBadge.className = `action-badge badge-${step.actionType.toLowerCase().replace('_', '-')}`;
        }

        const explEl = document.getElementById('anim-action-explanation');
        if (explEl) explEl.textContent = step.explanation;
    }

    /**
     * Acceptance celebration animation.
     */
    triggerAcceptanceAnimation() {
        if (typeof document === 'undefined') return;
        const banner = document.getElementById('parsing-success-banner');
        if (banner) {
            banner.classList.remove('hidden');
            banner.classList.add('show-celebration');
        }
    }

    /**
     * Error notification animation.
     */
    triggerErrorAnimation(msg) {
        if (typeof document === 'undefined') return;
        const stackBox = document.getElementById('stack-visualizer-card');
        if (stackBox) {
            stackBox.classList.remove('shake-error');
            void stackBox.offsetWidth;
            stackBox.classList.add('shake-error');
        }
    }

    /**
     * Syncs Play / Pause button UI.
     */
    updatePlayPauseButtonUI(isPlaying) {
        if (typeof document === 'undefined') return;
        const btn = document.getElementById('btn-play-pause');
        if (!btn) return;
        if (isPlaying) {
            btn.innerHTML = '<span class="icon">⏸</span> Pause';
            btn.classList.add('btn-active');
        } else {
            btn.innerHTML = '<span class="icon">▶</span> Play';
            btn.classList.remove('btn-active');
        }
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
    module.exports = AnimationController;
} else if (typeof window !== 'undefined') {
    window.AnimationController = AnimationController;
}
