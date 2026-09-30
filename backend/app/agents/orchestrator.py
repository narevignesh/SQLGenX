import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Any, List, Optional
from app.agents.schema_agent import schema_agent
from app.agents.sql_generator import sql_generator
from app.agents.validator import sql_validator
from app.agents.repair_agent import sql_repair_agent
from app.agents.optimizer import sql_optimizer
from app.agents.analyst import data_analyst
from app.database.executor import QueryExecutor

logger = logging.getLogger(__name__)

class AgentOrchestrator:
    """Coordinates the entire multi-agent query generation, validation, repair, execution, and analysis workflow."""
    
    @staticmethod
    async def run_pipeline_stream(
        question: str,
        provider: Optional[str] = None,
        model_name: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        auto_execute: bool = True
    ) -> AsyncGenerator[str, None]:
        
        import decimal
        def default_serializer(obj):
            if isinstance(obj, decimal.Decimal):
                f = float(obj)
                return int(f) if f.is_integer() else f
            if hasattr(obj, "isoformat"):
                return obj.isoformat()
            return str(obj)

        # Helper to format SSE JSON data
        def sse_event(event_type: str, payload: Dict[str, Any]) -> str:
            return f"event: {event_type}\ndata: {json.dumps(payload, default=default_serializer)}\n\n"

        # 1. Schema Retrieval Stage
        yield sse_event("schema_retrieval_started", {"message": "Inspecting schema metadata and computing vector similarity..."})
        await asyncio.sleep(0.05)
        schema_context = schema_agent.analyze_schema_for_question(question)
        yield sse_event("schema_retrieval_completed", {
            "relevant_tables": schema_context["relevant_tables"],
            "relevant_relationships": schema_context["relevant_relationships"],
            "dialect": schema_context["dialect"]
        })

        # 2. SQL Generation Stage
        yield sse_event("sql_generation_started", {"message": "Synthesizing relational SQL with LLM..."})
        await asyncio.sleep(0.05)
        gen_res = sql_generator.generate_sql(
            question=question,
            schema_context=schema_context,
            provider=provider,
            model_name=model_name,
            conversation_history=conversation_history
        )
        current_sql = gen_res["sql"]
        yield sse_event("sql_generation_completed", {
            "sql": current_sql,
            "dialect": gen_res["dialect"],
            "tables_used": gen_res["tables_used"],
            "explanation_steps": gen_res["explanation_steps"],
            "confidence": gen_res["confidence"]
        })

        # 3. SQL Validation & Risk Classification Stage
        yield sse_event("validation_started", {"message": "Validating syntax, AST correctness, schema references, and query safety..."})
        await asyncio.sleep(0.05)
        val_res = sql_validator.validate(current_sql)
        yield sse_event("validation_completed", {
            "valid": val_res["valid"],
            "errors": val_res["errors"],
            "warnings": val_res["warnings"],
            "risk": val_res["risk"]
        })

        # 4. Auto-Repair Stage if invalid
        repaired = False
        if not val_res["valid"]:
            yield sse_event("repair_started", {
                "message": "Validation detected discrepancies. Initiating SQL Repair Agent...",
                "errors": val_res["errors"]
            })
            await asyncio.sleep(0.05)
            repair_res = sql_repair_agent.repair(
                broken_sql=current_sql,
                error_message="; ".join(val_res["errors"]),
                question=question,
                dialect=gen_res["dialect"]
            )
            if repair_res["success"]:
                current_sql = repair_res["repaired_sql"]
                repaired = True
                val_res = repair_res["validation"]
            yield sse_event("repair_completed", {
                "repaired": repaired,
                "repaired_sql": current_sql,
                "diagnosis": repair_res.get("diagnosis", "")
            })

        # 5. Optimization Stage
        yield sse_event("optimization_started", {"message": "Analyzing execution plan and query predicates..."})
        await asyncio.sleep(0.05)
        opt_res = sql_optimizer.optimize(current_sql)
        yield sse_event("optimization_completed", {
            "has_optimization": opt_res["has_optimization"],
            "original_sql": opt_res["original_sql"],
            "optimized_sql": opt_res["optimized_sql"],
            "suggestions": opt_res["suggestions"],
            "cost_before": opt_res["estimated_cost_before"],
            "cost_after": opt_res["estimated_cost_after"],
            "improvement_pct": opt_res["improvement_percentage"]
        })

        # 6. Execution Stage
        exec_res = {"success": False, "rows": [], "columns": [], "row_count": 0, "execution_time_ms": 0}
        if auto_execute:
            yield sse_event("execution_started", {"message": "Executing read-only SQL query against database engine..."})
            await asyncio.sleep(0.05)
            # Execute with safe guard
            exec_res = QueryExecutor.execute_query(current_sql)
            
            # If execution error occurred, try 1 round of runtime repair
            if not exec_res["success"] and not exec_res.get("is_security_violation", False):
                yield sse_event("repair_started", {
                    "message": f"Execution failed ({exec_res['error']}). Attempting runtime error repair...",
                    "error": exec_res["error"]
                })
                repair_res = sql_repair_agent.repair(
                    broken_sql=current_sql,
                    error_message=exec_res["error"],
                    question=question,
                    dialect=gen_res["dialect"]
                )
                if repair_res["success"]:
                    current_sql = repair_res["repaired_sql"]
                    repaired = True
                    exec_res = QueryExecutor.execute_query(current_sql)
                yield sse_event("repair_completed", {
                    "repaired": repaired,
                    "repaired_sql": current_sql,
                    "diagnosis": repair_res.get("diagnosis", "")
                })
                
            yield sse_event("execution_completed", {
                "success": exec_res["success"],
                "row_count": exec_res["row_count"],
                "execution_time_ms": exec_res["execution_time_ms"],
                "error": exec_res.get("error"),
                "is_truncated": exec_res.get("is_truncated", False)
            })

        # 7. Data Analysis Stage
        yield sse_event("analysis_started", {"message": "Computing grounded business insights and chart parameters..."})
        await asyncio.sleep(0.05)
        analysis_res = data_analyst.analyze_results(
            question=question,
            columns=exec_res.get("columns", []),
            rows=exec_res.get("rows", [])
        )
        yield sse_event("analysis_completed", {
            "summary": analysis_res["summary"],
            "insights": analysis_res["insights"],
            "chart_recommendation": analysis_res["chart_recommendation"]
        })

        # 8. Final Consolidated Response
        final_payload = {
            "question": question,
            "sql": current_sql,
            "dialect": gen_res["dialect"],
            "tables_used": gen_res["tables_used"],
            "explanation_steps": gen_res["explanation_steps"],
            "confidence": gen_res["confidence"],
            "repaired": repaired,
            "validation": val_res,
            "risk": val_res["risk"],
            "optimization": opt_res,
            "execution": {
                "success": exec_res["success"],
                "row_count": exec_res["row_count"],
                "execution_time_ms": exec_res["execution_time_ms"],
                "error": exec_res.get("error")
            },
            "columns": exec_res.get("columns", []),
            "rows": exec_res.get("rows", []),
            "insights": analysis_res["insights"],
            "summary": analysis_res["summary"],
            "chart": analysis_res["chart_recommendation"]
        }
        yield sse_event("pipeline_completed", final_payload)

orchestrator = AgentOrchestrator()
