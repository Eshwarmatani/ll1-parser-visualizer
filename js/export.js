/**
 * LL(1) Predictive Parser - Data Export & Import Utilities
 * Generates CSV parsing tables, CSV execution traces, TXT grammar files,
 * JSON analysis exports, and printable educational PDF reports.
 */

class DataExporter {
    /**
     * Downloads a string as a client-side file.
     */
    static downloadFile(filename, content, mimeType = 'text/plain;charset=utf-8;') {
        if (typeof document === 'undefined') return; // Headless guard

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Generates CSV string for LL(1) Parsing Table M[A, a].
     */
    static generateTableCSV(tableGen, grammar) {
        const terminals = tableGen.terminalsWithDollar;
        const nonTerminals = grammar.nonTerminals;

        const header = ['"Non-Terminal"', ...terminals.map(t => `"${t.replace(/"/g, '""')}"`)];
        const rows = [header.join(',')];

        for (const nt of nonTerminals) {
            const row = [`"${nt.replace(/"/g, '""')}"`];
            for (const t of terminals) {
                const entries = tableGen.table[nt][t] || [];
                if (entries.length === 0) {
                    row.push('""');
                } else if (entries.length === 1) {
                    const ruleStr = `${nt} -> ${entries[0].rawRhs}`;
                    row.push(`"${ruleStr.replace(/"/g, '""')}"`);
                } else {
                    const conflictStr = entries.map(r => `${nt} -> ${r.rawRhs}`).join(' | ');
                    row.push(`"[CONFLICT] ${conflictStr.replace(/"/g, '""')}"`);
                }
            }
            rows.push(row.join(','));
        }

        return rows.join('\r\n');
    }

    static exportTableCSV(tableGen, grammar) {
        const csv = this.generateTableCSV(tableGen, grammar);
        this.downloadFile('ll1_parsing_table.csv', csv, 'text/csv;charset=utf-8;');
    }
    static exportTableCsv(tableGen, grammar) {
        return this.exportTableCSV(tableGen, grammar);
    }

    /**
     * Generates CSV string for parsing execution trace.
     */
    static generateTraceCSV(steps) {
        const header = ['Step', 'Stack', 'Input', 'Production', 'Action', 'Explanation'];
        const rows = [header.map(h => `"${h}"`).join(',')];

        if (steps && steps.length > 0) {
            steps.forEach((s, idx) => {
                const stackStr = s.stackSymbols ? s.stackSymbols.join(' ') : '';
                const remaining = (s.inputTokens && s.pointer !== undefined) ? s.inputTokens.slice(s.pointer).join(' ') : '';
                const prod = s.production || '';
                const action = s.actionType ? s.actionType.replace(/_/g, ' ') : '';
                const expl = s.explanation || '';

                const row = [
                    idx + 1,
                    `"${stackStr.replace(/"/g, '""')}"`,
                    `"${remaining.replace(/"/g, '""')}"`,
                    `"${prod.replace(/"/g, '""')}"`,
                    `"${action.replace(/"/g, '""')}"`,
                    `"${expl.replace(/"/g, '""')}"`
                ];
                rows.push(row.join(','));
            });
        }

        return rows.join('\r\n');
    }

    static exportTraceCSV(steps) {
        const csv = this.generateTraceCSV(steps);
        this.downloadFile('parsing_derivation_trace.csv', csv, 'text/csv;charset=utf-8;');
    }
    static exportTraceCsv(steps) {
        return this.exportTraceCSV(steps);
    }

    /**
     * Generates TXT representation of grammar.
     */
    static generateGrammarTXT(grammar) {
        let txt = `# Context-Free Grammar Definition\n`;
        txt += `# Exported: ${new Date().toISOString()}\n\n`;
        txt += `START SYMBOL: ${grammar.startSymbol || 'None'}\n`;
        txt += `NON-TERMINALS: ${(grammar.nonTerminals || []).join(', ')}\n`;
        txt += `TERMINALS: ${(grammar.terminals || []).join(', ')}\n\n`;
        txt += `PRODUCTIONS:\n`;
        txt += grammar.rawText.trim() + '\n';
        return txt;
    }

    static exportGrammarTXT(grammar) {
        const txt = this.generateGrammarTXT(grammar);
        this.downloadFile('grammar.txt', txt, 'text/plain;charset=utf-8;');
    }
    static exportGrammarTxt(grammar) {
        return this.exportGrammarTXT(typeof grammar === 'string' ? { rawText: grammar, nonTerminals: [], terminals: [] } : grammar);
    }

    /**
     * Generates JSON analysis sets.
     */
    static generateSetsJSON(firstCalc, followCalc, grammar) {
        const payload = {
            grammarOverview: {
                startSymbol: grammar.startSymbol,
                nonTerminals: grammar.nonTerminals,
                terminals: grammar.terminals,
                totalRules: grammar.rules ? grammar.rules.length : 0
            },
            firstSets: firstCalc.getFormattedSets ? firstCalc.getFormattedSets() : firstCalc,
            followSets: followCalc.getFormattedSets ? followCalc.getFormattedSets() : followCalc,
            exportedAt: new Date().toISOString()
        };
        return JSON.stringify(payload, null, 2);
    }

    static exportSetsJSON(firstCalc, followCalc, grammar) {
        const json = this.generateSetsJSON(firstCalc, followCalc, grammar);
        this.downloadFile('first_follow_analysis.json', json, 'application/json;charset=utf-8;');
    }
    static exportSetsJson(firstSets, followSets, grammar) {
        return this.exportSetsJSON(firstSets, followSets, grammar);
    }

    /**
     * Generates printable HTML string for PDF report.
     */
    static generateReportHTML(grammar, tableGen, firstCalc, followCalc, steps, inputString) {
        const firstFormatted = firstCalc.getFormattedSets ? firstCalc.getFormattedSets() : {};
        const followFormatted = followCalc.getFormattedSets ? followCalc.getFormattedSets() : {};
        const isLL1 = tableGen.isLL1 && tableGen.conflicts.length === 0;

        return `<!DOCTYPE html>
<html>
<head>
    <title>LL(1) Predictive Parser Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; margin: 30px; color: #1e293b; }
        h1, h2, h3 { color: #0f172a; margin-bottom: 8px; }
        .meta { color: #64748b; font-size: 13px; margin-bottom: 20px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 13px; }
        .badge-success { background: #dcfce7; color: #15803d; }
        .badge-error { background: #fee2e2; color: #b91c1c; }
        pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-size: 13px; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
        th { background: #f1f5f9; }
        @media print {
            body { margin: 15px; }
            button { display: none; }
        }
    </style>
</head>
<body>
    <button onclick="window.print()" style="float: right; padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">🖨️ Print / Save as PDF</button>
    <h1>🎓 LL(1) Predictive Parser Analysis Report</h1>
    <div class="meta">Compiler Construction Verification Suite • Generated: ${new Date().toLocaleString()}</div>

    <h2>1. Grammar Specification</h2>
    <pre>${grammar.rawText.replace(/</g, '&lt;')}</pre>
    <p><strong>LL(1) Compatibility Status:</strong> 
        <span class="badge ${isLL1 ? 'badge-success' : 'badge-error'}">${isLL1 ? 'STRICTLY LL(1) COMPATIBLE' : 'NON-LL(1) AMBIGUOUS / CONFLICTED'}</span>
    </p>

    <h2>2. Mathematical FIRST &amp; FOLLOW Sets</h2>
    <table>
        <thead>
            <tr>
                <th>Non-Terminal</th>
                <th>FIRST Set</th>
                <th>FOLLOW Set</th>
            </tr>
        </thead>
        <tbody>
            ${(grammar.nonTerminals || []).map(nt => `
                <tr>
                    <td><strong>${nt}</strong></td>
                    <td>{ ${(firstFormatted[nt] || []).join(', ') || '∅'} }</td>
                    <td>{ ${(followFormatted[nt] || []).join(', ') || '∅'} }</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <h2>3. Input String Execution</h2>
    <p><strong>Tested Input:</strong> <code>${(inputString || '').replace(/</g, '&lt;')}</code></p>
    <p><strong>Total Execution Micro-Steps:</strong> ${steps ? steps.length : 0}</p>

    <h2>4. Execution Trace (First 25 Steps)</h2>
    <table>
        <thead>
            <tr>
                <th>Step</th>
                <th>Stack</th>
                <th>Remaining Input</th>
                <th>Production</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
            ${(steps || []).slice(0, 25).map((s, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td><code>${(s.stackSymbols || []).join(' ')}</code></td>
                    <td><code>${(s.inputTokens && s.pointer !== undefined) ? s.inputTokens.slice(s.pointer).join(' ') : ''}</code></td>
                    <td><code>${s.production || '—'}</code></td>
                    <td>${s.actionType || ''}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
    }

    static exportReportPDF(grammar, tableGen, firstCalc, followCalc, steps, inputString) {
        if (typeof window === 'undefined') return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = this.generateReportHTML(grammar, tableGen, firstCalc, followCalc, steps, inputString);
        printWindow.document.write(html);
        printWindow.document.close();
    }
}

// Export for Node.js test environment or browser global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataExporter;
} else if (typeof window !== 'undefined') {
    window.DataExporter = DataExporter;
}
