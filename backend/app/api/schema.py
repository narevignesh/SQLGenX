from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List
from app.database.introspection import SchemaInspector
from app.rag.retriever import SchemaRetriever
from app.rag.indexer import SchemaIndexer

router = APIRouter(prefix="/schema", tags=["Schema Explorer & RAG"])

class SchemaSearchRequest(BaseModel):
    query: str
    top_k: int = 5

@router.get("/full")
async def get_full_schema():
    """Returns the full schema structure including tables, columns, types, primary keys, foreign keys, and relations."""
    return SchemaInspector.get_full_schema()

@router.get("/ddl")
async def get_schema_ddl():
    """Returns database DDL representation formatted for documentation or LLMs."""
    ddl = SchemaInspector.get_ddl_summary()
    return {"ddl": ddl}

@router.post("/search")
async def search_schema_rag(req: SchemaSearchRequest):
    """Semantic vector search across schema tables, columns, relationships, and verified queries."""
    context = SchemaRetriever.retrieve_context(req.query, top_k=req.top_k)
    return context

@router.post("/reindex")
async def reindex_schema():
    """Recomputes vector embeddings for the active database schema."""
    count = SchemaIndexer.index_schema()
    return {"success": True, "indexed_count": count}
