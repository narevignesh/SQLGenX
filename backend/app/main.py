import sys
from pathlib import Path

# Add backend directory to sys.path so 'import app...' works from anywhere
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.database import router as database_router
from app.api.query import router as query_router
from app.api.schema import router as schema_router
from app.api.analytics import router as analytics_router
from app.api.history import router as history_router
from app.api.experiments import router as experiments_router
from app.api.health import router as health_router
from app.database.introspection import SchemaInspector
from app.database.seed_data import seed_ecommerce_database
from app.rag.indexer import SchemaIndexer
from app.ml.risk_model import risk_classifier

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("SQLGenX")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure demo DB is seeded if no tables exist and index schema
    logger.info("Starting SQLGenX Backend Engine...")
    try:
        schema = SchemaInspector.get_full_schema()
        if len(schema["tables"]) == 0:
            logger.info("No tables found. Seeding initial e-commerce dataset...")
            seed_ecommerce_database()
        SchemaIndexer.index_schema()
        logger.info(f"Schema indexed. ML Risk model loaded with {risk_classifier.model.n_estimators if risk_classifier.model else 0} trees.")
    except Exception as e:
        logger.error(f"Error during application startup initialization: {e}")
    yield
    logger.info("Shutting down SQLGenX Engine.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Agentic AI-Powered SQL Generation & Query Intelligence Platform",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(database_router, prefix=settings.API_PREFIX)
app.include_router(query_router, prefix=settings.API_PREFIX)
app.include_router(schema_router, prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)
app.include_router(history_router, prefix=settings.API_PREFIX)
app.include_router(experiments_router, prefix=settings.API_PREFIX)
app.include_router(health_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_url": f"{settings.API_PREFIX}/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
