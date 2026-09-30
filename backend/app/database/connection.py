import logging
from typing import Optional, Dict, Any

try:
    import pymysql
    pymysql.install_as_MySQLdb()
except Exception:
    pass

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine import Engine
from app.config import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    _instance = None
    
    def __init__(self):
        self.active_engine: Optional[Engine] = None
        self.current_db_type: str = "sqlite"
        self.current_url: str = settings.DATABASE_URL
        self._init_default_db()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = DatabaseManager()
        return cls._instance

    def _init_default_db(self):
        try:
            if "sqlite" in self.current_url:
                self.active_engine = create_engine(
                    self.current_url, 
                    connect_args={"check_same_thread": False}
                )
                self.current_db_type = "sqlite"
            else:
                self.active_engine = create_engine(self.current_url, pool_pre_ping=True)
                if "postgres" in self.current_url:
                    self.current_db_type = "postgresql"
                elif "mysql" in self.current_url:
                    self.current_db_type = "mysql"
            logger.info(f"Initialized active database engine: {self.current_db_type}")
        except Exception as e:
            logger.error(f"Failed to initialize default database: {e}")

    def test_connection(self, db_type: str, host: str = "", port: int = 0, 
                        database_name: str = "", username: str = "", password: str = "", 
                        ssl: bool = False, sqlite_path: str = "") -> Dict[str, Any]:
        try:
            url = self.build_connection_url(db_type, host, port, database_name, username, password, ssl, sqlite_path)
            temp_engine = create_engine(url, connect_args={"check_same_thread": False} if db_type == "sqlite" else {})
            with temp_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return {
                "success": True, 
                "message": f"Successfully connected to {db_type.upper()} database!",
                "database_name": database_name or sqlite_path or "demo.db"
            }
        except ModuleNotFoundError as mne:
            driver_name = str(mne).replace("No module named ", "").replace("'", "")
            return {
                "success": False, 
                "message": f"Database driver '{driver_name}' is not installed in Python environment. Install with: pip install {driver_name}"
            }
        except Exception as e:
            err_str = str(e)
            if "No module named 'pymysql'" in err_str or "No module named pymysql" in err_str:
                return {
                    "success": False,
                    "message": "MySQL Python driver 'pymysql' is missing. Please run 'pip install pymysql' to connect to remote MySQL databases."
                }
            if "No module named 'psycopg2'" in err_str or "No module named psycopg2" in err_str:
                return {
                    "success": False,
                    "message": "PostgreSQL driver 'psycopg2' is missing. Please run 'pip install psycopg2-binary' to connect to remote PostgreSQL databases."
                }
            if "10061" in err_str or "refused" in err_str.lower():
                return {
                    "success": False,
                    "message": f"Connection refused to {db_type.upper()} at {host}:{port}. Is the database server running? (If you don't have a local server, switch to SQLite to use the preloaded demo database)."
                }
            if "Access denied" in err_str or "password" in err_str.lower():
                return {
                    "success": False,
                    "message": f"Authentication failed for user '{username}'. Please verify your database username and password."
                }
            return {"success": False, "message": err_str}

    def connect(self, db_type: str, host: str = "", port: int = 0, 
                database_name: str = "", username: str = "", password: str = "", 
                ssl: bool = False, sqlite_path: str = "") -> Dict[str, Any]:
        try:
            url = self.build_connection_url(db_type, host, port, database_name, username, password, ssl, sqlite_path)
            new_engine = create_engine(url, connect_args={"check_same_thread": False} if db_type == "sqlite" else {}, pool_pre_ping=True)
            with new_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            # Dispose old engine if any
            if self.active_engine:
                self.active_engine.dispose()
                
            self.active_engine = new_engine
            self.current_db_type = db_type
            self.current_url = url
            return {
                "success": True, 
                "message": f"Connected to {db_type.upper()} database successfully.",
                "db_type": db_type,
                "database_name": database_name or sqlite_path or "sqlgenx_demo.db"
            }
        except ModuleNotFoundError as mne:
            driver_name = str(mne).replace("No module named ", "").replace("'", "")
            return {
                "success": False, 
                "message": f"Database driver '{driver_name}' is not installed. Run: pip install {driver_name}"
            }
        except Exception as e:
            err_str = str(e)
            if "No module named 'pymysql'" in err_str or "No module named pymysql" in err_str:
                return {"success": False, "message": "Missing MySQL driver. Run: pip install pymysql"}
            if "No module named 'psycopg2'" in err_str or "No module named psycopg2" in err_str:
                return {"success": False, "message": "Missing PostgreSQL driver. Run: pip install psycopg2-binary"}
            if "10061" in err_str or "refused" in err_str.lower():
                return {"success": False, "message": f"Connection refused to {db_type.upper()} at {host}:{port}. Is the database service running?"}
            if "Access denied" in err_str or "password" in err_str.lower():
                return {"success": False, "message": f"Authentication failed for user '{username}'."}
            return {"success": False, "message": f"Connection failed: {err_str}"}

    @staticmethod
    def build_connection_url(db_type: str, host: str = "", port: int = 0, 
                             database_name: str = "", username: str = "", password: str = "", 
                             ssl: bool = False, sqlite_path: str = "") -> str:
        import urllib.parse
        db_type = db_type.lower().strip()
        encoded_user = urllib.parse.quote_plus(username.strip()) if username else ""
        encoded_pass = urllib.parse.quote_plus(password.strip()) if password else ""
        clean_host = host.strip() if host else "localhost"
        clean_db = database_name.strip() if database_name else ""
        
        if db_type == "sqlite":
            path = sqlite_path or f"{settings.BASE_DIR}/sqlgenx_demo.db"
            return f"sqlite:///{path}"
        elif db_type in ("postgresql", "postgres"):
            port = port or 5432
            ssl_param = "?sslmode=require" if ssl else ""
            cred = f"{encoded_user}:{encoded_pass}@" if encoded_user or encoded_pass else ""
            return f"postgresql+psycopg2://{cred}{clean_host}:{port}/{clean_db}{ssl_param}"
        elif db_type == "mysql":
            port = port or 3306
            ssl_param = "?ssl_mode=REQUIRED" if ssl else ""
            cred = f"{encoded_user}:{encoded_pass}@" if encoded_user or encoded_pass else ""
            return f"mysql+pymysql://{cred}{clean_host}:{port}/{clean_db}{ssl_param}"
        else:
            raise ValueError(f"Unsupported database type: {db_type}")

    def get_engine(self) -> Engine:
        if not self.active_engine:
            self._init_default_db()
        return self.active_engine

db_manager = DatabaseManager.get_instance()
