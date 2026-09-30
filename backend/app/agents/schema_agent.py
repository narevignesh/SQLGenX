import logging
from typing import Dict, Any, List
from app.database.introspection import SchemaInspector
from app.rag.retriever import SchemaRetriever

logger = logging.getLogger(__name__)

class SchemaIntelligenceAgent:
    """Agent 1: Inspects DB metadata, extracts schema graph, and retrieves relevant tables & columns."""
    
    @staticmethod
    def analyze_schema_for_question(question: str) -> Dict[str, Any]:
        full_schema = SchemaInspector.get_full_schema()
        rag_context = SchemaRetriever.retrieve_context(question)
        
        actual_known_tables = {t["name"].lower(): t["name"] for t in full_schema.get("tables", [])}
        raw_relevant = rag_context.get("relevant_tables", [])
        
        # Keep only tables that truly exist in the connected database
        relevant_table_names = [actual_known_tables[t.lower()] for t in raw_relevant if t.lower() in actual_known_tables]
        
        if not relevant_table_names and full_schema.get("tables"):
            # Fallback: include all tables up to 6 from active DB
            relevant_table_names = [t["name"] for t in full_schema["tables"][:6]]
            
        filtered_tables = [t for t in full_schema.get("tables", []) if t["name"] in relevant_table_names]
        
        # Build prompt-friendly schema summary
        schema_prompt_lines = [f"Dialect: {full_schema.get('database_type', 'sqlite')}\n"]
        for t in filtered_tables:
            cols = ", ".join([f"{c['name']} ({c['type']}{' PK' if c.get('primary_key') else ''})" for c in t.get("columns", [])])
            schema_prompt_lines.append(f"Table '{t['name']}': [{cols}]")
            
        relevant_rels = []
        for rel in full_schema.get("relationships", []):
            if rel["from_table"] in relevant_table_names or rel["to_table"] in relevant_table_names:
                relevant_rels.append(rel["name"])
                schema_prompt_lines.append(f"Relationship: {rel['from_table']}.{rel['from_column']} = {rel['to_table']}.{rel['to_column']}")

        # Filter example queries to ensure tables exist
        valid_examples = []
        for ex in rag_context.get("example_queries", []):
            if all(t.lower() in actual_known_tables for t in ex.get("tables", [])):
                valid_examples.append(ex)

        return {
            "dialect": full_schema.get("database_type", "sqlite"),
            "relevant_tables": relevant_table_names,
            "table_details": filtered_tables,
            "relevant_relationships": relevant_rels,
            "example_queries": valid_examples,
            "prompt_formatted_schema": "\n".join(schema_prompt_lines)
        }

schema_agent = SchemaIntelligenceAgent()
