/**
 * LL(1) Predictive Parser - SVG Parse Tree Visualizer
 * Renders an interactive, responsive hierarchical SVG parse tree with
 * dynamic step-by-step node highlighting, pan/zoom, and export capabilities.
 */

class ParseTreeVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.svg = null;
        this.treeData = null;
        this.scale = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;
        this.nodeWidth = 54;
        this.nodeHeight = 36;
        this.levelHeight = 75;
        this.nodeSpacing = 24;
    }

    /**
     * Initializes SVG canvas within the designated container.
     */
    init() {
        if (!this.container) return;
        this.container.innerHTML = '';

        // Wrapper controls for Zoom / Pan
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'tree-controls';
        controlsDiv.innerHTML = `
            <button class="btn-icon" id="tree-zoom-in" title="Zoom In"><i class="icon">+</i></button>
            <button class="btn-icon" id="tree-zoom-out" title="Zoom Out"><i class="icon">−</i></button>
            <button class="btn-icon" id="tree-zoom-reset" title="Reset View"><i class="icon">⟲</i></button>
            <button class="btn-icon" id="tree-export-svg" title="Export as SVG"><i class="icon">⤓</i></button>
        `;
        this.container.appendChild(controlsDiv);

        const svgWrapper = document.createElement('div');
        svgWrapper.className = 'svg-viewport';
        svgWrapper.style.width = '100%';
        svgWrapper.style.height = '100%';
        svgWrapper.style.overflow = 'hidden';
        svgWrapper.style.position = 'relative';
        svgWrapper.style.cursor = 'grab';

        const svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgElem.setAttribute('width', '100%');
        svgElem.setAttribute('height', '100%');
        svgElem.setAttribute('class', 'parse-tree-svg');

        // Create main pan/zoom group
        const gMain = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gMain.setAttribute('class', 'tree-main-group');
        svgElem.appendChild(gMain);

        svgWrapper.appendChild(svgElem);
        this.container.appendChild(svgWrapper);

        this.svg = svgElem;
        this.mainGroup = gMain;

        // Pan and Zoom Event Listeners
        this.setupInteractions(svgWrapper);
    }

    /**
     * Sets up mouse drag panning and wheel zooming.
     */
    setupInteractions(wrapper) {
        wrapper.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            this.isPanning = true;
            this.startX = e.clientX - this.panX;
            this.startY = e.clientY - this.panY;
            wrapper.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isPanning) return;
            this.panX = e.clientX - this.startX;
            this.panY = e.clientY - this.startY;
            this.updateTransform();
        });

        window.addEventListener('mouseup', () => {
            this.isPanning = false;
            if (wrapper) wrapper.style.cursor = 'grab';
        });

        wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            this.scale = Math.min(Math.max(0.3, this.scale * zoomFactor), 3.0);
            this.updateTransform();
        }, { passive: false });

        document.getElementById('tree-zoom-in')?.addEventListener('click', () => {
            this.scale = Math.min(3.0, this.scale * 1.2);
            this.updateTransform();
        });

        document.getElementById('tree-zoom-out')?.addEventListener('click', () => {
            this.scale = Math.max(0.3, this.scale / 1.2);
            this.updateTransform();
        });

        document.getElementById('tree-zoom-reset')?.addEventListener('click', () => {
            this.scale = 1.0;
            this.panX = 0;
            this.panY = 0;
            this.centerTree();
        });

        document.getElementById('tree-export-svg')?.addEventListener('click', () => {
            this.exportSVG();
        });
    }

    /**
     * Updates SVG transform attribute for pan & zoom.
     */
    updateTransform() {
        if (!this.mainGroup) return;
        this.mainGroup.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.scale})`);
    }

    /**
     * Positions and renders the parse tree.
     * @param {Object} parseTree - { root, nodes }
     * @param {number|null} activeNodeId - ID of currently active/focused node
     * @param {Array} nodeStatuses - Status list from current step
     */
    render(parseTree, activeNodeId = null, nodeStatuses = null) {
        if (!this.svg || !this.mainGroup) {
            this.init();
        }
        if (!this.mainGroup) return;

        this.mainGroup.innerHTML = '';
        if (!parseTree || !parseTree.root) {
            this.showEmptyState();
            return;
        }

        this.treeData = parseTree;
        const nodesMap = new Map();
        for (const n of parseTree.nodes) {
            nodesMap.set(n.id, { ...n, x: 0, y: 0, width: this.nodeWidth, mod: 0 });
        }

        // Apply dynamic statuses if provided from playback step
        if (nodeStatuses) {
            for (const st of nodeStatuses) {
                const node = nodesMap.get(st.id);
                if (node) {
                    node.status = st.status;
                }
            }
        }

        // Step 1: Assign Depths and Compute Tree Layout Coordinates
        this.computeLayout(parseTree.root.id, nodesMap, 0);

        // Step 2: Draw connecting lines first (underneath nodes)
        const linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        linesGroup.setAttribute('class', 'tree-edges');

        for (const [id, node] of nodesMap.entries()) {
            if (node.children && node.children.length > 0) {
                for (const childId of node.children) {
                    const child = nodesMap.get(childId);
                    if (child) {
                        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        const x1 = node.x;
                        const y1 = node.y + this.nodeHeight / 2;
                        const x2 = child.x;
                        const y2 = child.y - this.nodeHeight / 2;
                        const midY = (y1 + y2) / 2;

                        // Smooth cubic bezier curve connecting parent to child
                        const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
                        path.setAttribute('d', d);
                        path.setAttribute('fill', 'none');
                        path.setAttribute('stroke', 'var(--border-color, #475569)');
                        path.setAttribute('stroke-width', '2');
                        linesGroup.appendChild(path);
                    }
                }
            }
        }
        this.mainGroup.appendChild(linesGroup);

        // Step 3: Draw Nodes
        const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodesGroup.setAttribute('class', 'tree-nodes');

        for (const [id, node] of nodesMap.entries()) {
            const gNode = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            gNode.setAttribute('class', `tree-node-group ${id === activeNodeId ? 'node-active' : ''}`);
            gNode.setAttribute('transform', `translate(${node.x}, ${node.y})`);

            // Node Shape (Rounded Rectangle)
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const w = Math.max(this.nodeWidth, node.symbol.length * 12 + 20);
            rect.setAttribute('x', -w / 2);
            rect.setAttribute('y', -this.nodeHeight / 2);
            rect.setAttribute('width', w);
            rect.setAttribute('height', this.nodeHeight);
            rect.setAttribute('rx', '8');
            rect.setAttribute('ry', '8');

            // Apply semantic colors
            let fillColor = 'var(--node-nt-bg, #1e293b)';
            let strokeColor = 'var(--node-nt-border, #6366f1)';
            let textColor = 'var(--node-nt-text, #e2e8f0)';

            if (node.isEpsilon) {
                fillColor = 'var(--node-eps-bg, #334155)';
                strokeColor = 'var(--node-eps-border, #94a3b8)';
                textColor = 'var(--node-eps-text, #cbd5e1)';
                rect.setAttribute('stroke-dasharray', '4,3');
            } else if (node.isTerminal) {
                fillColor = 'var(--node-term-bg, #064e3b)';
                strokeColor = 'var(--node-term-border, #10b981)';
                textColor = 'var(--node-term-text, #a7f3d0)';
            }

            if (id === activeNodeId) {
                strokeColor = 'var(--node-active-border, #f59e0b)';
                rect.setAttribute('stroke-width', '3');
                rect.setAttribute('class', 'pulse-glow');
            } else {
                rect.setAttribute('stroke-width', '1.5');
            }

            rect.setAttribute('fill', fillColor);
            rect.setAttribute('stroke', strokeColor);
            gNode.appendChild(rect);

            // Node Symbol Text
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '0');
            text.setAttribute('y', '5');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', textColor);
            text.setAttribute('font-family', 'var(--font-mono, monospace)');
            text.setAttribute('font-size', '14');
            text.setAttribute('font-weight', '600');
            text.textContent = node.symbol;
            gNode.appendChild(text);

            nodesGroup.appendChild(gNode);
        }
        this.mainGroup.appendChild(nodesGroup);

        this.centerTree();
    }

    /**
     * Computes hierarchical 2D tree layout using recursive width bounding.
     */
    computeLayout(rootId, nodesMap, depth) {
        let currentLeafX = 0;

        const assignPositions = (nodeId, level) => {
            const node = nodesMap.get(nodeId);
            if (!node) return 0;
            node.y = level * this.levelHeight + 50;

            if (!node.children || node.children.length === 0) {
                // Leaf node
                node.x = currentLeafX;
                currentLeafX += this.nodeWidth + this.nodeSpacing;
                return node.x;
            }

            // Internal node: position centered over children
            let sumChildX = 0;
            for (const childId of node.children) {
                sumChildX += assignPositions(childId, level + 1);
            }
            node.x = sumChildX / node.children.length;
            return node.x;
        };

        assignPositions(rootId, depth);
    }

    /**
     * Automatically centers the tree within the SVG viewport.
     */
    centerTree() {
        if (!this.svg || !this.mainGroup) return;
        const bbox = this.mainGroup.getBBox();
        const containerWidth = this.container.clientWidth || 800;
        const containerHeight = this.container.clientHeight || 500;

        if (bbox.width === 0 || bbox.height === 0) return;

        const padding = 40;
        const availableW = containerWidth - padding * 2;
        const availableH = containerHeight - padding * 2;

        const scaleX = availableW / bbox.width;
        const scaleY = availableH / bbox.height;
        this.scale = Math.min(1.0, Math.min(scaleX, scaleY));

        this.panX = (containerWidth - bbox.width * this.scale) / 2 - bbox.x * this.scale;
        this.panY = Math.max(30, (containerHeight - bbox.height * this.scale) / 2 - bbox.y * this.scale);

        this.updateTransform();
    }

    /**
     * Shows a placeholder message when no tree is generated.
     */
    showEmptyState() {
        if (!this.mainGroup) return;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '50%');
        text.setAttribute('y', '50%');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'var(--text-muted, #64748b)');
        text.setAttribute('font-size', '16');
        text.textContent = 'Parse tree will appear here upon parsing execution.';
        this.mainGroup.appendChild(text);
    }

    /**
     * Exports the current SVG as a downloadable vector file.
     */
    exportSVG() {
        if (!this.svg) return;
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(this.svg);

        // Add XML namespace
        if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = "ll1_parse_tree.svg";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
}

// Export for Node.js test environment or browser global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParseTreeVisualizer;
} else if (typeof window !== 'undefined') {
    window.ParseTreeVisualizer = ParseTreeVisualizer;
}

