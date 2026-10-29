/**
 * SQLGenX Main Application Controller (Pure JavaScript SPA)
 * Controls:
 *  - Dual Database Mode (Realtime MySQL + Sample Enterprise DB)
 *  - Entity-Relationship (ER) Diagram & Schema Explorer
 *  - LangChain AI Query Pipeline & Validator
 *  - Dynamic Chart.js Analytics & Export
 */

import { dbEngine } from './database.js';
import { SqlValidator } from './validator.js';
import { LangChainAgent } from './langchain-llm.js';
import { AnalystAgent } from './analyst.js';
import { ERVisualizer } from './er-visualizer.js';

class SQLGenXApp {
  constructor() {
    this.erVisualizer = null;
    this.currentChart = null;
    this.currentResults = null;
    this.history = JSON.parse(localStorage.getItem('sqlgenx_history') || '[]');
  }

  async init() {
    console.log('SQLGenX: Booting application...');
    this.setupEventListeners();
    this.setupNavigation();
    this.loadSampleChips();
    this.renderHistory();

    try {
      this.setAgentStatus('Initializing in-browser Sample Enterprise Database (SQLite WASM)...');
      await dbEngine.init();
      this.updateDbStatusBadge();
      
      // Initialize ER Visualizer
      this.erVisualizer = new ERVisualizer('er-diagram-canvas', 'tabular-schema-container');
      this.refreshSchemaViews();

      this.setAgentStatus('Ready! Ask any question or connect your live MySQL database.');

      // Automatically execute initial query to populate view with real data matching reference screenshot
      const input = document.getElementById('nl-query-input');
      if (input && !input.value) {
        input.value = 'Show the top 5 customers by total spending';
        await this.handleRunQuery();
      }
    } catch (err) {
      console.error('Failed to init DB:', err);
      this.setAgentStatus('Error initializing database engine: ' + err.message);
    }
  }

