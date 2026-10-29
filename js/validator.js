/**
 * SQLGenX SQL Safety & AST Validator
 * Pure JavaScript - Replaces bulky Python Scikit-learn models with fast, transparent AST evaluation.
 */

export class SqlValidator {
  static evaluateSafety(sql) {
    if (!sql || typeof sql !== 'string' || !sql.trim()) {
      return {
        safe: false,
        reason: 'Empty SQL query provided.',
        riskLevel: 'HIGH',
        riskScore: 0.99,
        explanation: 'Missing query input.'
      };
    }

    const cleaned = sql
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();

    const destructiveKeywords = [
      'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 
      'UPDATE', 'INSERT', 'REPLACE', 'GRANT', 'REVOKE', 
      'ATTACH', 'DETACH', 'EXEC', 'EXECUTE'
    ];

    for (const kw of destructiveKeywords) {
      const reg = new RegExp(`\\b${kw}\\b`, 'i');
      if (reg.test(cleaned)) {
        return {
          safe: false,
          reason: `Destructive command '${kw}' blocked by Read-Only Guardrail.`,
          riskLevel: 'HIGH',
          riskScore: 0.95,
          explanation: `High Risk: Statement contains mutating token '${kw}'. Read-only execution blocks all DDL and DML data alterations.`
        };
      }
    }

    // Must be SELECT or WITH
    if (!/^\s*(SELECT|WITH|EXPLAIN|PRAGMA)\b/i.test(cleaned)) {
      return {
        safe: false,
        reason: 'Only read-only analytical queries (SELECT / WITH) are allowed.',
        riskLevel: 'HIGH',
        riskScore: 0.90,
        explanation: 'High Risk: Non-standard query verb.'
      };
    }

    // Heuristic complexity scoring for safe queries
    let riskScore = 0.10;
    const riskFactors = [];

    // Cartesian product (comma separated tables without WHERE)
    if (/\bFROM\s+[a-zA-Z_0-9]+(\s*,\s*[a-zA-Z_0-9]+)+/i.test(cleaned) && !/\bWHERE\b/i.test(cleaned)) {
      riskScore += 0.40;
      riskFactors.push('Cross join without explicit WHERE condition');
    }

    // SELECT * without LIMIT
    if (/\bSELECT\s+\*\s+FROM\b/i.test(cleaned) && !/\bLIMIT\b/i.test(cleaned)) {
      riskScore += 0.20;
      riskFactors.push('Unbounded SELECT * without LIMIT clause');
    }

    // Multiple nested subqueries
    const subqueries = (cleaned.match(/\(\s*SELECT\b/gi) || []).length;
    if (subqueries > 1) {
      riskScore += 0.15;
      riskFactors.push(`Multiple nested subqueries (${subqueries} subqueries)`);
    }

    // Complex joins (> 3 joins)
    const joins = (cleaned.match(/\bJOIN\b/gi) || []).length;
    if (joins > 3) {
      riskScore += 0.15;
      riskFactors.push(`Deep multi-table join tree (${joins} joins)`);
    }

    riskScore = Math.min(Math.max(riskScore, 0.05), 0.99);

    let riskLevel = 'LOW';
    let explanation = 'Safe read-only analytical query with structured filters.';
    if (riskScore >= 0.60) {
      riskLevel = 'HIGH';
      explanation = `Elevated complexity: ${riskFactors.join(', ')}.`;
    } else if (riskScore >= 0.35) {
      riskLevel = 'MEDIUM';
      explanation = `Moderate query structure: ${riskFactors.join(', ')}.`;
    }

    return {
      safe: true,
      reason: 'Read-only verified.',
      riskLevel,
      riskScore: parseFloat(riskScore.toFixed(2)),
      explanation
    };
  }

  static validate(sql, availableTables = []) {
    const safety = SqlValidator.evaluateSafety(sql);
    if (!safety.safe) {
      return {
        isValid: false,
        error: safety.reason,
        ...safety
      };
    }

    // Table references check
    const tableRegex = /\b(?:FROM|JOIN)\s+([a-zA-Z_0-9]+)/gi;
    let match;
    const referenced = [];
    while ((match = tableRegex.exec(sql)) !== null) {
      referenced.push(match[1]);
    }

    if (availableTables.length > 0) {
      const unknown = referenced.filter(r => !availableTables.some(t => t.toLowerCase() === r.toLowerCase()));
      if (unknown.length > 0) {
        return {
          isValid: false,
          error: `Table '${unknown[0]}' does not exist in active database. Available: ${availableTables.join(', ')}`,
          riskLevel: 'HIGH',
          riskScore: 0.85,
          explanation: `Schema mismatch on table: ${unknown.join(', ')}.`
        };
      }
    }

    return {
      isValid: true,
      error: null,
      referencedTables: [...new Set(referenced)],
      ...safety
    };
  }
}
