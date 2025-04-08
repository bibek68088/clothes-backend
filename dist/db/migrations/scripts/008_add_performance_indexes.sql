-- Add indexes to improve query performance

-- Index for product searches
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);

-- Index for product category filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);

-- Index for order status filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

-- Index for user searches
CREATE INDEX IF NOT EXISTS idx_users_name_email ON users (name, email);

-- Index for cart items by user
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items (user_id);

-- Index for wishlist items by user
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user ON wishlist_items (user_id);

-- Index for product options
CREATE INDEX IF NOT EXISTS idx_product_options_type_value ON product_options (product_id, option_type, option_value);

