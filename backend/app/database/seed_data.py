import random
import datetime
from sqlalchemy import create_engine, text
from app.database.connection import db_manager
import logging

logger = logging.getLogger(__name__)

CITIES = ["Bangalore", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune", "Kolkata", "Seattle", "Austin", "San Francisco"]
STATES = ["Karnataka", "Maharashtra", "Delhi", "Telangana", "Tamil Nadu", "Maharashtra", "West Bengal", "Washington", "Texas", "California"]
COUNTRIES = ["India", "India", "India", "India", "India", "India", "India", "USA", "USA", "USA"]
TIERS = ["Bronze", "Silver", "Gold", "Platinum"]
PAYMENT_METHODS = ["Credit Card", "UPI", "Net Banking", "Debit Card", "PayPal"]
ORDER_STATUSES = ["Delivered", "Delivered", "Delivered", "Delivered", "Shipped", "Processing", "Cancelled"]

def seed_ecommerce_database():
    engine = db_manager.get_engine()
    logger.info("Starting e-commerce database seeding...")
    
    with engine.begin() as conn:
        # Drop existing tables
        conn.execute(text("DROP TABLE IF EXISTS payments"))
        conn.execute(text("DROP TABLE IF EXISTS order_items"))
        conn.execute(text("DROP TABLE IF EXISTS orders"))
        conn.execute(text("DROP TABLE IF EXISTS products"))
        conn.execute(text("DROP TABLE IF EXISTS categories"))
        conn.execute(text("DROP TABLE IF EXISTS customers"))
        
        # Create categories
        conn.execute(text("""
            CREATE TABLE categories (
                category_id INTEGER PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT
            )
        """))
        
        # Create products
        conn.execute(text("""
            CREATE TABLE products (
                product_id INTEGER PRIMARY KEY,
                category_id INTEGER NOT NULL,
                name VARCHAR(150) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                cost DECIMAL(10, 2) NOT NULL,
                stock_quantity INTEGER NOT NULL,
                status VARCHAR(50) DEFAULT 'Active',
                FOREIGN KEY (category_id) REFERENCES categories (category_id)
            )
        """))
        
        # Create customers
        conn.execute(text("""
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
            )
        """))
        
        # Create orders
        conn.execute(text("""
            CREATE TABLE orders (
                order_id INTEGER PRIMARY KEY,
                customer_id INTEGER NOT NULL,
                order_date DATE NOT NULL,
                status VARCHAR(50) NOT NULL,
                total_amount DECIMAL(10, 2) NOT NULL,
                shipping_fee DECIMAL(10, 2) DEFAULT 0.0,
                discount_amount DECIMAL(10, 2) DEFAULT 0.0,
                FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
            )
        """))
        
        # Create order_items
        conn.execute(text("""
            CREATE TABLE order_items (
                item_id INTEGER PRIMARY KEY,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10, 2) NOT NULL,
                total_price DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders (order_id),
                FOREIGN KEY (product_id) REFERENCES products (product_id)
            )
        """))
        
        # Create payments
        conn.execute(text("""
            CREATE TABLE payments (
                payment_id INTEGER PRIMARY KEY,
                order_id INTEGER NOT NULL,
                payment_date DATE NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                status VARCHAR(50) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders (order_id)
            )
        """))

        # Insert Categories
        categories_data = [
            (1, "Electronics", "Gadgets, computing, audio and mobile devices"),
            (2, "Apparel", "Men and women fashion, clothing, and footwear"),
            (3, "Home & Kitchen", "Appliances, cookware, and home furniture"),
            (4, "Books & Stationery", "Novels, technical books, notebooks, and office supplies"),
            (5, "Fitness & Outdoors", "Sports gear, gym equipment, and outdoor apparel")
        ]
        for c in categories_data:
            conn.execute(text("INSERT INTO categories VALUES (:id, :name, :desc)"), {"id": c[0], "name": c[1], "desc": c[2]})
            
        # Insert Products
        products_data = [
            # Electronics
            (1, 1, "Pro Ultra Laptop 16-inch", 1499.99, 1100.00, 45, "Active"),
            (2, 1, "Wireless Noise-Canceling Headphones", 249.99, 120.00, 120, "Active"),
            (3, 1, "4K Ultra HD Smart Monitor 32-inch", 499.99, 320.00, 60, "Active"),
            (4, 1, "Mechanical Gaming Keyboard RGB", 129.99, 65.00, 150, "Active"),
            (5, 1, "Ergonomic Wireless Mouse", 69.99, 30.00, 200, "Active"),
            (6, 1, "Smart Fitness Watch Gen 4", 199.99, 95.00, 85, "Active"),
            # Apparel
            (7, 2, "Premium Cotton Crewneck T-Shirt", 29.99, 10.00, 500, "Active"),
            (8, 2, "Slim-Fit Stretch Denim Jeans", 79.99, 32.00, 320, "Active"),
            (9, 2, "Waterproof Windbreaker Jacket", 119.99, 50.00, 110, "Active"),
            (10, 2, "Breathable Running Sneakers", 89.99, 38.00, 240, "Active"),
            # Home & Kitchen
            (11, 3, "Smart Programmable Coffee Maker", 89.99, 42.00, 75, "Active"),
            (12, 3, "Cast Iron Dutch Oven 6 Qt", 74.99, 35.00, 90, "Active"),
            (13, 3, "Robot Vacuum Cleaner with LiDAR", 349.99, 210.00, 40, "Active"),
            (14, 3, "High-Speed Countertop Blender", 99.99, 45.00, 65, "Active"),
            # Books & Stationery
            (15, 4, "Designing Data-Intensive Applications", 49.99, 22.00, 180, "Active"),
            (16, 4, "Artificial Intelligence: Modern Approach", 84.99, 40.00, 95, "Active"),
            (17, 4, "Premium Dotted Hardcover Journal", 18.99, 6.00, 400, "Active"),
            # Fitness
            (18, 5, "Adjustable Dumbbell Set (5-50 lbs)", 299.99, 160.00, 50, "Active"),
            (19, 5, "Non-Slip High Density Yoga Mat", 34.99, 12.00, 220, "Active"),
            (20, 5, "Insulated Stainless Steel Bottle 32oz", 24.99, 8.00, 350, "Active")
        ]
        for p in products_data:
            conn.execute(text("INSERT INTO products VALUES (:id, :cat_id, :name, :price, :cost, :stock, :status)"), {
                "id": p[0], "cat_id": p[1], "name": p[2], "price": p[3], "cost": p[4], "stock": p[5], "status": p[6]
            })

        # Insert 150 Customers
        first_names = ["Aarav", "Aditi", "Rohan", "Priya", "Vikram", "Ananya", "Rahul", "Sneha", "Karthik", "Pooja",
                       "John", "Sarah", "Michael", "Emily", "David", "Jessica", "James", "Emma", "Robert", "Olivia"]
        last_names = ["Sharma", "Verma", "Patel", "Reddy", "Iyer", "Nair", "Mehta", "Singh", "Gupta", "Rao",
                      "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Anderson", "Taylor"]
        
        customers = []
        random.seed(42)
        base_date = datetime.date(2024, 1, 1)
        for i in range(1, 151):
            fn = random.choice(first_names)
            ln = random.choice(last_names)
            email = f"{fn.lower()}.{ln.lower()}{i}@example.com"
            idx = random.randint(0, len(CITIES) - 1)
            city = CITIES[idx]
            state = STATES[idx]
            country = COUNTRIES[idx]
            days_offset = random.randint(0, 700)
            signup = base_date + datetime.timedelta(days=days_offset)
            tier = random.choices(TIERS, weights=[50, 30, 15, 5])[0]
            customers.append((i, fn, ln, email, city, state, country, signup, tier))
            conn.execute(text("INSERT INTO customers VALUES (:id, :fn, :ln, :email, :city, :state, :country, :signup, :tier)"), {
                "id": i, "fn": fn, "ln": ln, "email": email, "city": city, "state": state, "country": country, "signup": signup, "tier": tier
            })

        # Insert 450 Orders and 1100+ Order Items
        order_item_id = 1
        payment_id = 1
        
        for order_id in range(1, 451):
            cust_id = random.randint(1, 150)
            order_days = random.randint(30, 950)
            order_date = base_date + datetime.timedelta(days=order_days)
            # ensure order_date does not exceed current year (2026)
            if order_date > datetime.date(2026, 9, 20):
                order_date = datetime.date(2026, random.randint(1, 9), random.randint(1, 20))
                
            status = random.choice(ORDER_STATUSES)
            shipping_fee = 0.0 if random.random() > 0.4 else 15.0
            discount = 0.0 if random.random() > 0.3 else round(random.uniform(5.0, 50.0), 2)
            
            # Select 1-4 random products
            num_items = random.randint(1, 4)
            chosen_products = random.sample(products_data, num_items)
            
            subtotal = 0.0
            order_items_to_insert = []
            
            for prod in chosen_products:
                qty = random.randint(1, 3)
                unit_price = prod[3]
                tot_price = round(qty * unit_price, 2)
                subtotal += tot_price
                order_items_to_insert.append({
                    "item_id": order_item_id,
                    "order_id": order_id,
                    "product_id": prod[0],
                    "quantity": qty,
                    "unit_price": unit_price,
                    "total_price": tot_price
                })
                order_item_id += 1
                
            final_total = max(10.0, round(subtotal + shipping_fee - discount, 2))
            
            conn.execute(text("INSERT INTO orders VALUES (:id, :cust_id, :order_date, :status, :total, :ship, :disc)"), {
                "id": order_id,
                "cust_id": cust_id,
                "order_date": order_date,
                "status": status,
                "total": final_total,
                "ship": shipping_fee,
                "disc": discount
            })
            
            for item in order_items_to_insert:
                conn.execute(text("INSERT INTO order_items VALUES (:item_id, :order_id, :product_id, :quantity, :unit_price, :total_price)"), item)
                
            # Create payment record
            p_method = random.choice(PAYMENT_METHODS)
            p_status = "Completed" if status in ["Delivered", "Shipped", "Processing"] else "Refunded"
            conn.execute(text("INSERT INTO payments VALUES (:pid, :oid, :pdate, :pmethod, :amt, :pstatus)"), {
                "pid": payment_id,
                "oid": order_id,
                "pdate": order_date,
                "pmethod": p_method,
                "amt": final_total,
                "pstatus": p_status
            })
            payment_id += 1

    logger.info(f"Database seeded successfully with 150 customers, 20 products, 450 orders, {order_item_id-1} order items, and {payment_id-1} payments!")
    return {
        "customers": 150,
        "products": 20,
        "categories": 5,
        "orders": 450,
        "order_items": order_item_id - 1,
        "payments": payment_id - 1
    }
