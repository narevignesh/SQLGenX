import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    APP_NAME: str = "SQLGenX"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    BASE_DIR: Path = BASE_DIR
    
    # LLM Settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "groq")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    # Database Settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/sqlgenx_demo.db")
    MAX_ROWS_RETURNED: int = 500
    QUERY_TIMEOUT_SECONDS: int = 15
    READ_ONLY_MODE: bool = True
    
    # ML & RAG paths
    MODEL_DIR: str = str(BASE_DIR / "app" / "ml" / "models")
    VECTOR_STORE_DIR: str = str(BASE_DIR / "app" / "rag" / "index_storage")
    
    # Security
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "*"]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
