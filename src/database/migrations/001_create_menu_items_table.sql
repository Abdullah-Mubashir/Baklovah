CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category TEXT,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Add some sample data for testing if the table is empty
INSERT INTO menu_items (title, description, price, category, image_url) SELECT 'Baklava Classic', 'Sweet pastry made of layers of filo filled with chopped nuts and sweetened and held together with syrup or honey.', 2.50, 'Desserts', '/images/menu/baklava_classic.jpg' WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE title = 'Baklava Classic');
INSERT INTO menu_items (title, description, price, category, image_url) SELECT 'Pistachio Baklava', 'A rich, sweet dessert pastry made of layers of filo filled with chopped pistachios.', 3.00, 'Desserts', '/images/menu/pistachio_baklava.jpg' WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE title = 'Pistachio Baklava');
INSERT INTO menu_items (title, description, price, category, image_url) SELECT 'Turkish Coffee', 'Strong, rich coffee brewed with finely ground beans.', 3.50, 'Beverages', '/images/menu/turkish_coffee.jpg' WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE title = 'Turkish Coffee');
