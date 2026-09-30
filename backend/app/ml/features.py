import re
from typing import List, Dict, Any
import numpy as np

DESTRUCTIVE_KEYWORDS = ["DROP", "DELETE", "TRUNCATE", "ALTER", "GRANT", "REVOKE", "UPDATE", "INSERT", "REPLACE"]

class SQLFeatureExtractor:
    @staticmethod
    def extract_features(sql: str) -> np.ndarray:
        clean_sql = re.sub(r"--.*", "", sql)
        clean_sql = re.sub(r"/\*.*?\*/", "", clean_sql, flags=re.DOTALL).strip()
        tokens = re.findall(r"\b[A-Za-z_]+\b", clean_sql.upper())
        
        is_select = 1 if tokens and tokens[0] in ["SELECT", "WITH", "EXPLAIN", "SHOW", "DESCRIBE"] else 0
        
        destructive_count = sum(1 for kw in DESTRUCTIVE_KEYWORDS if kw in tokens)
        
        has_where = 1 if "WHERE" in tokens else 0
        
        # JOIN count
        join_count = len(re.findall(r"\bJOIN\b", clean_sql, re.IGNORECASE))
        
        # Subquery count
        subquery_count = len(re.findall(r"\(\s*SELECT\b", clean_sql, re.IGNORECASE))
        
        # Wildcard without limit
        has_wildcard = 1 if re.search(r"SELECT\s+\*", clean_sql, re.IGNORECASE) else 0
        has_limit = 1 if "LIMIT" in tokens or "TOP" in tokens or "FETCH" in tokens else 0
        
        has_group_by = 1 if "GROUP" in tokens and "BY" in tokens else 0
        has_order_by = 1 if "ORDER" in tokens and "BY" in tokens else 0
        
        # Aggregation count
        agg_count = len(re.findall(r"\b(SUM|AVG|COUNT|MIN|MAX|COUNT_DISTINCT)\s*\(", clean_sql, re.IGNORECASE))
        
        # Table count estimate
        from_matches = re.findall(r"\b(?:FROM|JOIN)\s+([a-zA-Z_0-9]+)", clean_sql, re.IGNORECASE)
        table_count = max(1, len(set(from_matches))) if is_select else 1
        
        # Query complexity score
        complexity_score = len(clean_sql) / 100.0 + (join_count * 2) + (subquery_count * 3) + (agg_count * 1.5)
        
        feature_vector = np.array([
            is_select,
            destructive_count,
            has_where,
            join_count,
            subquery_count,
            has_wildcard,
            has_limit,
            has_group_by,
            has_order_by,
            agg_count,
            table_count,
            complexity_score
        ], dtype=np.float32)
        
        return feature_vector

    @staticmethod
    def get_feature_names() -> List[str]:
        return [
            "is_select",
            "destructive_count",
            "has_where",
            "join_count",
            "subquery_count",
            "has_wildcard",
            "has_limit",
            "has_group_by",
            "has_order_by",
            "agg_count",
            "table_count",
            "complexity_score"
        ]

    @staticmethod
    def explain_risk_reasons(sql: str, risk_level: str) -> List[str]:
        features = SQLFeatureExtractor.extract_features(sql)
        reasons = []
        
        if features[1] > 0:
            reasons.append(f"Contains {int(features[1])} destructive/modifying SQL operation(s).")
        if features[0] == 0:
            reasons.append("Non-SELECT or unrecognized root query statement.")
        if features[0] == 1 and features[2] == 0 and features[6] == 0 and features[7] == 0:
            reasons.append("Unbounded full-table scan without WHERE or LIMIT clause.")
        if features[5] == 1 and features[6] == 0:
            reasons.append("SELECT * without LIMIT may return huge result sets.")
        if features[3] >= 3:
            reasons.append(f"High join complexity ({int(features[3])} joins).")
        if features[4] >= 2:
            reasons.append(f"Multiple nested subqueries ({int(features[4])} subqueries).")
            
        if not reasons:
            reasons = [
                "SELECT-only query targeting indexed attributes.",
                "Safe join constraints and bounded projection.",
                "Zero destructive or data-mutating statements."
            ]
            
        return reasons
