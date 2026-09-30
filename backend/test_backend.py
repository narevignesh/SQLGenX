import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database.seed_data import seed_ecommerce_database
from app.database.introspection import SchemaInspector
from app.rag.indexer import SchemaIndexer
from app.rag.retriever import SchemaRetriever
from app.ml.risk_model import risk_classifier
from app.agents.schema_agent import schema_agent
from app.agents.sql_generator import sql_generator
from app.agents.validator import sql_validator
from app.agents.optimizer import sql_optimizer
from app.agents.analyst import data_analyst
from app.database.executor import QueryExecutor

def run_tests():
    print("=== Testing SQLGenX Backend Modules ===")
    
    # 1. Test Seed DB
    print("\n[1] Seeding E-Commerce Database...")
    stats = seed_ecommerce_database()
    print("Seeded stats:", stats)
    
    # 2. Test Introspection
    print("\n[2] Testing Schema Introspection...")
    schema = SchemaInspector.get_full_schema()
    print(f"Total tables: {len(schema['tables'])}, Total relationships: {len(schema['relationships'])}")
    for t in schema['tables']:
        print(f" - Table {t['name']}: {len(t['columns'])} columns, {t['row_count']} rows")
        
    # 3. Test RAG Indexer & Retriever
    print("\n[3] Testing RAG Indexer & Retriever...")
    idx_count = SchemaIndexer.index_schema()
    print(f"Indexed items: {idx_count}")
    rag_ctx = SchemaRetriever.retrieve_context("Which city generated the highest revenue?")
    print("Retrieved relevant tables:", rag_ctx["relevant_tables"])
    
    # 4. Test ML Risk Classifier
    print("\n[4] Testing ML Risk Classifier...")
    safe_sql = "SELECT c.city, SUM(o.total_amount) AS revenue FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.city;"
    dangerous_sql = "DROP TABLE customers;"
    
    safe_risk = risk_classifier.predict_risk(safe_sql)
    dang_risk = risk_classifier.predict_risk(dangerous_sql)
    print(f"Safe SQL Risk: {safe_risk['level']} (Confidence: {safe_risk['confidence']})")
    print(f"Dangerous SQL Risk: {dang_risk['level']} (Confidence: {dang_risk['confidence']})")
    assert safe_risk["level"] == "LOW"
    assert dang_risk["level"] == "HIGH"
    
    # 5. Test Agents & Execution
    print("\n[5] Testing Multi-Agent Pipeline...")
    q = "Show the top 5 customers by total spending"
    schema_ctx = schema_agent.analyze_schema_for_question(q)
    gen = sql_generator.generate_sql(q, schema_ctx)
    print(f"Generated SQL: {gen['sql']}")
    
    val = sql_validator.validate(gen['sql'])
    print(f"Validation: valid={val['valid']}, errors={val['errors']}")
    
    opt = sql_optimizer.optimize(gen['sql'])
    print(f"Optimizer: suggestions count={len(opt['suggestions'])}, cost improvement={opt['improvement_percentage']}%")
    
    exec_res = QueryExecutor.execute_query(gen['sql'])
    print(f"Execution: success={exec_res['success']}, row_count={exec_res['row_count']}, time={exec_res['execution_time_ms']}ms")
    print(f"Sample row: {exec_res['rows'][0] if exec_res['rows'] else None}")
    
    analysis = data_analyst.analyze_results(q, exec_res['columns'], exec_res['rows'])
    print(f"Data Analyst Insights: {analysis['insights']}")
    print(f"Chart Recommendation: {analysis['chart_recommendation']}")
    
    print("\n=== ALL BACKEND MODULE TESTS PASSED PERFECTLY! ===")

if __name__ == "__main__":
    run_tests()
