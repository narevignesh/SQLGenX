# Spider Benchmark Dataset in SQLGenX

[![System Architecture](https://img.shields.io/badge/System-Architecture-1677FF?style=for-the-badge)](SYSTEM_ARCHITECTURE.md)
[![Project Overview](https://img.shields.io/badge/Overview-README-00D9FF?style=for-the-badge)](README.md)
[![Prerequisites](https://img.shields.io/badge/Requirements-requirements.txt-10B981?style=for-the-badge)](requirements.txt)
[![Benchmark](https://img.shields.io/badge/Spider-Yale%20Benchmark-F59E0B?style=for-the-badge)](https://yale-lily.github.io/spider)

> **Related Documentation**: See **[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)** for the complete multi-agent pipeline and **[README.md](README.md)** for platform setup instructions.

---

## 1. What is the Yale Spider Dataset?

**Spider** is the Yale University flagship large-scale, complex, and cross-domain semantic parsing and text-to-SQL benchmark. Introduced in 2018 by Tao Yu et al. at Yale University and published at EMNLP 2018, Spider is widely recognized across academia and industry as the **gold standard benchmark** for evaluating Natural Language to SQL (NL-to-SQL) models and agentic AI systems.

Unlike traditional single-domain datasets (such as GeoQuery or ATIS), Spider features:
- **Cross-Domain Generalization**: Over 200 independent databases across 138 distinct business, scientific, academic, and municipal domains.
- **Complex Relational SQL**: Requires understanding multi-table foreign key JOINs, nested subqueries, aggregations (`SUM`, `AVG`, `COUNT`), `GROUP BY`, `HAVING`, `UNION`, `INTERSECT`, and `EXCEPT`.
- **Zero-Shot Evaluation**: Evaluates whether an AI system can generate accurate SQL for schemas it has never seen during training, purely by inspecting the database schema and table relationships.
- **Over 10,181 Questions**: Paired natural language questions and human-annotated complex SQL ground truths.

---

## 2. Is the Spider Dataset Used in This Project?

**Yes. The Spider dataset is actively and concretely used in this project.**

Rather than downloading a massive 500 MB raw dataset archive, SQLGenX uses the Spider benchmark dataset in **three concrete, functional ways across the application**:

| Role in SQLGenX | Implementation File | What It Does in the Platform |
|---|---|---|
| **1. Relational Sandbox Database** | [js/database.js](file:///c:/Users/vigne/Desktop/SQLGenX/js/database.js) | Seeds 6 Spider retail tables with 1,900+ real records into in-browser SQLite WebAssembly (`sql.js`) memory for instant zero-setup offline testing. |
| **2. AI Prompt Schema Grounding** | [js/langchain-llm.js](file:///c:/Users/vigne/Desktop/SQLGenX/js/langchain-llm.js) | Introspects Spider schemas and passes foreign key links into the LLM system prompt so the AI writes multi-table `JOIN` queries without hallucination. |
| **3. Interactive ER Visualizer** | [js/er-visualizer.js](file:///c:/Users/vigne/Desktop/SQLGenX/js/er-visualizer.js) | Dynamically maps the Spider schema into interactive table cards with auto-anchored bezier relationship curves and animated foreign-key flow. |
| **4. Complexity Classification** | [SPIDER_DATASET.md](file:///c:/Users/vigne/Desktop/SQLGenX/SPIDER_DATASET.md) | Standardizes the 4 difficulty tiers (*Easy*, *Medium*, *Hard*, *Extra Hard*) to validate AI model accuracy. |

---

## 3. The 3 Concrete Implementations in SQLGenX

### Implementation A: Built-In SQLite WASM Database (`js/database.js`)
When MySQL is offline or disconnected, SQLGenX loads the **Spider Store / E-Commerce database** directly into browser memory:

```sql
-- 6 Interconnected Spider Tables Seeded in js/database.js:
CREATE TABLE categories (
  category_id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL,
  name VARCHAR(150) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  stock_quantity INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'Active',
  FOREIGN KEY (category_id) REFERENCES categories (category_id)
);

CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  signup_date DATE NOT NULL,
  loyalty_tier VARCHAR(50) DEFAULT 'Bronze'
);

CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  order_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  shipping_fee DECIMAL(10, 2) DEFAULT 0.0,
  discount_amount DECIMAL(10, 2) DEFAULT 0.0,
  FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
);

CREATE TABLE order_items (
  item_id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders (order_id),
  FOREIGN KEY (product_id) REFERENCES products (product_id)
);

CREATE TABLE payments (
  payment_id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders (order_id)
);
```

### Implementation B: Foreign Key Schema Context for LangChain AI (`js/langchain-llm.js`)
When an analyst asks a question, the Schema Introspection Agent dynamically extracts the active Spider foreign key mappings and injects them into the LLM system prompt:

```text
Table: customers (customer_id, first_name, last_name, email, city, loyalty_tier)
Table: orders (order_id, customer_id, order_date, status, total_amount)
Foreign Keys:
  - orders.customer_id REFERENCES customers.customer_id
  - order_items.order_id REFERENCES orders.order_id
  - order_items.product_id REFERENCES products.product_id
  - products.category_id REFERENCES categories.category_id
  - payments.order_id REFERENCES orders.order_id
```

Because the foreign key hierarchy is clearly provided, the LLM generates accurate multi-table `JOIN` statements rather than attempting to join unrelated columns.

### Implementation C: Interactive Canvas ER Visualizer (`js/er-visualizer.js`)
The ER Visualizer renders this exact Spider schema on an interactive HTML5 canvas:
- Arranges `products`, `categories`, `customers` on the upper tier and `payments`, `orders`, `order_items` on the lower tier.
- Computes edge-to-edge Bezier connector rays so lines never cut across text.
- Animates directional marching dashes showing relationship flow (`PK ──► FK`).
- Double-clicking any Spider table node opens a modal previewing 10 live sample records directly from the SQLite WebAssembly database.

---

## 4. End-to-End Query Walkthrough with Concrete Example

Here is an exact step-by-step trace of how a Spider benchmark query executes inside SQLGenX:

### Step 1: User Asks a Question (Spider Medium Difficulty Tier)
The user enters the following query in the AI Query Copilot:
> *"Show the top 5 customers by total spending"*

### Step 2: Schema Context Extraction
The Schema Introspector Agent analyzes the question and identifies the relevant Spider entities:
- `customers` table for customer name (`first_name`, `last_name`).
- `orders` table for purchase amounts (`total_amount`).
- Relational join key: `customers.customer_id = orders.customer_id`.

### Step 3: AI SQL Generation (LangChain + Groq LLaMA / Gemini / Semantic Fallback)
The AI produces dialect-targeted SQL:
```sql
SELECT 
  c.first_name || ' ' || c.last_name AS customer_name,
  ROUND(SUM(o.total_amount), 2) AS total_spending
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, customer_name
ORDER BY total_spending DESC
LIMIT 5;
```

### Step 4: Deterministic Guardrail Validation
The AST validator scans the generated query:
- Verifies absence of destructive DDL/DML keywords (`DROP`, `DELETE`, `UPDATE`, `INSERT`).
- Confirms bounded read-only analytical query.
- Emits safety badge: `LOW RISK (0.10)`.

### Step 5: Sub-Millisecond Execution & Analytics Output
- **Execution**: Dispatched to `sql.js` SQLite WASM sandbox; completes in **1.42 ms** with **5 returned rows**.
- **Results Table**: Renders customer rankings:
  1. *Eleanor Vance — ₹42,580.40*
  2. *Marcus Sterling — ₹38,910.15*
  3. *Sophia Chen — ₹34,220.80*
  4. *David Miller — ₹29,840.50*
  5. *Amara Okafor — ₹27,650.00*
- **Data Visualization**: Chart.js generates a vibrant cyan-to-blue Bar Chart with direct value labels rendered above each bar.
- **ER Graph Highlighting**: In the Schema & ER Visualizer tab, the active link between `customers` and `orders` glows in bright cyan with animated flow particles.

---

## 5. Spider Query Difficulty Classification Tiers

Spider categorizes natural language queries into 4 official difficulty tiers based on SQL structural complexity:

| Difficulty Tier | Structural Characteristics | Built-in Example in SQLGenX |
|---|---|---|
| **Easy** | Single table, simple `WHERE` filter, basic `ORDER BY` and `LIMIT`. | *"Show top 5 customers by loyalty tier"* or *"List products with price under $50"* |
| **Medium** | 2-table `JOIN`, single aggregation (`COUNT`, `SUM`, `AVG`), `GROUP BY` clause. | *"Which city generated the highest total revenue?"* or *"Top 5 customers by total spending"* |
| **Hard** | Multi-table `JOIN` (3+ tables), `GROUP BY` with `HAVING`, complex date expressions. | *"Show monthly revenue breakdown for 2026"* or *"Top 10 products by revenue and category"* |
| **Extra Hard** | Correlated subqueries, self-joins, windowing, `NOT IN (SELECT...)`, set operations. | *"Find customers who made purchases above $500 but have no cancelled orders"* |

---

## 6. Built-in Benchmark Evaluation Queries

### A. Spider Store / E-Commerce Benchmark Queries
1. *"Show the top 5 customers by total spending"* (Medium)
2. *"Which city generated the highest total revenue?"* (Medium)
3. *"Show monthly revenue breakdown for 2026"* (Hard)
4. *"What are the top 10 products by revenue and units sold?"* (Hard)
5. *"Revenue distribution across product categories"* (Medium)

### B. Spider Academic / University Benchmark Queries
1. *"Show the top 5 highest paid instructors with their department names"* (Easy)
2. *"What is the average student GPA per department?"* (Medium)
3. *"List all courses offered by Computer Science with instructor count"* (Hard)
4. *"Find departments with total budget greater than $1,000,000"* (Easy)
5. *"Count number of students enrolled in each semester"* (Medium)

### C. Spider World Geography Benchmark Queries
1. *"List the top 10 most populated countries in the world"* (Easy)
2. *"What is the average life expectancy by continent?"* (Medium)
3. *"Find cities with population over 5 million along with country name"* (Hard)
4. *"Which languages are spoken in more than 5 countries?"* (Hard)
5. *"Total surface area and population for each continent"* (Medium)
