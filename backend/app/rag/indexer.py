import logging
from typing import Dict, Any, List
from app.database.introspection import SchemaInspector
from app.rag.embeddings import embedding_service
from app.rag.vector_store import schema_vector_store

logger = logging.getLogger(__name__)

EXAMPLE_QUERIES = [
    {
        "question": "Show the top 5 customers by total spending",
        "sql": "SELECT c.customer_id, c.first_name, c.last_name, SUM(o.total_amount) AS total_spending FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.first_name, c.last_name ORDER BY total_spending DESC LIMIT 5;",
        "tables": ["customers", "orders"]
    },
    {
        "question": "Which city generated the highest revenue?",
        "sql": "SELECT c.city, SUM(o.total_amount) AS total_revenue FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.city ORDER BY total_revenue DESC LIMIT 1;",
        "tables": ["customers", "orders"]
    },
    {
        "question": "Show monthly revenue for 2026",
        "sql": "SELECT strftime('%Y-%m', order_date) AS month, SUM(total_amount) AS monthly_revenue FROM orders WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01' GROUP BY month ORDER BY month ASC;",
        "tables": ["orders"]
    },
    {
        "question": "What are the top 10 products by revenue?",
        "sql": "SELECT p.product_id, p.name, SUM(oi.total_price) AS total_revenue FROM products p JOIN order_items oi ON p.product_id = oi.product_id GROUP BY p.product_id, p.name ORDER BY total_revenue DESC LIMIT 10;",
        "tables": ["products", "order_items"]
    },
    {
        "question": "Find customers who have not purchased in the last 90 days",
        "sql": "SELECT c.customer_id, c.first_name, c.last_name, MAX(o.order_date) AS last_order_date FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.first_name, c.last_name HAVING MAX(o.order_date) < date('now', '-90 days') OR MAX(o.order_date) IS NULL;",
        "tables": ["customers", "orders"]
    },
    {
        "question": "Which category has the highest average order value?",
        "sql": "SELECT cat.name AS category_name, AVG(o.total_amount) AS avg_order_value FROM categories cat JOIN products p ON cat.category_id = p.category_id JOIN order_items oi ON p.product_id = oi.product_id JOIN orders o ON oi.order_id = o.order_id GROUP BY cat.name ORDER BY avg_order_value DESC LIMIT 1;",
        "tables": ["categories", "products", "order_items", "orders"]
    }
]

class SchemaIndexer:
    @staticmethod
    def index_schema():
        logger.info("Indexing database schema for vector RAG...")
        schema = SchemaInspector.get_full_schema()
        docs = []
        texts = []
        
        # 1. Index Tables & Columns
        for table in schema["tables"]:
            cols_summary = ", ".join([f"{col['name']} ({col['type']})" for col in table["columns"]])
            table_text = f"Table {table['name']}: {table['description']} Columns: {cols_summary}"
            docs.append({
                "type": "table",
                "name": table["name"],
                "content": table_text,
                "columns": table["columns"],
                "primary_keys": table["primary_keys"]
            })
            texts.append(table_text)
            
            # Individual column docs for fine-grained search
            for col in table["columns"]:
                col_text = f"Column {table['name']}.{col['name']} of type {col['type']} in table {table['name']}"
                docs.append({
                    "type": "column",
                    "table": table["name"],
                    "name": col["name"],
                    "content": col_text
                })
                texts.append(col_text)
                
        # 2. Index Relationships
        for rel in schema["relationships"]:
            rel_text = f"Relationship: {rel['from_table']} joins with {rel['to_table']} on {rel['from_table']}.{rel['from_column']} = {rel['to_table']}.{rel['to_column']}"
            docs.append({
                "type": "relationship",
                "name": rel["name"],
                "content": rel_text,
                "details": rel
            })
            texts.append(rel_text)
            
        # 3. Index Example Queries (Only for tables that actually exist in the current schema)
        existing_table_names = {t["name"].lower() for t in schema["tables"]}
        indexed_examples_count = 0
        
        for ex in EXAMPLE_QUERIES:
            if all(t.lower() in existing_table_names for t in ex.get("tables", [])):
                ex_text = f"Example Question: {ex['question']} SQL: {ex['sql']}"
                docs.append({
                    "type": "example_query",
                    "question": ex["question"],
                    "sql": ex["sql"],
                    "content": ex_text,
                    "tables": ex["tables"]
                })
                texts.append(ex_text)
                indexed_examples_count += 1

        # If custom schema without pre-canned examples, generate dynamic schema-grounded query templates
        if indexed_examples_count == 0:
            for table in schema["tables"][:5]:
                tname = table["name"]
                cols = [c["name"] for c in table["columns"]]
                num_cols = [c["name"] for c in table["columns"] if any(nt in c["type"].lower() for nt in ["int", "float", "decimal", "numeric", "double", "real"])]
                text_cols = [c["name"] for c in table["columns"] if any(tt in c["type"].lower() for tt in ["char", "text", "varchar", "string"])]
                
                # Preview query
                q1 = f"Show recent rows from {tname}"
                sql1 = f"SELECT * FROM {tname} LIMIT 10;"
                t1 = f"Example Question: {q1} SQL: {sql1}"
                docs.append({"type": "example_query", "question": q1, "sql": sql1, "content": t1, "tables": [tname]})
                texts.append(t1)
                
                # Count query
                q2 = f"Count total records in {tname}"
                sql2 = f"SELECT COUNT(*) AS total_count FROM {tname};"
                t2 = f"Example Question: {q2} SQL: {sql2}"
                docs.append({"type": "example_query", "question": q2, "sql": sql2, "content": t2, "tables": [tname]})
                texts.append(t2)

                # Aggregation query if text and numeric columns exist
                if text_cols and num_cols:
                    grp_col = text_cols[0]
                    agg_col = num_cols[0]
                    q3 = f"Show total {agg_col} by {grp_col} in {tname}"
                    sql3 = f"SELECT {grp_col}, SUM({agg_col}) AS total_{agg_col} FROM {tname} GROUP BY {grp_col} ORDER BY total_{agg_col} DESC LIMIT 10;"
                    t3 = f"Example Question: {q3} SQL: {sql3}"
                    docs.append({"type": "example_query", "question": q3, "sql": sql3, "content": t3, "tables": [tname]})
                    texts.append(t3)

        schema_vector_store.clear()
        embeddings = embedding_service.get_embeddings(texts)
        schema_vector_store.add_documents(docs, embeddings)
        logger.info(f"Successfully indexed {len(docs)} schema and example artifacts into vector store.")
        return len(docs)
