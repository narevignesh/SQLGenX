import logging
from typing import Dict, Any, List
from sqlalchemy import inspect, text
from app.database.connection import db_manager

logger = logging.getLogger(__name__)

class SchemaInspector:
    @staticmethod
    def get_full_schema() -> Dict[str, Any]:
        engine = db_manager.get_engine()
        inspector = inspect(engine)
        tables_data = []
        relationships = []
        
        table_names = inspector.get_table_names()
        
        for table_name in table_names:
            columns_data = []
            pk_constraint = inspector.get_pk_constraint(table_name)
            pk_cols = pk_constraint.get("constrained_columns", []) if pk_constraint else []
            
            for col in inspector.get_columns(table_name):
                col_name = col["name"]
                col_type = str(col["type"])
                is_pk = col_name in pk_cols
                columns_data.append({
                    "name": col_name,
                    "type": col_type,
                    "nullable": col.get("nullable", True),
                    "primary_key": is_pk,
                    "default": str(col.get("default", "")) if col.get("default") is not None else None
                })
            
            # Foreign keys
            fks = inspector.get_foreign_keys(table_name)
            for fk in fks:
                referred_table = fk.get("referred_table")
                constrained_cols = fk.get("constrained_columns", [])
                referred_cols = fk.get("referred_columns", [])
                
                if referred_table and constrained_cols and referred_cols:
                    rel_info = {
                        "from_table": table_name,
                        "from_column": constrained_cols[0],
                        "to_table": referred_table,
                        "to_column": referred_cols[0],
                        "name": f"{table_name}.{constrained_cols[0]} -> {referred_table}.{referred_cols[0]}"
                    }
                    relationships.append(rel_info)

            # Get row count
            row_count = 0
            try:
                with engine.connect() as conn:
                    res = conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"' if db_manager.current_db_type != "mysql" else f'SELECT COUNT(*) FROM `{table_name}`'))
                    row_count = res.scalar() or 0
            except Exception as e:
                logger.warning(f"Could not fetch row count for {table_name}: {e}")

            tables_data.append({
                "name": table_name,
                "columns": columns_data,
                "primary_keys": pk_cols,
                "foreign_keys": fks,
                "row_count": row_count,
                "description": f"Table storing {table_name.replace('_', ' ')} records."
            })
            
        return {
            "database_type": db_manager.current_db_type,
            "tables": tables_data,
            "relationships": relationships,
            "total_tables": len(tables_data)
        }

    @staticmethod
    def get_ddl_summary() -> str:
        schema = SchemaInspector.get_full_schema()
        lines = [f"-- Database Dialect: {schema['database_type']}\n"]
        for table in schema["tables"]:
            lines.append(f"CREATE TABLE {table['name']} (")
            col_defs = []
            for col in table["columns"]:
                pk_str = " PRIMARY KEY" if col["primary_key"] else ""
                null_str = " NOT NULL" if not col["nullable"] else ""
                col_defs.append(f"    {col['name']} {col['type']}{pk_str}{null_str}")
            lines.append(",\n".join(col_defs))
            lines.append(");\n")
            
        if schema["relationships"]:
            lines.append("-- Foreign Key Relationships:")
            for rel in schema["relationships"]:
                lines.append(f"-- {rel['from_table']}({rel['from_column']}) REFERENCES {rel['to_table']}({rel['to_column']})")
        return "\n".join(lines)
