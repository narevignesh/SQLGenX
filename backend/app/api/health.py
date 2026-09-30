import os
from fastapi import APIRouter
from app.config import settings
from app.database.connection import db_manager
from app.ml.risk_model import risk_classifier

router = APIRouter(tags=["Health & Diagnostics"])

@router.get("/health")
async def health_check():
    """System health check and provider readiness."""
    providers = {
        "gemini_available": bool(settings.GEMINI_API_KEY),
        "openai_available": bool(settings.OPENAI_API_KEY),
        "groq_available": bool(settings.GROQ_API_KEY),
        "active_provider": settings.LLM_PROVIDER
    }
    
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "database_type": db_manager.current_db_type,
        "database_connected": db_manager.active_engine is not None,
        "ml_risk_model_ready": risk_classifier.model is not None,
        "read_only_mode": settings.READ_ONLY_MODE,
        "providers": providers
    }
