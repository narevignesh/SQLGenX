import logging
from typing import Dict, Any, List
from app.rag.embeddings import embedding_service
from app.rag.vector_store import schema_vector_store
from app.rag.indexer import SchemaIndexer

logger = logging.getLogger(__name__)

class SchemaRetriever:
    @staticmethod
    def retrieve_context(question: str, top_k: int = 6) -> Dict[str, Any]:
        if len(schema_vector_store.documents) == 0:
            SchemaIndexer.index_schema()
            
        q_vec = embedding_service.get_embedding(question)
        hits = schema_vector_store.similarity_search(q_vec, top_k=top_k * 2)
        
        relevant_tables = set()
        table_docs = []
        column_docs = []
        relationships = []
        examples = []
        
        for hit in hits:
            doc_type = hit.get("type")
            if doc_type == "table":
                relevant_tables.add(hit["name"])
                table_docs.append(hit)
            elif doc_type == "column":
                relevant_tables.add(hit["table"])
                column_docs.append(hit)
            elif doc_type == "relationship":
                relationships.append(hit)
                rel_info = hit.get("details", {})
                if "from_table" in rel_info:
                    relevant_tables.add(rel_info["from_table"])
                if "to_table" in rel_info:
                    relevant_tables.add(rel_info["to_table"])
            elif doc_type == "example_query":
                examples.append({
                    "question": hit["question"],
                    "sql": hit["sql"],
                    "similarity": hit.get("similarity_score", 0.0)
                })
                for t in hit.get("tables", []):
                    relevant_tables.add(t)

        return {
            "relevant_tables": list(relevant_tables)[:5],
            "table_matches": table_docs[:4],
            "column_matches": column_docs[:6],
            "relationship_matches": relationships[:3],
            "example_queries": examples[:2]
        }
