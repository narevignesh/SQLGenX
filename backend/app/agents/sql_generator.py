import os
import re
import json
import logging
from typing import Dict, Any, Optional, List
from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are SQLGenX SQL Generation Agent, an expert database engineer.
Your task is to convert a user's natural language question into an accurate, syntactically correct, safe, and performant SQL query.

Rules:
1. ONLY return standard read-only SQL queries (SELECT or WITH).
2. NEVER generate DROP, DELETE, UPDATE, INSERT, ALTER, TRUNCATE, or CREATE statements.
3. Use the exact table names and column names provided in the schema context.
4. Correctly perform JOINs using the provided foreign-key relationships.
5. If aggregations (SUM, AVG, COUNT) are used alongside non-aggregated columns, ALWAYS include all non-aggregated columns in the GROUP BY clause.
6. Target the specified database dialect (SQLite, PostgreSQL, MySQL). For SQLite dates, use strftime or date functions. For PostgreSQL, use DATE_TRUNC or EXTRACT.
7. Return a strictly valid JSON response with keys:
   - "sql": "The raw executable SQL query ending with a semicolon"
   - "dialect": "the dialect name"
   - "tables_used": ["list", "of", "tables"]
   - "explanation_steps": ["step 1", "step 2", "step 3"]
   - "confidence": 0.95
"""

_cached_groq_models: List[str] = []

def get_active_groq_models(api_key: str) -> List[str]:
    global _cached_groq_models
    if _cached_groq_models:
        return _cached_groq_models
    try:
        import urllib.request
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {api_key}", "User-Agent": "SQLGenX/1.0"}
        )
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            active_ids = [
                m["id"] for m in data.get("data", []) 
                if m.get("active", True) and "whisper" not in m.get("id", "").lower()
            ]
            if active_ids:
                # Rank models: 70b first, then deepseek/qwen, then 3.2
                active_ids.sort(key=lambda x: (
                    0 if "3.3-70b" in x else
                    1 if "70b" in x else
                    2 if "r1" in x or "deepseek" in x else
                    3 if "3.2" in x else
                    4 if "8b" in x else 5
                ))
                _cached_groq_models = active_ids
                logger.info(f"Discovered active Groq models: {_cached_groq_models[:4]}")
                return _cached_groq_models
    except Exception as e:
        logger.warning(f"Could not query Groq /models list: {e}")

    return [
        "llama-3.3-70b-versatile",
        "llama-3.3-70b-specdec",
        "deepseek-r1-distill-llama-70b",
        "llama-3.2-3b-preview",
        "llama-3.2-1b-preview",
        "qwen-2.5-32b"
    ]

class SQLGenerationAgent:
    """Agent 2: Converts natural language question + schema context into structured SQL."""
    
    @staticmethod
    def generate_sql(
        question: str, 
        schema_context: Dict[str, Any], 
        provider: Optional[str] = None,
        model_name: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        provider = provider or settings.LLM_PROVIDER
        dialect = schema_context.get("dialect", "sqlite")
        schema_str = schema_context.get("prompt_formatted_schema", "")
        examples_str = "\n".join([f"Q: {e['question']}\nSQL: {e['sql']}" for e in schema_context.get("example_queries", [])])
        
        user_prompt = f"""Database Dialect: {dialect}

Database Schema Context:
{schema_str}

Similar Examples:
{examples_str}

