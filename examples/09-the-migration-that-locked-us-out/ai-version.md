-- Add new column and backfill
ALTER TABLE orders ADD COLUMN discount_percent DECIMAL(5,2);

-- Update all rows
UPDATE orders SET discount_percent = 0;

-- Make it required
ALTER TABLE orders ALTER COLUMN discount_percent SET NOT NULL;

-- Add index for new column
CREATE INDEX idx_orders_discount ON orders(discount_percent);

-- Add new constraint
ALTER TABLE orders ADD CONSTRAINT check_discount 
    CHECK (discount_percent >= 0 AND discount_percent <= 100);

-- Modify existing column
ALTER TABLE orders ALTER COLUMN total_price TYPE DECIMAL(12,2);

-- Drop unused column
ALTER TABLE orders DROP COLUMN old_discount;