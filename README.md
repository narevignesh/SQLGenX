# SQLGenX: Agentic AI SQL Generation & Query Intelligence Platform

![SQLGenX Header](https://img.shields.io/badge/SQLGenX-Agentic%20AI-0284c7?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Scikit-Learn](https://img.shields.io/badge/Scikit_Learn-F7931E?style=for-the-badge&logo=scikit-learn)
![Groq](https://img.shields.io/badge/Groq_LLaMA_3.3-F05032?style=for-the-badge)

**SQLGenX** is an enterprise-grade **Agentic AI SQL Generation & Query Intelligence Platform** that converts natural-language questions into validated, safe, performant, and executable SQL queries. It features a visible multi-agent workflow, semantic schema RAG, machine learning risk classification, cost analysis with query execution plans, automated charts, and an empirical MLOps evaluation studio.

---

## Key Highlights & Architectural Innovations

1. **6-Stage Multi-Agent Architecture**:
   - **Schema Intelligence Agent**: Inspects database metadata, identifies primary/foreign keys, extracts relationships, and retrieves relevant tables using vector embeddings.
   - **SQL Generation Agent**: Translates natural language into structured relational SQL with dialect targeting (Groq LLaMA-3.3 70B, Gemini, OpenAI, or local semantic fallback).
   - **SQL Validation Agent**: Validates AST structure, cross-checks column and table existence against the live DB schema, ensures JOIN consistency, and flags aggregation issues.
   - **SQL Repair Agent**: Self-healing loop that catches syntax or schema errors and automatically repairs queries within a max retry threshold.
   - **SQL Optimization Agent**: Uses `EXPLAIN` query plan cost analysis, replaces non-SARGable date functions with indexed ranges, prunes redundant joins, and benchmarks performance cost reduction.
   - **Data Analyst Agent**: Grounded statistical analysis computing top contributors, percentages, anomalies, and dynamically choosing the optimal visualization chart (Bar, Line, Area, Pie, Scatter, KPI Card).

2. **Real ML SQL Risk Classification**:
   - Trained Scikit-Learn **Random Forest Classifier** extracting 12 structural/AST features (SELECT verbs, destructive keywords, wildcards, joins, subqueries, missing WHERE clauses, complexity score) categorizing queries into **LOW**, **MEDIUM**, or **HIGH** risk.
   - Guardrail automatically blocks mutating operations (`DROP`, `DELETE`, `TRUNCATE`, `ALTER`, `UPDATE`, `INSERT`) in read-only mode.

3. **Semantic Schema RAG Retrieval**:
   - Indexes tables, columns, foreign keys, documentation, and verified query patterns into vector storage for targeted context retrieval.

4. **1000+ Row Seeded E-Commerce Database**:
   - Includes a built-in realistic demo database with `customers`, `categories`, `products`, `orders`, `order_items`, and `payments` across diverse cities and historical dates.

5. **Empirical MLOps Evaluation Studio**:
   - Evaluates benchmark queries across Exact Match, Execution Accuracy, Schema Linking Score, Repair Success Rate, and Latency distributions.
   - Real side-by-side comparison across **LLM Only**, **LLM + RAG**, **LLM + RAG + Validator**, and **Full Agentic Pipeline**.

6. **Interactive AI Copilot Workspace**:
   - Real-time animated **Agent Workflow visualizer** with Server-Sent Events (SSE).
   - **Monaco SQL Editor** with formatting, copy, download, explain, optimize, and manual run.
   - Interactive **Result Table** with sorting, column search, and export to **CSV**, **JSON**, and **PDF Intelligence Report**.
   - **Schema ER Explorer** with interactive table cards and foreign key relation maps.
   - **Conversational Chat Mode** supporting multi-turn refinements (e.g., *"Now only show 2026"*).

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Framer Motion, Recharts, Monaco Editor (`@monaco-editor/react`) |
| **Backend** | Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy 2.0, SSE-Starlette, ReportLab, Sqlparse |
| **Machine Learning** | Scikit-Learn (Random Forest), NumPy, Pandas, Joblib |
| **Semantic RAG** | SentenceTransformers / TF-IDF Cosine Vector Store |
| **AI LLM Routing** | Groq (LLaMA-3.3 70B Versatile), Google Gemini 1.5 Flash, OpenAI GPT-4o, Local Semantic Agent |
| **Databases** | SQLite, PostgreSQL, MySQL (Read-Only Sandbox) |
| **DevOps** | Docker, Docker Compose |

---

## Directory Structure

```text
SQLGenX/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── schema_agent.py      # Schema Intelligence & RAG Linker
│   │   │   ├── sql_generator.py     # Multi-Provider SQL LLM Generator
│   │   │   ├── validator.py         # AST, Schema & Safety Validator
│   │   │   ├── repair_agent.py      # Self-Healing Auto-Repair Agent
│   │   │   ├── optimizer.py         # EXPLAIN Query Plan Cost Optimizer
│   │   │   ├── analyst.py           # Grounded Insights & Chart Selector
│   │   │   └── orchestrator.py      # SSE Streaming Pipeline Coordinator
│   │   ├── api/
│   │   │   ├── database.py          # Connect, Test, Seed Demo DB
│   │   │   ├── query.py             # Stream, Execute, Validate, Optimize
│   │   │   ├── schema.py            # ER Schema, DDL & Vector Search
│   │   │   ├── analytics.py         # Insights & PDF/CSV Report Export
│   │   │   ├── history.py           # Query History Storage
│   │   │   ├── experiments.py       # MLOps Benchmarks & Comparisons
│   │   │   └── health.py            # Health & Provider Status
│   │   ├── database/
│   │   │   ├── connection.py        # Database Connection Pool
│   │   │   ├── introspection.py     # Schema Inspector & Metadata Extractor
│   │   │   ├── executor.py          # Read-Only Execution Sandbox
│   │   │   └── seed_data.py         # 1000+ Row E-Commerce DB Generator
│   │   ├── ml/
│   │   │   ├── features.py          # SQL AST & Structural Feature Extraction
│   │   │   ├── risk_model.py        # Random Forest Model Wrapper
│   │   │   └── train.py             # Model Training Pipeline & Dataset
│   │   ├── rag/
│   │   │   ├── embeddings.py        # Vector Embedding Generator
│   │   │   ├── vector_store.py      # In-Memory Cosine Vector Store
│   │   │   ├── indexer.py           # Schema Vector Indexer
│   │   │   └── retriever.py         # Semantic Similarity Context Retriever
│   │   ├── evaluation/
│   │   │   ├── benchmark.py         # Standard Benchmark Dataset
│   │   │   └── metrics.py           # Exact Match, Execution & Latency Evaluator
│   │   ├── config.py                # Environment Configuration
│   │   └── main.py                  # FastAPI Application Entrypoint
│   ├── requirements.txt
│   └── test_backend.py              # Backend Verification Test Suite
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # Header with Model & DB Status
│   │   │   ├── Sidebar.tsx          # Navigation Bar
│   │   │   ├── AgentWorkflow.tsx    # Live Real-Time Agent Execution Graph
│   │   │   ├── SqlEditor.tsx        # Monaco SQL Editor with Controls
│   │   │   ├── ResultTable.tsx      # Data Table with Sort, Filter & PDF Export
│   │   │   ├── ChartRenderer.tsx    # Dynamic Recharts Engine (Bar/Line/Pie/etc)
│   │   │   ├── InsightPanel.tsx     # Grounded AI Insights & Query Steps
│   │   │   ├── RiskBadge.tsx        # ML Risk Indicator with Explanations
│   │   │   ├── OptimizationPanel.tsx# Cost & SQL Diff Comparison
│   │   │   └── ConversationChat.tsx # Multi-Turn Follow-Up Query Refinement
│   │   ├── pages/
│   │   │   ├── Landing.tsx          # Animated Overview & Quick Sandbox
│   │   │   ├── QueryWorkspace.tsx   # AI Analyst Flagship Workspace
│   │   │   ├── SchemaExplorer.tsx   # Visual ER Schema & RAG Search
│   │   │   ├── Databases.tsx        # Multi-DB Connection & 1-Click Seeder
│   │   │   ├── QueryHistory.tsx     # Query History & Audit Trail
│   │   │   ├── MLOps.tsx            # MLOps Studio & Benchmark Runner
│   │   │   └── Settings.tsx         # API Keys & Guardrail Thresholds
│   │   ├── services/api.ts          # Typed REST & SSE API Client
│   │   ├── types/index.ts           # TypeScript Domain Definitions
│   │   ├── App.tsx                  # Root Application Layout
│   │   └── main.tsx                 # DOM Entrypoint
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python test_backend.py
python app/main.py
```
The backend API and Swagger docs will be available at `http://localhost:8000/docs`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Running with Docker Compose

```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## Example Queries to Try

- `"Show the top 5 customers by total spending"`
- `"Which city generated the highest revenue?"`
- `"Show monthly revenue for 2026"`
- `"What are the top 10 products by revenue?"`
- `"Find customers who haven't purchased in the last 90 days"`
- `"Which category has the highest average order value?"`
- Follow-up query: `"Now filter only for orders above $500"`

---

## Security & Read-Only Protection

SQLGenX enforces strict read-only execution:
- Modifying SQL commands (`DROP`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `UPDATE`, `INSERT`, `GRANT`, `REVOKE`) are blocked before hitting the database engine.
- Machine Learning Risk Classifier assigns a confidence score to each query. High-risk or destructive patterns trigger a security block.
- Row limits (default 500) and query timeouts (default 15s) protect against resource exhaustion.
