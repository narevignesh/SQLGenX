import time
import logging
import re
from typing import Dict, Any, List
from sqlalchemy import text
from app.database.connection import db_manager
from app.config import settings

logger = logging.getLogger(__name__)

# Dangerous SQL keywords that modify data/DDL
DANGEROUS_PATTERNS = [
    r"\bDROP\b", r"\bDELETE\b", r"\bTRUNCATE\b", r"\bALTER\b", 
    r"\bCREATE\b", r"\bGRANT\b", r"\bREVOKE\b", r"\bUPDATE\b", 
    r"\bINSERT\b", r"\bREPLACE\b", r"\bEXEC\b", r"\bEXECUTE\b"
]

class QueryExecutor:
    @staticmethod
    def is_safe_read_only(sql: str) -> tuple[bool, str]:
        cleaned_sql = re.sub(r"--.*", "", sql)
        cleaned_sql = re.sub(r"/\*.*?\*/", "", cleaned_sql, flags=re.DOTALL).strip()
        
        for pattern in DANGEROUS_PATTERNS:
            if re.search(pattern, cleaned_sql, re.IGNORECASE):
                matched = re.search(pattern, cleaned_sql, re.IGNORECASE).group(0)
                return False, f"Dangerous command '{matched.upper()}' detected. Read-only mode blocks modifying queries."
        
        # Must start with SELECT or WITH or EXPLAIN
        if not re.match(r"^\s*(SELECT|WITH|EXPLAIN|PRAGMA|SHOW|DESCRIBE)\b", cleaned_sql, re.IGNORECASE):
            return False, "Only SELECT / read-only queries are permitted."
            
        return True, "Query verified as read-only."

    @staticmethod
    def execute_query(sql: str, max_rows: int = settings.MAX_ROWS_RETURNED) -> Dict[str, Any]:
        is_safe, message = QueryExecutor.is_safe_read_only(sql)
        if not is_safe and settings.READ_ONLY_MODE:
            return {
                "success": False,
                "error": message,
                "rows": [],
                "columns": [],
                "row_count": 0,
                "execution_time_ms": 0,
                "is_security_violation": True
            }

        engine = db_manager.get_engine()
        start_time = time.perf_counter()
        
        try:
            with engine.connect() as conn:
                # Execute with limit enforcement if not present
                result = conn.execute(text(sql))
                
                if result.returns_rows:
                    columns = list(result.keys())
                    raw_rows = result.fetchmany(max_rows)
                    rows = []
                    import decimal
                    import datetime
                    
                    for row in raw_rows:
                        row_dict = {}
                        for i, col in enumerate(columns):
                            val = row[i]
                            if val is None:
                                row_dict[col] = None
                            elif isinstance(val, decimal.Decimal):
                                f = float(val)
                                row_dict[col] = int(f) if f.is_integer() else f
                            elif isinstance(val, (datetime.date, datetime.datetime, datetime.time)):
                                row_dict[col] = val.isoformat()
                            elif isinstance(val, (bytes, bytearray, memoryview)):
                                row_dict[col] = str(val)
                            elif hasattr(val, "isoformat"):
                                row_dict[col] = val.isoformat()
                            else:
                                row_dict[col] = val
                        rows.append(row_dict)
                else:
                    columns = []
                    rows = []
                    
                execution_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
                
                return {
                    "success": True,
                    "error": None,
                    "columns": columns,
                    "rows": rows,
                    "row_count": len(rows),
                    "execution_time_ms": execution_time_ms,
                    "is_truncated": len(rows) == max_rows
                }
        except Exception as e:
            execution_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
            error_msg = str(e)
            logger.error(f"SQL execution failed: {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "columns": [],
                "rows": [],
                "row_count": 0,
                "execution_time_ms": execution_time_ms,
                "is_security_violation": False
            }

    @staticmethod
    def get_query_plan(sql: str) -> Dict[str, Any]:
        engine = db_manager.get_engine()
        db_type = db_manager.current_db_type
        
        # Clean query
        clean_sql = sql.strip().rstrip(";")
        
        try:
            with engine.connect() as conn:
                if db_type == "sqlite":
                    explain_sql = f"EXPLAIN QUERY PLAN {clean_sql}"
                    res = conn.execute(text(explain_sql))
                    rows = [dict(r._mapping) for r in res.fetchall()]
                    # Compute a naive estimated cost based on SCAN vs SEARCH
                    scan_count = sum(1 for r in rows if "SCAN" in str(r.get("detail", "")))
                    search_count = sum(1 for r in rows if "SEARCH" in str(r.get("detail", "")))
                    est_cost = (scan_count * 50) + (search_count * 10) + len(rows) * 5
                    return {
                        "supported": True,
                        "dialect": "sqlite",
                        "plan_rows": rows,
                        "estimated_cost": est_cost,
                        "raw_plan": "\n".join([f"{r.get('id', '')} | {r.get('detail', '')}" for r in rows])
                    }
                elif db_type == "postgresql":
                    explain_sql = f"EXPLAIN (FORMAT JSON) {clean_sql}"
                    res = conn.execute(text(explain_sql))
                    plan_json = res.scalar()
                    total_cost = 0
                    if plan_json and isinstance(plan_json, list) and len(plan_json) > 0:
                        total_cost = plan_json[0].get("Plan", {}).get("Total Cost", 0)
                    return {
                        "supported": True,
                        "dialect": "postgresql",
                        "plan_json": plan_json,
                        "estimated_cost": total_cost,
                        "raw_plan": str(plan_json)
                    }
                elif db_type == "mysql":
                    explain_sql = f"EXPLAIN FORMAT=JSON {clean_sql}"
                    res = conn.execute(text(explain_sql))
                    raw = res.scalar()
                    return {
                        "supported": True,
                        "dialect": "mysql",
                        "raw_plan": str(raw),
                        "estimated_cost": 50
                    }
        except Exception as e:
            return {
                "supported": False,
                "error": str(e),
                "estimated_cost": 100,
                "raw_plan": "Execution plan not available."
            }
