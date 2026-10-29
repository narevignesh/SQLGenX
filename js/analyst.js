/**
 * SQLGenX Data Analyst Agent & Chart.js Engine
 * Derives statistical insights and renders dynamic visualizations.
 */

export class AnalystAgent {
  static analyze({ question, columns, rows, executionTimeMs }) {
    if (!rows || rows.length === 0) {
      return {
        hasData: false,
        summary: 'Query executed successfully with 0 matching rows.',
        insights: [
          'No records satisfied the active query filter conditions.',
          'Try broadening your criteria or selecting another dimension.'
        ],
        chartConfig: null
      };
    }

    // Detect numeric vs categorical columns
    const measureCols = [];
    const dimensionCols = [];

    const sampleRow = rows[0];
    columns.forEach(col => {
      const val = sampleRow[col];
      if (typeof val === 'number') {
        measureCols.push(col);
      } else if (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') {
        measureCols.push(col);
      } else {
        dimensionCols.push(col);
      }
    });

    const primaryMeasure = measureCols[measureCols.length - 1] || null;
    const primaryDimension = dimensionCols[0] || (columns.length > 1 ? columns[0] : null);

    const stats = {};
    if (primaryMeasure) {
      let sum = 0;
      let min = Infinity;
      let max = -Infinity;
      let maxRow = null;

      rows.forEach(r => {
        const num = parseFloat(r[primaryMeasure]) || 0;
        sum += num;
        if (num > max) {
          max = num;
          maxRow = r;
        }
        if (num < min) min = num;
      });

      stats.primaryMeasure = primaryMeasure;
      stats.total = parseFloat(sum.toFixed(2));
      stats.avg = parseFloat((sum / rows.length).toFixed(2));
      stats.max = max;
      stats.min = min;
      stats.maxLabel = primaryDimension && maxRow ? maxRow[primaryDimension] : 'N/A';
    }

    const insights = [];
    insights.push(`Executed in **${executionTimeMs} ms**, returning **${rows.length} rows**.`);

    if (primaryMeasure && stats.total !== undefined) {
      const isMonetary = /revenue|amount|spent|spending|price|cost|salary|budget/i.test(primaryMeasure) &&
                         !/mark|score|count|grade|gpa|cgpa|percent|rate|age|year|month|day|id|quantity|units/i.test(primaryMeasure);
      const fmt = (v) => isMonetary ? `₹${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : Number(v).toLocaleString();

      insights.push(`Total **${primaryMeasure.replace(/_/g, ' ')}**: **${fmt(stats.total)}** across all rows (average: **${fmt(stats.avg)}**).`);

      if (stats.maxLabel !== 'N/A') {
        const pct = stats.total > 0 ? ((stats.max / stats.total) * 100).toFixed(1) : 0;
        insights.push(`Top Performer: **"${stats.maxLabel}"** accounts for **${fmt(stats.max)}** (${pct}% of aggregate).`);
      }
    }

    if (rows.length > 1 && primaryDimension) {
      insights.push(`Spread encompasses **${rows.length} discrete entities** in dimension **"${primaryDimension}"**.`);
    }

    const chartConfig = AnalystAgent._buildChartConfig({
      question,
      columns,
      rows,
      primaryDimension,
      primaryMeasure
    });

    return {
      hasData: true,
      stats,
      insights,
      chartConfig
    };
  }

  static _buildChartConfig({ question, rows, primaryDimension, primaryMeasure }) {
    if (!primaryMeasure || rows.length === 0) return null;

    const chartRows = rows.slice(0, 15);
    const labels = chartRows.map(r => String(r[primaryDimension] || `Row #${chartRows.indexOf(r) + 1}`));
    const data = chartRows.map(r => parseFloat(r[primaryMeasure]) || 0);

    const q = (question || '').toLowerCase();
    const dim = (primaryDimension || '').toLowerCase();

    const isTemporal = dim.includes('date') || dim.includes('month') || dim.includes('year') || q.includes('monthly') || q.includes('trend');

    let chartType = 'bar';
    if (isTemporal) {
      chartType = 'line';
    } else if (chartRows.length <= 6 && (q.includes('share') || q.includes('breakdown') || q.includes('tier') || q.includes('status'))) {
      chartType = 'doughnut';
    }

    const isMonetary = /revenue|amount|spent|spending|price|cost|salary|budget/i.test(primaryMeasure) &&
                       !/mark|score|count|grade|gpa|cgpa|percent|rate|age|year|month|day|id|quantity|units/i.test(primaryMeasure);

    const modernPalette = [
      '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', 
      '#EC4899', '#06B6D4', '#F97316', '#6366F1'
    ];

    const bgColors = modernPalette.map(c => c + 'CC');

    return {
      type: chartType,
      title: `${primaryMeasure.replace(/_/g, ' ').toUpperCase()} by ${primaryDimension ? primaryDimension.replace(/_/g, ' ').toUpperCase() : 'Dimension'}`,
      labels,
      data,
      measureName: primaryMeasure.replace(/_/g, ' '),
      isMonetary,
      backgroundColor: chartType === 'doughnut' ? bgColors.slice(0, labels.length) : 'rgba(59, 130, 246, 0.75)',
      borderColor: chartType === 'doughnut' ? modernPalette.slice(0, labels.length) : '#3B82F6'
    };
  }
}