User Question: "{question}"
"""
        if conversation_history:
            history_text = "\n".join([f"Previous {m['role']}: {m['content']}" for m in conversation_history[-3:]])
            user_prompt = f"Previous Conversation Context:\n{history_text}\n\n" + user_prompt

        # 1. Try Google Gemini
        if (provider == "gemini" or (settings.GEMINI_API_KEY and provider not in ["openai", "groq"])) and settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                m_name = model_name or settings.GEMINI_MODEL
                model = genai.GenerativeModel(m_name, system_instruction=SYSTEM_PROMPT)
                response = model.generate_content(user_prompt)
                raw_text = response.text.strip()
                res_json = json.loads(raw_text)
                return SQLGenerationAgent._format_response(res_json, dialect)
            except Exception as e:
                logger.warning(f"Gemini generation error: {e}. Falling back to next provider.")

        # 2. Try OpenAI
        if (provider == "openai" or (settings.OPENAI_API_KEY and provider not in ["gemini", "groq"])) and settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                m_name = model_name or settings.OPENAI_MODEL
                resp = client.chat.completions.create(
                    model=m_name,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.0
                )
                res_json = json.loads(resp.choices[0].message.content)
                return SQLGenerationAgent._format_response(res_json, dialect)
            except Exception as e:
                logger.warning(f"OpenAI generation error: {e}. Falling back to next provider.")

        # 3. Try Groq (Direct REST API or SDK)
        if provider == "groq" or (settings.GROQ_API_KEY and provider not in ["openai", "gemini"]):
            api_key = (settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")).strip()
            if api_key:
                import urllib.request
                import urllib.error
                discovered_models = get_active_groq_models(api_key)
                groq_models = [
                    model_name,
                    settings.GROQ_MODEL,
                    *discovered_models
                ]
                # Deduplicate
                groq_models = list(dict.fromkeys([m for m in groq_models if m]))
                
                for g_model in groq_models:
                    try:
                        payload = {
                            "model": g_model,
                            "messages": [
                                {"role": "system", "content": SYSTEM_PROMPT + "\nYou must output strictly valid JSON."},
                                {"role": "user", "content": user_prompt + "\n\nReturn strictly valid JSON with keys: sql, dialect, tables_used, explanation_steps, confidence."}
                            ],
                            "temperature": 0.0,
                            "response_format": {"type": "json_object"}
                        }
                        req = urllib.request.Request(
                            "https://api.groq.com/openai/v1/chat/completions",
                            data=json.dumps(payload).encode("utf-8"),
                            headers={
                                "Authorization": f"Bearer {api_key}",
                                "Content-Type": "application/json",
                                "User-Agent": "Mozilla/5.0 SQLGenX"
                            }
                        )
                        with urllib.request.urlopen(req, timeout=12) as response:
                            res_data = json.loads(response.read().decode("utf-8"))
                            content = res_data["choices"][0]["message"]["content"]
                            res_json = json.loads(content)
                            formatted = SQLGenerationAgent._format_response(res_json, dialect)
                            if re.search(r"^\s*(SELECT|WITH|SHOW|DESCRIBE)\b", formatted["sql"], re.IGNORECASE):
                                return formatted
                            logger.warning(f"Groq returned non-SELECT query '{formatted['sql'][:30]}...', trying next model or fallback.")
                    except urllib.error.HTTPError as he:
                        err_body = he.read().decode("utf-8") if hasattr(he, "read") else ""
                        logger.warning(f"Groq API {g_model} HTTP error {he.code}: {err_body}")
                    except Exception as e:
                        logger.warning(f"Groq API {g_model} call error: {e}")

        # 4. Fallback Intelligent Rule-Based Generator
        return SQLGenerationAgent._fallback_generate(question, schema_context, dialect)

    @staticmethod
    def _format_response(res_json: Dict[str, Any], dialect: str) -> Dict[str, Any]:
        sql = res_json.get("sql", "").strip()
        # Clean markdown if enclosed
        sql = re.sub(r"^```sql", "", sql, flags=re.IGNORECASE)
        sql = re.sub(r"^```", "", sql)
        sql = re.sub(r"```$", "", sql).strip()
        if not sql.endswith(";"):
            sql += ";"
            
        tables = res_json.get("tables_used", [])
        if not tables:
            # regex detect tables
            tables = list(set(re.findall(r"\b(?:FROM|JOIN)\s+([a-zA-Z_0-9]+)", sql, re.IGNORECASE)))
            
        return {
            "sql": sql,
            "dialect": dialect,
            "tables_used": tables,
            "explanation_steps": res_json.get("explanation_steps", [
                "Identified target entities and fields.",
                "Constructed relational JOIN conditions.",
                "Applied filtering and aggregation criteria."
            ]),
            "confidence": float(res_json.get("confidence", 0.92)),
            "generator": "llm"
        }

    @staticmethod
    def _fallback_generate(question: str, schema_context: Dict[str, Any], dialect: str) -> Dict[str, Any]:
        """Intelligent semantic template matcher when API keys are not supplied or for schema fallback."""
        q_lower = question.lower().strip()
        available_tables = [t["name"] for t in schema_context.get("table_details", [])]
        if not available_tables:
            available_tables = schema_context.get("relevant_tables", [])
        avail_lower = {t.lower(): t for t in available_tables}
        
        # Check closest example queries first (ensuring all tables exist)
        for ex in schema_context.get("example_queries", []):
            if ex.get("similarity", 0) > 0.82 and all(t.lower() in avail_lower for t in ex.get("tables", [])):
                return {
                    "sql": ex["sql"],
                    "dialect": dialect,
                    "tables_used": ex.get("tables", []),
                    "explanation_steps": [
                        "Matched query intent with verified high-confidence schema template.",
                        "Selected primary key and measure aggregates.",
                        "Enforced limit and sort order."
                    ],
                    "confidence": 0.95,
                    "generator": "rag_semantic_match"
                }

        # Query parsing heuristics for common analytics questions (only if tables exist)
        if "top" in q_lower and "customer" in q_lower and ("spending" in q_lower or "revenue" in q_lower or "spent" in q_lower) and "customers" in avail_lower and "orders" in avail_lower:
            limit = re.search(r"\btop\s+(\d+)", q_lower)
            lim_val = limit.group(1) if limit else "5"
            sql = f"SELECT c.customer_id, c.first_name, c.last_name, c.email, SUM(o.total_amount) AS total_spending FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.first_name, c.last_name, c.email ORDER BY total_spending DESC LIMIT {lim_val};"
            return {
                "sql": sql,
                "dialect": dialect,
                "tables_used": ["customers", "orders"],
                "explanation_steps": [
                    "Joined customers with orders on customer_id.",
                    "Aggregated sum of total_amount by customer.",
                    f"Sorted by total spending in descending order and limited to top {lim_val}."
                ],
                "confidence": 0.94,
                "generator": "semantic_agent"
            }
            
        elif "city" in q_lower and ("revenue" in q_lower or "highest" in q_lower or "sales" in q_lower) and "customers" in avail_lower and "orders" in avail_lower:
            sql = "SELECT c.city, SUM(o.total_amount) AS total_revenue FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.city ORDER BY total_revenue DESC LIMIT 5;"
            return {
                "sql": sql,
                "dialect": dialect,
                "tables_used": ["customers", "orders"],
                "explanation_steps": [
                    "Joined customers with orders on customer_id.",
                    "Aggregated total revenue by customer city.",
                    "Sorted by revenue descending to identify top contributing cities."
                ],
                "confidence": 0.93,
                "generator": "semantic_agent"
            }
            
        elif ("monthly revenue" in q_lower or ("month" in q_lower and "revenue" in q_lower)) and "orders" in avail_lower:
            if dialect == "mysql":
                sql = "SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, SUM(total_amount) AS monthly_revenue, COUNT(order_id) AS total_orders FROM orders WHERE order_date >= '2026-01-01' GROUP BY month ORDER BY month ASC;"
            elif dialect == "postgresql":
                sql = "SELECT TO_CHAR(order_date, 'YYYY-MM') AS month, SUM(total_amount) AS monthly_revenue, COUNT(order_id) AS total_orders FROM orders WHERE order_date >= '2026-01-01' GROUP BY TO_CHAR(order_date, 'YYYY-MM') ORDER BY month ASC;"
            else:
                sql = "SELECT strftime('%Y-%m', order_date) AS month, SUM(total_amount) AS monthly_revenue, COUNT(order_id) AS total_orders FROM orders WHERE order_date >= '2026-01-01' GROUP BY month ORDER BY month ASC;"
            return {
                "sql": sql,
                "dialect": dialect,
                "tables_used": ["orders"],
                "explanation_steps": [
                    "Extracted Year-Month string from order_date with dialect-appropriate date functions.",
                    "Filtered for orders in the target time horizon.",
                    "Aggregated revenue and order counts by calendar month."
                ],
                "confidence": 0.92,
                "generator": "semantic_agent"
            }

        elif "category" in q_lower and ("revenue" in q_lower or "sales" in q_lower or "order value" in q_lower) and "categories" in avail_lower and "products" in avail_lower and "order_items" in avail_lower and "orders" in avail_lower:
            sql = "SELECT cat.name AS category_name, SUM(oi.total_price) AS total_revenue, AVG(o.total_amount) AS avg_order_value FROM categories cat JOIN products p ON cat.category_id = p.category_id JOIN order_items oi ON p.product_id = oi.product_id JOIN orders o ON oi.order_id = o.order_id GROUP BY cat.name ORDER BY total_revenue DESC;"
            return {
                "sql": sql,
                "dialect": dialect,
                "tables_used": ["categories", "products", "order_items", "orders"],
                "explanation_steps": [
                    "Joined categories -> products -> order_items -> orders.",
                    "Calculated total category revenue and average order value.",
                    "Grouped by category name."
                ],
                "confidence": 0.91,
                "generator": "semantic_agent"
            }

        elif "product" in q_lower and ("top" in q_lower or "revenue" in q_lower or "sales" in q_lower or "selling" in q_lower) and "products" in avail_lower and "order_items" in avail_lower:
            limit = re.search(r"\btop\s+(\d+)", q_lower)
            lim_val = limit.group(1) if limit else "10"
            sql = f"SELECT p.product_id, p.name AS product_name, SUM(oi.quantity) AS total_units_sold, SUM(oi.total_price) AS total_revenue FROM products p JOIN order_items oi ON p.product_id = oi.product_id GROUP BY p.product_id, p.name ORDER BY total_revenue DESC LIMIT {lim_val};"
            return {
                "sql": sql,
                "dialect": dialect,
                "tables_used": ["products", "order_items"],
                "explanation_steps": [
                    "Joined products with order_items on product_id.",
                    "Summed units sold and total item price revenue.",
                    f"Sorted by total revenue descending (top {lim_val})."
                ],
                "confidence": 0.93,
                "generator": "semantic_agent"
            }
            
        elif ("payment" in q_lower or "payment method" in q_lower) and "payments" in avail_lower:
            sql = "SELECT payment_method, COUNT(*) AS transaction_count, SUM(amount) AS total_volume FROM payments GROUP BY payment_method ORDER BY total_volume DESC;"
            return {
                "sql": sql,
                "dialect": dialect,
                "tables_used": ["payments"],
                "explanation_steps": [
                    "Queried payments table grouping by payment_method.",
                    "Computed count of transactions and aggregate monetary volume."
                ],
                "confidence": 0.95,
                "generator": "semantic_agent"
            }

        elif ("loyalty" in q_lower or "tier" in q_lower) and "customers" in avail_lower:
            sql = "SELECT loyalty_tier, COUNT(customer_id) AS customer_count FROM customers GROUP BY loyalty_tier ORDER BY customer_count DESC;"
            return {
                "sql": sql,
                "dialect": dialect,
                "tables_used": ["customers"],
                "explanation_steps": [
                    "Grouped customers by loyalty_tier.",
                    "Counted total active customers per membership tier."
                ],
                "confidence": 0.94,
                "generator": "semantic_agent"
            }
            
        elif ("declining" in q_lower or "losing" in q_lower or "low stock" in q_lower) and "products" in avail_lower and "order_items" in avail_lower:
            sql = "SELECT p.product_id, p.name, p.stock_quantity, p.price, COALESCE(SUM(oi.quantity), 0) AS units_sold FROM products p LEFT JOIN order_items oi ON p.product_id = oi.product_id GROUP BY p.product_id, p.name, p.stock_quantity, p.price ORDER BY units_sold ASC, p.stock_quantity ASC LIMIT 10;"
            return {
                "sql": sql,
                "dialect": dialect,
                "tables_used": ["products", "order_items"],
                "explanation_steps": [
                    "Left-joined products with order_items to capture zero/low sales items.",
                    "Ordered ascending by units sold."
                ],
                "confidence": 0.90,
                "generator": "semantic_agent"
            }
            
        elif ("not purchased" in q_lower or "90 days" in q_lower or "inactive" in q_lower) and "customers" in avail_lower and "orders" in avail_lower:
            if dialect == "mysql":
                sql = "SELECT c.customer_id, c.first_name, c.last_name, c.email, MAX(o.order_date) AS last_order_date FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.first_name, c.last_name, c.email HAVING MAX(o.order_date) < DATE_SUB(NOW(), INTERVAL 90 DAY) OR MAX(o.order_date) IS NULL LIMIT 20;"
            elif dialect == "postgresql":
                sql = "SELECT c.customer_id, c.first_name, c.last_name, c.email, MAX(o.order_date) AS last_order_date FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.first_name, c.last_name, c.email HAVING MAX(o.order_date) < NOW() - INTERVAL '90 days' OR MAX(o.order_date) IS NULL LIMIT 20;"
            else:
                sql = "SELECT c.customer_id, c.first_name, c.last_name, c.email, MAX(o.order_date) AS last_order_date FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.first_name, c.last_name, c.email HAVING MAX(o.order_date) < date('now', '-90 days') OR MAX(o.order_date) IS NULL LIMIT 20;"
            return {
                "sql": sql,
                "dialect": dialect,
                "tables_used": ["customers", "orders"],
                "explanation_steps": [
                    "Identified customer last order dates using MAX(order_date).",
                    "Filtered for customers with no recent orders in past 90 days using dialect date functions."
                ],
                "confidence": 0.91,
                "generator": "semantic_agent"
            }

        # Dynamic heuristic query generation for custom connected databases
        if schema_context.get("table_details"):
            for t_info in schema_context["table_details"]:
                tname = t_info["name"]
                tcols = t_info.get("columns", [])
                num_cols = [c["name"] for c in tcols if any(nt in c.get("type", "").lower() for nt in ["int", "float", "decimal", "numeric", "double", "real"])]
                text_cols = [c["name"] for c in tcols if any(tt in c.get("type", "").lower() for tt in ["char", "text", "varchar", "string"])]
                
                if ("sum" in q_lower or "total" in q_lower or "revenue" in q_lower or "spending" in q_lower or "amount" in q_lower or "top" in q_lower) and num_cols and text_cols:
                    grp = text_cols[0]
                    agg = num_cols[0]
                    sql = f"SELECT {grp}, SUM({agg}) AS total_{agg} FROM {tname} GROUP BY {grp} ORDER BY total_{agg} DESC LIMIT 10;"
                    return {
                        "sql": sql,
                        "dialect": dialect,
                        "tables_used": [tname],
                        "explanation_steps": [
                            f"Identified metric column '{agg}' and dimension '{grp}' from table '{tname}'.",
                            f"Calculated aggregate sum grouped by {grp}.",
                            "Sorted descending to rank top values."
                        ],
                        "confidence": 0.88,
                        "generator": "dynamic_schema_agent"
                    }
                elif ("count" in q_lower or "how many" in q_lower or "total" in q_lower) and text_cols:
                    grp = text_cols[0]
                    sql = f"SELECT {grp}, COUNT(*) AS total_count FROM {tname} GROUP BY {grp} ORDER BY total_count DESC LIMIT 10;"
                    return {
                        "sql": sql,
                        "dialect": dialect,
                        "tables_used": [tname],
                        "explanation_steps": [
                            f"Grouped records by '{grp}' from table '{tname}'.",
                            "Calculated frequency counts for each distinct group."
                        ],
                        "confidence": 0.88,
                        "generator": "dynamic_schema_agent"
                    }

        # Generic safe fallback SELECT on first available table in active DB
        if available_tables:
            first_table = available_tables[0]
            sql = f"SELECT * FROM {first_table} LIMIT 10;"
            return {
                "sql": sql,
                "dialect": dialect,
                "tables_used": [first_table],
                "explanation_steps": [
                    f"Selected preview records from table {first_table}.",
                    "Limited result set to 10 rows for inspection."
                ],
                "confidence": 0.80,
                "generator": "fallback_explorer"
            }
        
        # Absolute safety query
        return {
            "sql": "SELECT 1 AS status;",
            "dialect": dialect,
            "tables_used": [],
            "explanation_steps": ["Executed database ping verification."],
            "confidence": 0.70,
            "generator": "fallback_ping"
        }

sql_generator = SQLGenerationAgent()