  setupEventListeners() {
    // Generate & Run Button
    document.getElementById('btn-run-query')?.addEventListener('click', () => this.handleRunQuery());

    // Enter key in input
    document.getElementById('nl-query-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleRunQuery();
      }
    });

    // Manual SQL Run
    document.getElementById('btn-run-sql')?.addEventListener('click', () => this.handleManualSqlRun());

    // Copy SQL
    document.getElementById('btn-copy-sql')?.addEventListener('click', () => {
      const sqlText = document.getElementById('sql-editor-input')?.value;
      if (sqlText) {
        navigator.clipboard.writeText(sqlText);
        this.showToast('SQL copied to clipboard!', 'success');
      }
    });

    // Download SQL Button
    document.getElementById('btn-download-sql')?.addEventListener('click', () => {
      const sql = document.getElementById('sql-editor-input')?.value;
      if (!sql) return;
      const blob = new Blob([sql], { type: 'text/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sqlgenx_query_${Date.now()}.sql`;
      a.click();
      this.showToast('SQL file downloaded!', 'success');
    });

    // Download Chart Button
    document.getElementById('btn-download-chart')?.addEventListener('click', () => {
      const canvas = document.getElementById('analytics-chart');
      if (!canvas) return;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `sqlgenx_chart_${Date.now()}.png`;
      a.click();
      this.showToast('Chart image downloaded!', 'success');
    });

    // Expand Chart Button
    document.getElementById('btn-expand-chart')?.addEventListener('click', () => {
      const container = document.getElementById('chart-container');
      if (container) {
        if (!document.fullscreenElement) {
          container.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      }
    });

    // Theme Toggle Button
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
      this.showToast('Dark enterprise theme is active by default.', 'info');
    });

    // Database Mode Switcher Toggle
    document.getElementById('btn-use-sample-db')?.addEventListener('click', async () => {
      await dbEngine.disconnectMySQL();
      this.updateDbStatusBadge();
      this.loadSampleChips();
      this.refreshSchemaViews();
      this.showToast('Switched to in-browser Sample Enterprise Database.', 'info');
    });

    // MySQL Connection Modal Buttons
    document.getElementById('btn-test-mysql')?.addEventListener('click', () => this.handleTestMySQL());
    document.getElementById('btn-connect-mysql')?.addEventListener('click', () => this.handleConnectMySQL());
    document.getElementById('btn-disconnect-mysql')?.addEventListener('click', async () => {
      await dbEngine.disconnectMySQL();
      this.updateDbStatusBadge();
      this.loadSampleChips();
      this.refreshSchemaViews();
      this.showToast('Disconnected from MySQL.', 'warning');
    });

    // Chart Type Selector
    document.getElementById('chart-type-select')?.addEventListener('change', (e) => {
      if (this.currentResults && this.currentResults.analysis) {
        this.renderChart(this.currentResults.analysis.chartConfig, e.target.value);
      }
    });

    // Export Buttons
    document.getElementById('btn-export-csv')?.addEventListener('click', () => this.exportCSV());
    document.getElementById('btn-export-json')?.addEventListener('click', () => this.exportJSON());
    document.getElementById('btn-print-report')?.addEventListener('click', () => window.print());

    // Mobile Sidebar Drawer Toggle
    const sidebarToggleBtn = document.getElementById('btn-sidebar-toggle');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const sidebar = document.querySelector('.left-sidebar');

    const closeSidebar = () => {
      sidebar?.classList.remove('sidebar-open');
      sidebarBackdrop?.classList.remove('active');
    };

    sidebarToggleBtn?.addEventListener('click', () => {
      sidebar?.classList.toggle('sidebar-open');
      sidebarBackdrop?.classList.toggle('active');
    });

    sidebarBackdrop?.addEventListener('click', closeSidebar);
    this._closeSidebar = closeSidebar;

    // Search table filter
    document.getElementById('table-search-input')?.addEventListener('input', (e) => {
      this.filterTable(e.target.value);
    });

    // Synchronize SQL line numbers on input
    document.getElementById('sql-editor-input')?.addEventListener('input', (e) => {
      this.updateLineNumbers(e.target.value);
    });

    // Save AI Settings
    document.getElementById('btn-save-settings')?.addEventListener('click', () => this.saveSettings());
    this.populateSettingsModal();
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar-item[data-tab]');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTabId = item.getAttribute('data-tab');
        const action = item.getAttribute('data-action');

        // Automatically close mobile sidebar when an item is selected
        if (this._closeSidebar) {
          this._closeSidebar();
        }

        // Update active sidebar item
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Switch active tab pane
        document.querySelectorAll('.tab-pane').forEach(tp => {
          tp.classList.remove('show', 'active');
        });
        const targetPane = document.getElementById(targetTabId);
        if (targetPane) {
          targetPane.classList.add('show', 'active');
        }

        // Trigger redraw if switching to schema tab
        if (targetTabId === 'tab-schema') {
          setTimeout(() => {
            if (this.erVisualizer) {
              this.erVisualizer.resizeCanvas();
              this.erVisualizer.computeNodeLayout();
              this.erVisualizer.draw();
            }
          }, 50);
        }

        // Trigger history render if switching to history
        if (targetTabId === 'tab-history') {
          this.renderHistory();
        }
      });
    });

    // View Full ER Diagram button in Overview Card
    document.getElementById('btn-view-full-er')?.addEventListener('click', () => {
      const schemaNav = document.getElementById('nav-btn-schema');
      if (schemaNav) {
        schemaNav.click();
      } else {
        document.querySelectorAll('.tab-pane').forEach(tp => tp.classList.remove('show', 'active'));
        document.getElementById('tab-schema')?.classList.add('show', 'active');
        if (this.erVisualizer) {
          this.erVisualizer.resizeCanvas();
          this.erVisualizer.draw();
        }
      }
    });
  }

  updateLineNumbers(sql) {
    const lineContainer = document.getElementById('sql-line-numbers');
    if (!lineContainer) return;
    const count = Math.max(sql ? sql.split('\n').length : 1, 9);
    let html = '';
    for (let i = 1; i <= count; i++) {
      html += `${i}<br>`;
    }
    lineContainer.innerHTML = html;
  }

  updateDbStatusBadge() {
    const mode = dbEngine.getMode();
    const dot = document.getElementById('db-status-dot');
    const text = document.getElementById('db-status-text');
    const badge = document.getElementById('active-db-badge');
    const selectorTitle = document.getElementById('db-selector-title');
    const sidebarTitle = document.getElementById('sidebar-db-title');
    const sidebarSubtitle = document.getElementById('sidebar-db-subtitle');
    const sidebarStatus = document.getElementById('sidebar-status-label');

    if (mode === 'mysql' && dbEngine.mysqlConfig) {
      if (dot) dot.className = 'pulse-indicator bg-emerald-500';
      if (text) text.innerHTML = `<span class="text-success-green font-semibold">MySQL Live</span>`;
      if (badge) badge.innerHTML = `<i class="bi bi-hdd-network-fill text-emerald-400 me-1"></i> MySQL Live: ${dbEngine.mysqlConfig.database} (${dbEngine.mysqlConfig.host})`;
      if (selectorTitle) selectorTitle.textContent = `MySQL: ${dbEngine.mysqlConfig.database}`;
      if (sidebarTitle) sidebarTitle.textContent = dbEngine.mysqlConfig.database;
      if (sidebarSubtitle) sidebarSubtitle.textContent = `Live MySQL (${dbEngine.mysqlConfig.host})`;
      if (sidebarStatus) sidebarStatus.textContent = 'MySQL Connected';
    } else {
      if (dot) dot.className = 'pulse-indicator bg-cyan-400';
      if (text) text.innerHTML = `<span class="text-cyan font-semibold">Ready</span>`;
      if (badge) badge.innerHTML = `<i class="bi bi-box-fill text-cyan me-1"></i> Sample Enterprise DB (SQLite WASM)`;
      if (selectorTitle) selectorTitle.textContent = 'Sample Enterprise DB (1,900+ rows)';
      if (sidebarTitle) sidebarTitle.textContent = 'Sample Enterprise DB';
      if (sidebarSubtitle) sidebarSubtitle.textContent = '1,900+ rows';
      if (sidebarStatus) sidebarStatus.textContent = 'Sample DB Ready';
    }
  }

  refreshSchemaViews() {
    const schema = dbEngine.getSchema();
    const rels = dbEngine.getRelationships();
    if (this.erVisualizer) {
      this.erVisualizer.render(schema, rels);
    }
  }

  loadSampleChips() {
    const container = document.getElementById('sample-chips-container');
    if (!container) return;

    const isMySQL = dbEngine.getMode() === 'mysql';
    let sampleChips = [];

    if (isMySQL && dbEngine.mysqlSchema && dbEngine.mysqlSchema.tables.length > 0) {
      const firstTable = dbEngine.mysqlSchema.tables[0].table;
      sampleChips = [
        { text: `SELECT * FROM ${firstTable} LIMIT 10`, icon: 'bi-table text-cyan', query: `SELECT * FROM \`${firstTable}\` LIMIT 10` },
        { text: `COUNT records in ${firstTable}`, icon: 'bi-calculator text-purple', query: `COUNT total records in \`${firstTable}\`` },
        { text: `Top rows in ${firstTable}`, icon: 'bi-bar-chart text-blue', query: `Show top rows from \`${firstTable}\`` }
      ];
    } else {
      sampleChips = [
        { text: 'Top 5 Customers by Spending', icon: 'bi-people-fill text-cyan', query: 'Show the top 5 customers by total spending' },
        { text: 'Highest Revenue City', icon: 'bi-geo-alt-fill text-purple', query: 'Which city generated the highest total revenue?' },
        { text: 'Monthly Revenue 2026', icon: 'bi-calendar-event text-blue', query: 'Show monthly revenue breakdown for 2026' },
        { text: 'Top 10 Products by Sales', icon: 'bi-box-seam text-cyan', query: 'What are the top 10 products by revenue and units sold?' },
        { text: 'Category Revenue Share', icon: 'bi-pie-chart text-purple', query: 'Revenue distribution across product categories' }
      ];
    }

    container.innerHTML = sampleChips.map(c => `
      <div class="sample-chip-card" data-query="${c.query}">
        <i class="bi ${c.icon}"></i>
        <span>${c.text}</span>
      </div>
    `).join('');

    container.querySelectorAll('.sample-chip-card').forEach(card => {
      card.addEventListener('click', () => {
        const input = document.getElementById('nl-query-input');
        if (input) {
          input.value = card.getAttribute('data-query');
          this.handleRunQuery();
        }
      });
    });
  }

  async handleRunQuery() {
    const queryInput = document.getElementById('nl-query-input');
    const question = queryInput?.value.trim();
    if (!question) {
      this.showToast('Please type a natural language question first.', 'warning');
      return;
    }

    const runBtn = document.getElementById('btn-run-query');
    if (runBtn) runBtn.disabled = true;

    try {
      // 1. Schema Context
      this.setAgentStatus('Inspecting schema & foreign key relationships...', 'schema');
      const schemaPrompt = dbEngine.getPromptSchema();
      await this.sleep(120);

      // 2. LangChain AI SQL Generator
      this.setAgentStatus('Generating dialect-aware SQL with LangChain AI...', 'generation');
      const genResult = await LangChainAgent.generate({
        question,
        schemaPrompt,
        datasetName: dbEngine.getMode() === 'mysql' ? 'mysql_live' : 'sample_enterprise'
      });
      await this.sleep(120);

      // 3. SQL Safety & Guardrail Validator
      this.setAgentStatus('Validating AST syntax & read-only guardrail...', 'validation');
      const tables = dbEngine.getSchema().tables.map(t => t.table);
      const valResult = SqlValidator.validate(genResult.sql, tables);
      await this.sleep(120);

      if (!valResult.isValid) {
        this.renderSqlEditor(genResult.sql);
        this.renderRiskBadge(valResult.riskLevel, valResult.riskScore, valResult.explanation);
        this.showToast(`Validation Blocked: ${valResult.error}`, 'danger');
        if (runBtn) runBtn.disabled = false;
        return;
      }

      // 4. Query Execution (dispatches to Live MySQL or SQLite WASM)
      this.setAgentStatus(`Executing on ${dbEngine.getMode() === 'mysql' ? 'Live MySQL Database' : 'SQLite WASM Sandbox'}...`, 'execution');
      const execResult = await dbEngine.execute(genResult.sql);
      await this.sleep(120);

      // 5. Data Analyst & Visualizer
      this.setAgentStatus('Deriving grounded business insights & building chart...', 'analysis');
      const analysis = AnalystAgent.analyze({
        question,
        columns: execResult.columns,
        rows: execResult.rows,
        executionTimeMs: execResult.executionTimeMs
      });
      await this.sleep(120);

      this.clearAgentStatus();

      this.currentResults = {
        question,
        sql: genResult.sql,
        generation: genResult,
        validation: valResult,
        execution: execResult,
        analysis
      };

      this.renderOutputs(this.currentResults);
      this.addToHistory(this.currentResults);

    } catch (err) {
      console.error('Pipeline error:', err);
      this.showToast('Execution error: ' + err.message, 'danger');
    } finally {
      if (runBtn) runBtn.disabled = false;
    }
  }

  async handleManualSqlRun() {
    const sqlInput = document.getElementById('sql-editor-input');
    const sql = sqlInput?.value.trim();
    if (!sql) return;

    const tables = dbEngine.getSchema().tables.map(t => t.table);
    const valResult = SqlValidator.validate(sql, tables);

    if (!valResult.isValid) {
      this.renderRiskBadge(valResult.riskLevel, valResult.riskScore, valResult.explanation);
      this.showToast(`Blocked: ${valResult.error}`, 'danger');
      return;
    }

    const execResult = await dbEngine.execute(sql);
    const analysis = AnalystAgent.analyze({
      question: 'Manual Query Execution',
      columns: execResult.columns,
      rows: execResult.rows,
      executionTimeMs: execResult.executionTimeMs
    });

    this.currentResults = {
      question: 'Manual Editor Query',
      sql,
      generation: { generator: 'manual_editor', confidence: 1.0, explanationSteps: ['Manually edited by analyst.'] },
      validation: valResult,
      execution: execResult,
      analysis
    };

    this.renderOutputs(this.currentResults);
    this.addToHistory(this.currentResults);
    this.showToast('SQL executed successfully!', 'success');
  }

  renderOutputs(data) {
    this.renderSqlEditor(data.sql);
    this.renderRiskBadge(data.validation.riskLevel, data.validation.riskScore, data.validation.explanation);
    this.renderInsights(data.generation.explanationSteps, data.analysis.insights);

    const metricsEl = document.getElementById('query-metrics-pill');
    if (metricsEl) {
      metricsEl.innerHTML = `
        <span class="badge bg-slate-900 text-slate-300 border border-slate-800 me-2"><i class="bi bi-clock me-1 text-cyan-400"></i> ${data.execution.executionTimeMs} ms</span>
        <span class="badge bg-slate-900 text-slate-300 border border-slate-800 me-2"><i class="bi bi-table me-1 text-emerald-400"></i> ${data.execution.rowCount} rows</span>
        <span class="badge bg-blue-950 text-blue-300 border border-blue-800"><i class="bi bi-cpu me-1"></i> ${data.generation.provider || 'Groq LLaMA'}</span>
      `;
    }

    this.renderTable(data.execution.columns, data.execution.rows);
    this.renderChart(data.analysis.chartConfig);
  }

  renderSqlEditor(sql) {
    const editor = document.getElementById('sql-editor-input');
    if (editor) editor.value = sql;
    this.updateLineNumbers(sql);
  }

  renderRiskBadge(level, score, explanation) {
    const badge = document.getElementById('risk-badge');
    const desc = document.getElementById('risk-explanation');
    if (badge) {
      let colorClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      if (level === 'MEDIUM') colorClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
      if (level === 'HIGH') colorClass = 'bg-red-500/20 text-red-400 border border-red-500/40';

      badge.className = `badge px-2 py-1 ${colorClass}`;
      badge.innerHTML = `<i class="bi bi-shield-check me-1"></i> ${level} RISK (${score})`;
    }
    if (desc) {
      desc.textContent = explanation || '';
    }
  }

  renderInsights(steps = [], insights = []) {
    const stepsList = document.getElementById('reasoning-steps-list');
    if (stepsList) {
      stepsList.innerHTML = steps.map(s => `<li><i class="bi bi-check2 text-cyan me-1"></i>${s}</li>`).join('');
    }

    const insightsList = document.getElementById('business-insights-list');
    if (insightsList) {
      insightsList.innerHTML = insights.map(i => {
        const formatted = i.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return `<li><i class="bi bi-lightbulb-fill text-warning me-1"></i>${formatted}</li>`;
      }).join('');
    }
  }

  renderTable(columns, rows) {
    const thead = document.getElementById('results-table-head');
    const tbody = document.getElementById('results-table-body');
    const countText = document.getElementById('results-count-text');

    if (countText) {
      countText.textContent = `(${rows ? rows.length : 0} records)`;
    }

    if (!thead || !tbody) return;

    if (!rows || rows.length === 0) {
      thead.innerHTML = '';
      tbody.innerHTML = `<tr><td class="text-center text-muted py-4">No records to display.</td></tr>`;
      return;
    }

    thead.innerHTML = `
      <tr>
        <th class="ps-3" style="width: 48px;">#</th>
        ${columns.map(col => `<th class="cursor-pointer" onclick="window.app.sortTable('${col}')">${col} <i class="bi bi-arrow-down-up text-muted ms-1"></i></th>`).join('')}
      </tr>
    `;

    tbody.innerHTML = rows.map((r, idx) => `
      <tr>
        <td class="text-muted font-mono text-xs ps-3">${idx + 1}</td>
        ${columns.map(col => {
          const val = r[col];
          const isNull = val === null || val === undefined;
          const isNum = typeof val === 'number';
          const isCurrency = isNum && 
            /spending|revenue|price|cost|salary|budget|fee|total_amount|total_spending/i.test(col) &&
            !/mark|score|count|grade|gpa|cgpa|percent|rate|age|year|month|day|id|quantity|units|num/i.test(col);

          if (isNull) {
            return `<td class="text-muted font-mono text-xs fst-italic">NULL</td>`;
          }
          if (isCurrency) {
            return `<td class="table-metric-highlight font-mono text-sm fw-bold">₹${Number(val).toLocaleString()}</td>`;
          }
          if (isNum) {
            return `<td class="text-white font-mono text-sm fw-bold">${Number(val).toLocaleString()}</td>`;
          }
          return `<td class="text-white font-mono text-sm">${val}</td>`;
        }).join('')}
      </tr>
    `).join('');
  }

  filterTable(query) {
    if (!this.currentResults) return;
    const q = query.toLowerCase().trim();
    const rows = this.currentResults.execution.rows;
    const cols = this.currentResults.execution.columns;

    const filtered = !q ? rows : rows.filter(r => {
      return cols.some(c => String(r[c] || '').toLowerCase().includes(q));
    });

    this.renderTable(cols, filtered);
  }

  sortTable(col) {
    if (!this.currentResults) return;
    const rows = [...this.currentResults.execution.rows];
    const isAsc = this._lastSortCol === col ? !this._lastSortAsc : true;
    this._lastSortCol = col;
    this._lastSortAsc = isAsc;

    rows.sort((a, b) => {
      const vA = a[col];
      const vB = b[col];
      if (typeof vA === 'number' && typeof vB === 'number') {
        return isAsc ? vA - vB : vB - vA;
      }
      return isAsc ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
    });

    this.renderTable(this.currentResults.execution.columns, rows);
  }

  renderChart(chartConfig, overrideType = null) {
    const canvas = document.getElementById('analytics-chart');
    if (!canvas) return;

    if (this.currentChart) {
      this.currentChart.destroy();
      this.currentChart = null;
    }

    if (!chartConfig || !chartConfig.data || chartConfig.data.length === 0) {
      const container = document.getElementById('chart-container');
      if (container) container.classList.add('d-none');
      return;
    }

    const container = document.getElementById('chart-container');
    if (container) container.classList.remove('d-none');

    const type = overrideType || chartConfig.type || 'bar';
    const ctx = canvas.getContext('2d');

    const isMonetary = chartConfig.isMonetary !== undefined 
      ? chartConfig.isMonetary 
      : (/revenue|amount|spent|spending|price|cost|salary|budget/i.test(chartConfig.measureName || '') &&
         !/mark|score|count|grade|gpa|cgpa|percent|rate|age|year|month|day|id|quantity|units/i.test(chartConfig.measureName || ''));

    const measureTitle = (chartConfig.measureName || 'Value').replace(/_/g, ' ');
    const yAxisLabel = isMonetary ? `${measureTitle} (₹)` : measureTitle;

    // Generate vibrant gradients matching the reference screenshot
    let backgroundColors = chartConfig.backgroundColor;
    let borderColors = chartConfig.borderColor;

    if (type === 'bar' && chartConfig.labels.length > 0) {
      backgroundColors = chartConfig.labels.map((_, idx) => {
        const grad = ctx.createLinearGradient(0, 0, 0, 240);
        if (idx === 0) { grad.addColorStop(0, '#00D9FF'); grad.addColorStop(1, '#1677FF'); }
        else if (idx === 1) { grad.addColorStop(0, '#1677FF'); grad.addColorStop(1, '#2563EB'); }
        else if (idx === 2) { grad.addColorStop(0, '#2563EB'); grad.addColorStop(1, '#4F46E5'); }
        else if (idx === 3) { grad.addColorStop(0, '#4F46E5'); grad.addColorStop(1, '#8758FF'); }
        else { grad.addColorStop(0, '#8758FF'); grad.addColorStop(1, '#A855F7'); }
        return grad;
      });
      borderColors = 'transparent';
    }

    // Top value labels plugin (renders ₹42,580 or 75.78 directly above bars)
    const topValueLabelsPlugin = {
      id: 'topValueLabels',
      afterDatasetsDraw(chart) {
        if (chart.config.type !== 'bar') return;
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((bar, index) => {
            const val = dataset.data[index];
            if (val === undefined || val === null) return;
            const formatted = isMonetary ? `₹${Number(val).toLocaleString()}` : `${Number(val).toLocaleString()}`;
            ctx.save();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(formatted, bar.x, Math.max(bar.y - 6, 12));
            ctx.restore();
          });
        });
      }
    };

    this.currentChart = new window.Chart(ctx, {
      type: type,
      data: {
        labels: chartConfig.labels,
        datasets: [{
          label: yAxisLabel,
          data: chartConfig.data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: type === 'bar' ? 0 : 1.5,
          borderRadius: type === 'bar' ? 6 : 0
        }]
      },
      plugins: [topValueLabelsPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 16 }
        },
        plugins: {
          title: {
            display: true,
            text: chartConfig.title || 'Data Visualization',
            color: '#FFFFFF',
            font: { family: 'Outfit', size: 13, weight: '700' },
            padding: { top: 4, bottom: 12 }
          },
          legend: {
            display: type === 'doughnut' || type === 'pie',
            labels: { color: '#94A3B8', font: { family: 'Outfit', size: 12 } }
          },
          tooltip: {
            backgroundColor: '#071126',
            titleColor: '#FFFFFF',
            bodyColor: '#00D9FF',
            borderColor: '#1E2D4A',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (item) => ` ${item.dataset.label}: ${isMonetary ? '₹' : ''}${Number(item.raw).toLocaleString()}`
            }
          }
        },
        scales: type !== 'doughnut' && type !== 'pie' ? {
          x: {
            ticks: { color: '#CBD5E1', font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' } },
            grid: { display: false }
          },
          y: {
            ticks: {
              color: '#94A3B8',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (v) => isMonetary ? `₹${Number(v).toLocaleString()}` : Number(v).toLocaleString()
            },
            title: {
              display: true,
              text: yAxisLabel,
              color: '#94A3B8',
              font: { family: 'Outfit', size: 11, weight: '600' }
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          }
        } : {}
      }
    });
  }

  async previewTableData(tableName) {
    const res = await dbEngine.getTableSample(tableName, 10);
    const modalTitle = document.getElementById('tablePreviewModalTitle');
    const thead = document.getElementById('preview-table-head');
    const tbody = document.getElementById('preview-table-body');

    if (modalTitle) modalTitle.textContent = `Table Preview: ${tableName} (${res.rowCount} rows sampled)`;
    if (!thead || !tbody) return;

    if (!res.rows || res.rows.length === 0) {
      thead.innerHTML = '';
      tbody.innerHTML = `<tr><td class="text-center text-slate-500 py-3">No sample records found.</td></tr>`;
    } else {
      thead.innerHTML = `<tr>${res.columns.map(c => `<th class="text-cyan-bright font-mono text-xs fw-bold">${c}</th>`).join('')}</tr>`;
      tbody.innerHTML = res.rows.map(r => `
        <tr>${res.columns.map(c => `<td class="text-pure font-mono text-xs fw-semibold">${r[c] !== null ? r[c] : '<span class=\"text-slate-500\">NULL</span>'}</td>`).join('')}</tr>
      `).join('');
    }

    const modal = new window.bootstrap.Modal(document.getElementById('tablePreviewModal'));
    modal.show();
  }

  async handleTestMySQL() {
    const host = document.getElementById('mysql-host')?.value || 'localhost';
    const port = document.getElementById('mysql-port')?.value || '3306';
    const user = document.getElementById('mysql-user')?.value || 'root';
    const password = document.getElementById('mysql-password')?.value || '';
    const database = document.getElementById('mysql-database')?.value || '';

    const testBtn = document.getElementById('btn-test-mysql');
    if (testBtn) testBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Testing...';

    try {
      const res = await dbEngine.testMySQL({ host, port, user, password, database });
      if (res.success) {
        this.showToast(res.message, 'success');
      } else {
        this.showToast(`Connection failed: ${res.error}`, 'danger');
      }
    } catch (e) {
      this.showToast('Test failed: ' + e.message, 'danger');
    } finally {
      if (testBtn) testBtn.innerHTML = '<i class="bi bi-broadcast me-1"></i> Test Connection';
    }
  }

  async handleConnectMySQL() {
    const host = document.getElementById('mysql-host')?.value || 'localhost';
    const port = document.getElementById('mysql-port')?.value || '3306';
    const user = document.getElementById('mysql-user')?.value || 'root';
    const password = document.getElementById('mysql-password')?.value || '';
    const database = document.getElementById('mysql-database')?.value || '';

    if (!database) {
      this.showToast('Database name is required.', 'warning');
      return;
    }

    const connBtn = document.getElementById('btn-connect-mysql');
    if (connBtn) connBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Connecting...';

    try {
      const res = await dbEngine.connectMySQL({ host, port, user, password, database });
      if (res.success) {
        this.updateDbStatusBadge();
        this.loadSampleChips();
        this.refreshSchemaViews();
        this.showToast(`Connected to MySQL: ${database}!`, 'success');
        
        // Close modal
        const modalEl = document.getElementById('mysqlConnectModal');
        const modal = window.bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      } else {
        this.showToast(`MySQL Error: ${res.error}`, 'danger');
      }
    } catch (e) {
      this.showToast('Connection error: ' + e.message, 'danger');
    } finally {
      if (connBtn) connBtn.innerHTML = '<i class="bi bi-plug-fill me-1"></i> Connect';
    }
  }

  setAgentStatus(msg, stage = '') {
    const statusEl = document.getElementById('agent-live-status');
    if (statusEl) {
      statusEl.innerHTML = `<span class="spinner-grow spinner-grow-sm text-cyan-400 me-2" role="status"></span> ${msg}`;
    }

    const stages = ['schema', 'generation', 'validation', 'execution', 'analysis'];
    stages.forEach(s => {
      const pill = document.getElementById(`step-pill-${s}`);
      if (pill) {
        if (s === stage) pill.className = 'agent-pill active';
        else if (stages.indexOf(s) < stages.indexOf(stage)) pill.className = 'agent-pill completed';
        else pill.className = 'agent-pill pending';
      }
    });
  }

  clearAgentStatus() {
    const statusEl = document.getElementById('agent-live-status');
    if (statusEl) {
      statusEl.innerHTML = `<i class="bi bi-check-circle-fill text-emerald-400 me-2"></i> Query pipeline executed successfully.`;
    }
    const stages = ['schema', 'generation', 'validation', 'execution', 'analysis'];
    stages.forEach(s => {
      const pill = document.getElementById(`step-pill-${s}`);
      if (pill) pill.className = 'agent-pill completed';
    });
  }

  addToHistory(entry) {
    const item = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      question: entry.question,
      sql: entry.sql,
      rows: entry.execution.rowCount,
      ms: entry.execution.executionTimeMs,
      db: dbEngine.getMode() === 'mysql' ? `MySQL (${dbEngine.mysqlConfig?.database})` : 'Sample Enterprise DB'
    };

    this.history.unshift(item);
    if (this.history.length > 50) this.history.pop();
    localStorage.setItem('sqlgenx_history', JSON.stringify(this.history));
    this.renderHistory();
  }

  renderHistory() {
    const container = document.getElementById('history-items-container');
    if (!container) return;

    if (this.history.length === 0) {
      container.innerHTML = `<div class="text-center text-slate-500 py-4">No query history yet.</div>`;
      return;
    }

    container.innerHTML = this.history.map(h => `
      <div class="card p-3 mb-2 bg-slate-900 border border-slate-800 history-card cursor-pointer" onclick="window.app.loadFromHistory(${h.id})">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="text-white font-semibold text-sm">${h.question}</span>
          <span class="badge bg-slate-800 text-slate-400 text-xs">${h.time}</span>
        </div>
        <pre class="font-mono text-xs text-slate-400 mb-0 text-truncate">${h.sql}</pre>
        <div class="d-flex gap-2 mt-2">
          <span class="badge bg-slate-800 text-slate-400 text-xs">${h.rows} rows</span>
          <span class="badge bg-slate-800 text-slate-400 text-xs">${h.ms} ms</span>
          <span class="badge bg-blue-900/40 text-blue-400 text-xs">${h.db}</span>
        </div>
      </div>
    `).join('');
  }

  loadFromHistory(id) {
    const item = this.history.find(h => h.id === id);
    if (!item) return;

    const input = document.getElementById('nl-query-input');
    if (input) input.value = item.question;

    const tabBtn = document.getElementById('tab-query-btn');
    if (tabBtn) tabBtn.click();

    this.handleRunQuery();
  }

  exportCSV() {
    if (!this.currentResults || !this.currentResults.execution.rows.length) return;
    const { columns, rows } = this.currentResults.execution;

    const header = columns.join(',');
    const body = rows.map(r => columns.map(c => JSON.stringify(r[c] !== null ? r[c] : '')).join(',')).join('\n');
    const csv = `${header}\n${body}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sqlgenx_export_${Date.now()}.csv`;
    a.click();
    this.showToast('Downloaded CSV!', 'success');
  }

  exportJSON() {
    if (!this.currentResults || !this.currentResults.execution.rows.length) return;
    const json = JSON.stringify(this.currentResults.execution.rows, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sqlgenx_export_${Date.now()}.json`;
    a.click();
    this.showToast('Downloaded JSON!', 'success');
  }

  populateSettingsModal() {
    const cfg = LangChainAgent.getStoredConfig();
    const provSelect = document.getElementById('settings-provider-select');
    if (provSelect) provSelect.value = cfg.provider;

    const groqKeyInput = document.getElementById('settings-groq-key');
    if (groqKeyInput) groqKeyInput.value = cfg.groqApiKey;

    const groqModelInput = document.getElementById('settings-groq-model');
    if (groqModelInput) groqModelInput.value = cfg.groqModel;
  }

  saveSettings() {
    const provider = document.getElementById('settings-provider-select')?.value;
    const groqApiKey = document.getElementById('settings-groq-key')?.value;
    const groqModel = document.getElementById('settings-groq-model')?.value;

    LangChainAgent.saveConfig({ provider, groqApiKey, groqModel });
    this.showToast('AI Settings updated!', 'success');
  }

  showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} shadow-lg position-fixed bottom-0 end-0 m-3 z-3 font-outfit`;
    toast.style.minWidth = '280px';
    toast.innerHTML = `<i class="bi bi-info-circle me-2"></i> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new SQLGenXApp();
  window.app.init();
});
