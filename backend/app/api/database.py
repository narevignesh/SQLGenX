from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from app.database.connection import db_manager
from app.database.seed_data import seed_ecommerce_database
from app.database.introspection import SchemaInspector
from app.rag.indexer import SchemaIndexer

router = APIRouter(prefix="/database", tags=["Database"])

class DBConnectionRequest(BaseModel):
    db_type: str = Field(..., description="sqlite, postgresql, or mysql")
    host: Optional[str] = ""
    port: Optional[int] = 0
    database_name: Optional[str] = ""
    username: Optional[str] = ""
    password: Optional[str] = ""
    ssl: Optional[bool] = False
    sqlite_path: Optional[str] = ""

@router.post("/test")
async def test_database_connection(req: DBConnectionRequest):
    result = db_manager.test_connection(
        db_type=req.db_type,
        host=req.host or "",
        port=req.port or 0,
        database_name=req.database_name or "",
        username=req.username or "",
        password=req.password or "",
        ssl=req.ssl or False,
        sqlite_path=req.sqlite_path or ""
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.post("/connect")
async def connect_database(req: DBConnectionRequest):
    result = db_manager.connect(
        db_type=req.db_type,
        host=req.host or "",
        port=req.port or 0,
        database_name=req.database_name or "",
        username=req.username or "",
        password=req.password or "",
        ssl=req.ssl or False,
        sqlite_path=req.sqlite_path or ""
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
        
    # Re-index schema for RAG
    SchemaIndexer.index_schema()
    return result

@router.post("/seed-demo")
async def seed_demo_database():
    try:
        stats = seed_ecommerce_database()
        indexed_count = SchemaIndexer.index_schema()
        return {
            "success": True,
            "message": "Demo e-commerce database seeded with 1,000+ records and indexed for RAG successfully.",
            "stats": stats,
            "indexed_schema_items": indexed_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed demo database: {str(e)}")

@router.get("/status")
async def get_database_status():
    schema = SchemaInspector.get_full_schema()
    return {
        "db_type": db_manager.current_db_type,
        "is_connected": True,
        "total_tables": len(schema["tables"]),
        "tables": [t["name"] for t in schema["tables"]],
        "relationships_count": len(schema["relationships"])
    }
