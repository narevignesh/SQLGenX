import time
import re
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

try:
    import sqlparse
except ImportError:
    sqlparse = None
from app.agents.orchestrator import orchestrator
from app.agents.validator import sql_validator
from app.agents.optimizer import sql_optimizer
from app.agents.repair_agent import sql_repair_agent
from app.database.executor import QueryExecutor
from app.database.connection import db_manager

router = APIRouter(prefix="/query", tags=["Query Engine"])

class QueryStreamRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    question: str = Field(..., description="Natural language database question")
    provider: Optional[str] = "fallback"
    model_name: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = []
    auto_execute: Optional[bool] = True

class ExecuteQueryRequest(BaseModel):
    sql: str = Field(..., description="SQL query to execute")
    max_rows: Optional[int] = 500

class ValidateQueryRequest(BaseModel):
    sql: str

class RepairQueryRequest(BaseModel):
    broken_sql: str
    error_message: str
    question: Optional[str] = ""

class OptimizeQueryRequest(BaseModel):
    sql: str

class FormatQueryRequest(BaseModel):
    sql: str

@router.post("/stream")
async def stream_agent_pipeline(req: QueryStreamRequest):
    """Executes the full agentic AI workflow and streams real-time SSE progress events."""
    event_generator = orchestrator.run_pipeline_stream(
        question=req.question,
        provider=req.provider,
        model_name=req.model_name,
        conversation_history=req.conversation_history,
        auto_execute=req.auto_execute if req.auto_execute is not None else True
    )
    return StreamingResponse(
        event_generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/execute")
async def execute_sql(req: ExecuteQueryRequest):
    """Safely executes a read-only SQL query against the active database."""
    res = QueryExecutor.execute_query(req.sql, max_rows=req.max_rows or 500)
    if not res["success"] and res.get("is_security_violation", False):
        raise HTTPException(status_code=403, detail=res["error"])
    return res

@router.post("/validate")
async def validate_sql(req: ValidateQueryRequest):
    """Validates SQL syntax, schema references, aggregations, and predicts ML query risk."""
    return sql_validator.validate(req.sql)

@router.post("/optimize")
async def optimize_sql(req: OptimizeQueryRequest):
    """Analyzes execution plan, suggests optimizations, and compares query costs."""
    return sql_optimizer.optimize(req.sql)

@router.post("/repair")
async def repair_sql(req: RepairQueryRequest):
    """Automatically analyzes error messages and schema context to repair broken SQL."""
    return sql_repair_agent.repair(
        broken_sql=req.broken_sql,
        error_message=req.error_message,
        question=req.question or "",
        dialect=db_manager.current_db_type
    )

@router.post("/format")
async def format_sql(req: FormatQueryRequest):
    """Formats SQL with standard indentation and keyword capitalization."""
    if sqlparse is not None:
        formatted = sqlparse.format(
            req.sql,
            reindent=True,
            keyword_case="upper",
            identifier_case="lower"
        )
    else:
        # Regex keyword beautifier
        keywords = ["SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "ON", "AND", "OR", "AS"]
        formatted = req.sql
        for kw in keywords:
            formatted = re.sub(r"\b" + kw + r"\b", kw, formatted, flags=re.IGNORECASE)
    return {"formatted_sql": formatted}
