import re
import logging
from typing import Dict, Any, List

try:
    import sqlparse
except ImportError:
    sqlparse = None

from app.database.introspection import SchemaInspector
from app.ml.risk_model import risk_classifier

logger = logging.getLogger(__name__)

class SQLValidationAgent:
    """Agent 3: Validates SQL syntax, schema references, aggregations, and query risk."""
    
    @staticmethod
    def validate(sql: str) -> Dict[str, Any]:
        errors = []
        warnings = []
        
        # 1. Check empty
        if not sql or not sql.strip():
            return {
                "valid": False,
                "errors": ["SQL query is empty."],
                "warnings": [],
                "risk": {"level": "HIGH", "reasons": ["Empty query string."]}
            }
            
        clean_sql = sql.strip().rstrip(";")
        
        # 2. Syntax Parsing
        if sqlparse is not None:
            try:
                parsed = sqlparse.parse(clean_sql)
                if not parsed:
                    errors.append("Failed to parse SQL syntax.")
            except Exception as e:
                errors.append(f"SQL Syntax Error: {str(e)}")
        else:
            # Fallback syntax check
            if not re.search(r"^\s*(SELECT|WITH|EXPLAIN|SHOW|DESCRIBE)\b", clean_sql, re.IGNORECASE):
                errors.append("Invalid SQL syntax: Query must start with SELECT or WITH.")
            if not re.search(r"\bFROM\b", clean_sql, re.IGNORECASE) and not re.search(r"^\s*SELECT\s+1", clean_sql, re.IGNORECASE):
                errors.append("Invalid SQL syntax: Missing FROM clause.")

        # 3. Read-Only Safety Validation
        destructive_match = re.search(r"\b(DROP|DELETE|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|UPDATE|INSERT)\b", clean_sql, re.IGNORECASE)
        if destructive_match:
            errors.append(f"Safety Violation: Destructive operation '{destructive_match.group(0).upper()}' is blocked in read-only mode.")

        # 4. Schema Cross-Referencing
        full_schema = SchemaInspector.get_full_schema()
        known_tables = {t["name"].lower(): [c["name"].lower() for c in t["columns"]] for t in full_schema["tables"]}
        
        # Extract referenced tables
        table_tokens = re.findall(r"\b(?:FROM|JOIN)\s+([a-zA-Z0-9_]+)", clean_sql, re.IGNORECASE)
        for t in table_tokens:
            t_clean = t.strip().lower()
            if t_clean not in known_tables and t_clean not in ["where", "select", "as", "on", "using", "limit", "group", "order"]:
                errors.append(f"Table '{t}' does not exist in active database schema.")

        # 5. Check Aggregations & Missing GROUP BY
        has_agg = bool(re.search(r"\b(SUM|AVG|COUNT|MIN|MAX)\s*\(", clean_sql, re.IGNORECASE))
        has_group = bool(re.search(r"\bGROUP\s+BY\b", clean_sql, re.IGNORECASE))
        select_clause = re.search(r"SELECT\s+(.*?)\s+FROM", clean_sql, re.IGNORECASE | re.DOTALL)
        
        if has_agg and not has_group and select_clause:
            selected_items = select_clause.group(1).split(",")
            non_agg_items = [item.strip() for item in selected_items if not re.search(r"\b(SUM|AVG|COUNT|MIN|MAX)\s*\(", item, re.IGNORECASE) and item.strip() != "*"]
            if len(non_agg_items) > 0:
                warnings.append(f"Query contains aggregated and non-aggregated columns ({', '.join(non_agg_items[:2])}) without a GROUP BY clause.")

        # 6. Check for Wildcard in large tables
        if re.search(r"SELECT\s+\*\s+FROM\s+(orders|order_items|customers)", clean_sql, re.IGNORECASE) and not re.search(r"\bLIMIT\b", clean_sql, re.IGNORECASE):
            warnings.append("SELECT * without LIMIT may cause performance degradation.")

        # 7. Run Machine Learning SQL Risk Classifier
        risk_result = risk_classifier.predict_risk(clean_sql)
        
        is_valid = len(errors) == 0
        
        return {
            "valid": is_valid,
            "errors": errors,
            "warnings": warnings,
            "risk": risk_result,
            "ast_valid": len(errors) == 0
        }

sql_validator = SQLValidationAgent()
