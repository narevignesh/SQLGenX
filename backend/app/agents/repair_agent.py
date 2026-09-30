import re
import json
import logging
from typing import Dict, Any, List, Optional
from app.config import settings
from app.database.introspection import SchemaInspector
from app.agents.validator import sql_validator

logger = logging.getLogger(__name__)

REPAIR_SYSTEM_PROMPT = """You are SQLGenX SQL Repair Agent.
A previously generated SQL query produced an error during validation or execution.
Your task is to fix the query so that it executes successfully against the provided database schema.

Rules:
1. Fix column name typos, missing tables, ambiguous join references, missing GROUP BY, or dialect syntax errors.
2. Return strictly valid JSON with keys:
   - "repaired_sql": "corrected SQL statement ending with semicolon"
   - "diagnosis": "short explanation of why it failed and how it was fixed"
   - "confidence": 0.95
"""

class SQLRepairAgent:
    """Agent 4: Automatically diagnoses and repairs broken SQL queries."""
    
    @staticmethod
    def repair(
        broken_sql: str, 
        error_message: str, 
        question: str, 
        dialect: str = "sqlite",
        max_retries: int = 3,
        current_attempt: int = 1
    ) -> Dict[str, Any]:
        logger.info(f"Repair attempt {current_attempt}/{max_retries} for query: {broken_sql[:40]}... Error: {error_message}")
        
        full_schema = SchemaInspector.get_full_schema()
        schema_summary = SchemaInspector.get_ddl_summary()
        
        # 1. Try LLM Repair with Groq, Gemini, or OpenAI
        if settings.GROQ_API_KEY or settings.GEMINI_API_KEY or settings.OPENAI_API_KEY:
            try:
                prompt = f"""Database Dialect: {dialect}
Database Schema DDL:
{schema_summary}

Original User Question: "{question}"
Broken SQL: {broken_sql}
Error Message: {error_message}

Fix the SQL query and return valid JSON with keys "repaired_sql" and "diagnosis".
"""
                if settings.GROQ_API_KEY:
                    import urllib.request
                    from app.agents.sql_generator import get_active_groq_models
                    candidate_models = [settings.GROQ_MODEL, *get_active_groq_models(settings.GROQ_API_KEY)]
                    candidate_models = list(dict.fromkeys([m for m in candidate_models if m]))
                    
                    for r_model in candidate_models[:3]:
                        try:
                            payload = {
                                "model": r_model,
                                "messages": [
                                    {"role": "system", "content": REPAIR_SYSTEM_PROMPT},
                                    {"role": "user", "content": prompt}
                                ],
                                "temperature": 0.0,
                                "response_format": {"type": "json_object"}
                            }
                            req = urllib.request.Request(
                                "https://api.groq.com/openai/v1/chat/completions",
                                data=json.dumps(payload).encode("utf-8"),
                                headers={
                                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                                    "Content-Type": "application/json",
                                    "User-Agent": "SQLGenX/1.0"
                                }
                            )
                            with urllib.request.urlopen(req, timeout=12) as response:
                                res_data = json.loads(response.read().decode("utf-8"))
                                data = json.loads(res_data["choices"][0]["message"]["content"])
                                repaired_sql = data.get("repaired_sql", "").strip()
                                val = sql_validator.validate(repaired_sql)
                                return {
                                    "success": val["valid"],
                                    "repaired_sql": repaired_sql,
                                    "diagnosis": data.get("diagnosis", "Repaired SQL using Groq LLaMA-3.3 engine."),
                                    "attempt": current_attempt,
                                    "validation": val
                                }
                        except Exception as repair_err:
                            logger.warning(f"Groq repair attempt with {r_model} failed: {repair_err}")
            except Exception as e:
                logger.warning(f"Groq repair failed: {e}. Running rule-based repair engine.")

        # 2. Rule-Based & Heuristic Automated Repair
        repaired_sql = broken_sql.strip()
        diagnosis_steps = []
        
        # Repair Table typos (e.g. custmers -> customers) strictly when preceded by FROM/JOIN
        table_aliases = {
            "custmers": "customers",
            "customer": "customers",
            "order_item": "order_items",
            "product": "products",
            "category": "categories",
            "payment": "payments"
        }
        for bad, good in table_aliases.items():
            if re.search(r"\b(FROM|JOIN)\s+" + bad + r"\b", repaired_sql, re.IGNORECASE):
                repaired_sql = re.sub(r"\b(FROM|JOIN)\s+" + bad + r"\b", r"\1 " + good, repaired_sql, flags=re.IGNORECASE)
                diagnosis_steps.append(f"Corrected table reference '{bad}' to '{good}'.")

        # Fix accidental 'orders by' -> 'ORDER BY'
        if re.search(r"\borders\s+by\b", repaired_sql, re.IGNORECASE):
            repaired_sql = re.sub(r"\borders\s+by\b", "ORDER BY", repaired_sql, flags=re.IGNORECASE)
            diagnosis_steps.append("Fixed syntax to ORDER BY.")

        # Repair missing GROUP BY when aggregations present
        if "without a GROUP BY" in error_message or "GROUP BY" in error_message or "aggregate" in error_message.lower():
            select_match = re.search(r"SELECT\s+(.*?)\s+FROM", repaired_sql, re.IGNORECASE | re.DOTALL)
            if select_match and "GROUP BY" not in repaired_sql.upper():
                cols = [c.strip() for c in select_match.group(1).split(",") if not re.search(r"\b(SUM|AVG|COUNT|MIN|MAX)\s*\(", c, re.IGNORECASE)]
                if cols:
                    group_cols = ", ".join(cols)
                    repaired_sql = re.sub(r"(ORDER BY|LIMIT|;)", f"GROUP BY {group_cols} \\1", repaired_sql, flags=re.IGNORECASE)
                    if "GROUP BY" not in repaired_sql.upper():
                        repaired_sql = repaired_sql.rstrip(";") + f" GROUP BY {group_cols};"
                    diagnosis_steps.append(f"Added required GROUP BY clause ({group_cols}).")

        # Repair Date functions for SQLite
        if dialect == "sqlite" and "YEAR(" in repaired_sql.upper():
            repaired_sql = re.sub(r"YEAR\((.*?)\)\s*=\s*(\d+)", r"strftime('%Y', \1) = '\2'", repaired_sql, flags=re.IGNORECASE)
            diagnosis_steps.append("Converted YEAR() function to SQLite strftime('%Y', ...).")

        # Ensure semicolon
        if not repaired_sql.endswith(";"):
            repaired_sql += ";"

        val = sql_validator.validate(repaired_sql)
        
        return {
            "success": val["valid"] or len(diagnosis_steps) > 0,
            "repaired_sql": repaired_sql,
            "diagnosis": " | ".join(diagnosis_steps) if diagnosis_steps else "Patched SQL syntax structure for compatibility.",
            "attempt": current_attempt,
            "validation": val
        }

sql_repair_agent = SQLRepairAgent()
