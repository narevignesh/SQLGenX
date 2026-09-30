from typing import List, Dict, Any

BENCHMARK_DATASET: List[Dict[str, Any]] = [
    {
        "id": "bench_01",
        "category": "Aggregation & Sorting",
        "difficulty": "Easy",
        "question": "Show the top 5 customers by total spending",
        "reference_sql": "SELECT c.customer_id, c.first_name, c.last_name, SUM(o.total_amount) AS total_spending FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.first_name, c.last_name ORDER BY total_spending DESC LIMIT 5;",
        "expected_tables": ["customers", "orders"]
    },
    {
        "id": "bench_02",
        "category": "Geographic Analytics",
        "difficulty": "Easy",
        "question": "Which city generated the highest revenue?",
        "reference_sql": "SELECT c.city, SUM(o.total_amount) AS total_revenue FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.city ORDER BY total_revenue DESC LIMIT 1;",
        "expected_tables": ["customers", "orders"]
    },
    {
        "id": "bench_03",
        "category": "Time-Series & Date",
        "difficulty": "Medium",
        "question": "Show monthly revenue for 2026",
        "reference_sql": "SELECT strftime('%Y-%m', order_date) AS month, SUM(total_amount) AS monthly_revenue FROM orders WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01' GROUP BY month ORDER BY month ASC;",
        "expected_tables": ["orders"]
    },
    {
        "id": "bench_04",
        "category": "Multi-Table Join",
        "difficulty": "Medium",
        "question": "What are the top 10 products by revenue?",
        "reference_sql": "SELECT p.product_id, p.name, SUM(oi.total_price) AS total_revenue FROM products p JOIN order_items oi ON p.product_id = oi.product_id GROUP BY p.product_id, p.name ORDER BY total_revenue DESC LIMIT 10;",
        "expected_tables": ["products", "order_items"]
    },
    {
        "id": "bench_05",
        "category": "Complex Multi-Join Aggregation",
        "difficulty": "Hard",
        "question": "Which category has the highest average order value?",
        "reference_sql": "SELECT cat.name AS category_name, AVG(o.total_amount) AS avg_order_value FROM categories cat JOIN products p ON cat.category_id = p.category_id JOIN order_items oi ON p.product_id = oi.product_id JOIN orders o ON oi.order_id = o.order_id GROUP BY cat.name ORDER BY avg_order_value DESC LIMIT 1;",
        "expected_tables": ["categories", "products", "order_items", "orders"]
    },
    {
        "id": "bench_06",
        "category": "Payment Analysis",
        "difficulty": "Easy",
        "question": "What is the total revenue by payment method?",
        "reference_sql": "SELECT payment_method, SUM(amount) AS total_volume FROM payments GROUP BY payment_method ORDER BY total_volume DESC;",
        "expected_tables": ["payments"]
    },
    {
        "id": "bench_07",
        "category": "Customer Segmentation",
        "difficulty": "Medium",
        "question": "Find customers who have not purchased in the last 90 days",
        "reference_sql": "SELECT c.customer_id, c.first_name, c.last_name, MAX(o.order_date) AS last_order_date FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.first_name, c.last_name HAVING MAX(o.order_date) < date('now', '-90 days') OR MAX(o.order_date) IS NULL LIMIT 20;",
        "expected_tables": ["customers", "orders"]
    },
    {
        "id": "bench_08",
        "category": "Inventory Intelligence",
        "difficulty": "Easy",
        "question": "List active products with stock quantity below 50",
        "reference_sql": "SELECT product_id, name, stock_quantity, price FROM products WHERE stock_quantity < 50 AND status = 'Active' ORDER BY stock_quantity ASC;",
        "expected_tables": ["products"]
    }
]
