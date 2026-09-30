import os
from pathlib import Path
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from app.ml.features import SQLFeatureExtractor

# Training Dataset of Diverse SQL queries across LOW, MEDIUM, HIGH risk categories
DATASET = [
    # LOW Risk (0) - Standard safe SELECT queries with filters/limits/aggregations
    ("SELECT customer_id, first_name, email FROM customers WHERE city = 'Bangalore' LIMIT 10", 0),
    ("SELECT p.name, c.name AS category, p.price FROM products p JOIN categories c ON p.category_id = c.category_id WHERE p.price > 100", 0),
    ("SELECT c.city, SUM(o.total_amount) AS total_revenue FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.city ORDER BY total_revenue DESC LIMIT 5", 0),
    ("SELECT COUNT(*) AS total_orders FROM orders WHERE order_date >= '2026-01-01'", 0),
    ("SELECT p.name, SUM(oi.quantity) AS units_sold FROM products p JOIN order_items oi ON p.product_id = oi.product_id GROUP BY p.name ORDER BY units_sold DESC LIMIT 10", 0),
    ("SELECT AVG(total_amount) AS avg_order_value FROM orders WHERE status = 'Delivered'", 0),
    ("SELECT order_id, order_date, total_amount FROM orders WHERE customer_id = 42 ORDER BY order_date DESC LIMIT 20", 0),
    ("SELECT payment_method, COUNT(*) AS usage_count FROM payments GROUP BY payment_method", 0),
    ("SELECT customer_id, signup_date FROM customers WHERE loyalty_tier = 'Platinum' LIMIT 50", 0),
    ("SELECT category_id, COUNT(*) AS product_count FROM products GROUP BY category_id", 0),
    ("SELECT item_id, unit_price * quantity AS total FROM order_items WHERE order_id = 100", 0),
    ("SELECT * FROM categories", 0),
    ("SELECT DISTINCT country FROM customers", 0),
    ("SELECT order_id, total_amount FROM orders WHERE total_amount BETWEEN 500 AND 1000 LIMIT 15", 0),
    ("SELECT p.name, p.stock_quantity FROM products p WHERE p.stock_quantity < 20 ORDER BY p.stock_quantity ASC", 0),

    # MEDIUM Risk (1) - Complex multi-joins, unbounded SELECT *, large scans, deep subqueries
    ("SELECT * FROM orders", 1),
    ("SELECT * FROM order_items", 1),
    ("SELECT * FROM customers JOIN orders ON customers.customer_id = orders.customer_id JOIN order_items ON orders.order_id = order_items.order_id JOIN products ON order_items.product_id = products.product_id JOIN categories ON products.category_id = categories.category_id", 1),
    ("SELECT * FROM orders WHERE customer_id IN (SELECT customer_id FROM customers WHERE city IN (SELECT city FROM customers WHERE loyalty_tier = 'Gold'))", 1),
    ("SELECT c.*, (SELECT SUM(total_amount) FROM orders WHERE customer_id = c.customer_id) AS spending FROM customers c", 1),
    ("SELECT * FROM payments WHERE payment_method = 'UPI' OR payment_method = 'Credit Card' OR status = 'Refunded'", 1),
    ("SELECT o.*, p.*, c.* FROM orders o, payments p, customers c WHERE o.order_id = p.order_id", 1),
    ("SELECT p.name, (SELECT COUNT(*) FROM order_items WHERE product_id = p.product_id) AS cnt FROM products p ORDER BY cnt DESC", 1),
    ("SELECT * FROM customers WHERE signup_date < '2025-01-01' OR loyalty_tier != 'Bronze'", 1),
    ("SELECT o1.order_id, o2.order_id FROM orders o1 JOIN orders o2 ON o1.customer_id = o2.customer_id WHERE o1.order_id != o2.order_id", 1),

    # HIGH Risk (2) - Destructive modifications, DDL, table drops, massive updates/deletes, injections
    ("DROP TABLE customers", 2),
    ("DELETE FROM orders", 2),
    ("TRUNCATE TABLE payments", 2),
    ("ALTER TABLE products DROP COLUMN price", 2),
    ("DROP DATABASE sqlgenx_demo", 2),
    ("UPDATE customers SET email = 'hacked@evil.com'", 2),
    ("DELETE FROM customers WHERE customer_id = 1", 2),
    ("INSERT INTO categories (category_id, name) VALUES (99, 'Hacked')", 2),
    ("GRANT ALL PRIVILEGES ON *.* TO 'attacker'@'%'", 2),
    ("REVOKE ALL PRIVILEGES ON *.* FROM 'admin'", 2),
    ("CREATE TABLE backdoor (id INT, payload TEXT)", 2),
    ("UPDATE orders SET total_amount = 0 WHERE status = 'Processing'", 2),
    ("DROP TABLE IF EXISTS order_items", 2),
    ("EXEC sp_executesql N'SELECT * FROM customers'", 2),
    ("DELETE FROM payments WHERE amount < 100", 2)
]

def train_and_save_model(output_path: str = None) -> RandomForestClassifier:
    X = []
    y = []
    
    for sql, label in DATASET:
        feat = SQLFeatureExtractor.extract_features(sql)
        X.append(feat)
        y.append(label)
        
    X = np.array(X)
    y = np.array(y)
    
    model = RandomForestClassifier(
        n_estimators=100, 
        max_depth=5, 
        random_state=42, 
        class_weight="balanced"
    )
    model.fit(X, y)
    
    train_preds = model.predict(X)
    acc = accuracy_score(y, train_preds)
    
    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        joblib.dump(model, output_path)
        print(f"Trained SQL Risk Model with accuracy {acc*100:.2f}% and saved to {output_path}")
        
    return model

if __name__ == "__main__":
    train_and_save_model()
