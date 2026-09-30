import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/history", tags=["Query History"])

class HistoryItem(BaseModel):
    id: Optional[str] = None
    question: str
    sql: str
    dialect: Optional[str] = "sqlite"
    risk_level: Optional[str] = "LOW"
    execution_time_ms: Optional[float] = 0.0
    row_count: Optional[int] = 0
    status: Optional[str] = "Success"
    provider: Optional[str] = "fallback"
    repaired: Optional[bool] = False
    timestamp: Optional[str] = None

# In-memory history cache with initial seed
QUERY_HISTORY: List[Dict[str, Any]] = [
    {
        "id": "hist_01",
        "question": "Show the top 5 customers by total spending",
        "sql": "SELECT c.customer_id, c.first_name, c.last_name, SUM(o.total_amount) AS total_spending FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.first_name, c.last_name ORDER BY total_spending DESC LIMIT 5;",
        "dialect": "sqlite",
        "risk_level": "LOW",
        "execution_time_ms": 14.2,
        "row_count": 5,
        "status": "Success",
        "provider": "agentic_engine",
        "repaired": False,
        "timestamp": "2026-09-21 08:30:15"
    },
    {
        "id": "hist_02",
        "question": "Which city generated the highest revenue?",
        "sql": "SELECT c.city, SUM(o.total_amount) AS total_revenue FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.city ORDER BY total_revenue DESC LIMIT 5;",
        "dialect": "sqlite",
        "risk_level": "LOW",
        "execution_time_ms": 11.8,
        "row_count": 5,
        "status": "Success",
        "provider": "agentic_engine",
        "repaired": False,
        "timestamp": "2026-09-21 08:45:22"
    }
]

@router.get("")
async def get_history():
    """Returns the list of recent query execution records."""
    return QUERY_HISTORY

@router.post("")
async def add_history_item(item: HistoryItem):
    """Stores a new query execution history item."""
    data = item.dict()
    if not data.get("id"):
        data["id"] = f"hist_{int(time.time() * 1000)}"
    if not data.get("timestamp"):
        data["timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S")
        
    QUERY_HISTORY.insert(0, data)
    return data

@router.delete("/{item_id}")
async def delete_history_item(item_id: str):
    """Deletes a specific history record."""
    global QUERY_HISTORY
    QUERY_HISTORY = [h for h in QUERY_HISTORY if h.get("id") != item_id]
    return {"success": True, "deleted_id": item_id}

@router.delete("")
async def clear_history():
    """Clears all query history."""
    global QUERY_HISTORY
    QUERY_HISTORY = []
    return {"success": True, "message": "Query history cleared."}
