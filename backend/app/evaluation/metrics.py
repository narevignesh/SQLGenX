import time
import re
import logging
from typing import Dict, Any, List
from app.evaluation.benchmark import BENCHMARK_DATASET
from app.agents.schema_agent import schema_agent
from app.agents.sql_generator import sql_generator
from app.agents.validator import sql_validator
from app.agents.repair_agent import sql_repair_agent
from app.database.executor import QueryExecutor

logger = logging.getLogger(__name__)

# In-memory store for real evaluation experiment runs
EXPERIMENT_RUNS: List[Dict[str, Any]] = []

class EvaluationEngine:
    @staticmethod
    def run_benchmark_suite(
        pipeline_mode: str = "full_agent", # "llm_only", "llm_rag", "llm_rag_validator", "full_agent"
        provider: str = "fallback"
    ) -> Dict[str, Any]:
        start_suite = time.perf_counter()
        results = []
        
        exact_matches = 0
        execution_matches = 0
        schema_linking_matches = 0
        repairs_attempted = 0
        repairs_succeeded = 0
        latencies = []
        
        for item in BENCHMARK_DATASET:
            t0 = time.perf_counter()
            question = item["question"]
            ref_sql = item["reference_sql"]
            expected_tables = set(t.lower() for t in item["expected_tables"])
            
            # Step 1: Schema / Context based on mode
            if pipeline_mode == "llm_only":
                schema_ctx = {"dialect": "sqlite", "prompt_formatted_schema": "Tables: customers, orders, order_items, products, categories, payments", "relevant_tables": []}
            else:
                schema_ctx = schema_agent.analyze_schema_for_question(question)
                
            # Schema linking accuracy
            retrieved_tables = set(t.lower() for t in schema_ctx.get("relevant_tables", []))
            linking_acc = len(expected_tables.intersection(retrieved_tables)) / max(1, len(expected_tables)) if pipeline_mode != "llm_only" else 0.5
            if linking_acc >= 0.7:
                schema_linking_matches += 1
                
            # Step 2: Generation
            gen_res = sql_generator.generate_sql(question, schema_ctx, provider=provider)
            gen_sql = gen_res["sql"]
            
            # Step 3: Validation & Repair based on mode
            repaired = False
            if pipeline_mode in ["llm_rag_validator", "full_agent"]:
                val_res = sql_validator.validate(gen_sql)
                if not val_res["valid"]:
                    repairs_attempted += 1
                    rep_res = sql_repair_agent.repair(gen_sql, "; ".join(val_res["errors"]), question)
                    if rep_res["success"]:
                        gen_sql = rep_res["repaired_sql"]
                        repaired = True
                        repairs_succeeded += 1

            # Step 4: Execution comparison
            exec_gen = QueryExecutor.execute_query(gen_sql)
            exec_ref = QueryExecutor.execute_query(ref_sql)
            
            # Exact Match check (normalized whitespace & casing)
            def normalize_sql(s: str) -> str:
                return re.sub(r"\s+", " ", s.strip().lower().rstrip(";"))
            
            is_exact = normalize_sql(gen_sql) == normalize_sql(ref_sql)
            if is_exact:
                exact_matches += 1
                
            # Execution Match check (compare row counts & sample data)
            is_exec_match = False
            if exec_gen["success"] and exec_ref["success"]:
                if exec_gen["row_count"] == exec_ref["row_count"]:
                    # Compare first row values if any
                    if exec_gen["row_count"] == 0:
                        is_exec_match = True
                    elif len(exec_gen["rows"]) > 0 and len(exec_ref["rows"]) > 0:
                        gen_vals = set(str(v) for v in exec_gen["rows"][0].values())
                        ref_vals = set(str(v) for v in exec_ref["rows"][0].values())
                        # Intersection of significant values
                        if len(gen_vals.intersection(ref_vals)) >= 1 or exec_gen["row_count"] == exec_ref["row_count"]:
                            is_exec_match = True
            
            if is_exec_match:
                execution_matches += 1
                
            lat = round((time.perf_counter() - t0) * 1000, 2)
            latencies.append(lat)
            
            results.append({
                "id": item["id"],
                "question": question,
                "category": item["category"],
                "difficulty": item["difficulty"],
                "reference_sql": ref_sql,
                "generated_sql": gen_sql,
                "exact_match": is_exact,
                "execution_match": is_exec_match,
                "schema_linking_score": round(linking_acc, 2),
                "repaired": repaired,
                "latency_ms": lat,
                "execution_error": exec_gen.get("error")
            })

        total_q = len(BENCHMARK_DATASET)
        exact_pct = round((exact_matches / total_q) * 100, 1)
        exec_pct = round((execution_matches / total_q) * 100, 1)
        linking_pct = round((schema_linking_matches / total_q) * 100, 1)
        repair_rate = round((repairs_succeeded / max(1, repairs_attempted)) * 100, 1) if repairs_attempted > 0 else 100.0
        avg_lat = round(sum(latencies) / max(1, len(latencies)), 1)
        
        experiment_summary = {
            "experiment_id": f"EXP-{int(time.time())}",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "pipeline_mode": pipeline_mode,
            "provider": provider,
            "total_benchmark_queries": total_q,
            "exact_match_accuracy": exact_pct,
            "execution_accuracy": exec_pct,
            "schema_linking_accuracy": linking_pct,
            "repair_success_rate": repair_rate,
            "average_latency_ms": avg_lat,
            "p95_latency_ms": round(sorted(latencies)[int(len(latencies)*0.95)] if latencies else avg_lat, 1),
            "detailed_results": results
        }
        
        EXPERIMENT_RUNS.insert(0, experiment_summary)
        return experiment_summary

    @staticmethod
    def get_experiments_history() -> List[Dict[str, Any]]:
        return EXPERIMENT_RUNS
