```sql
-- Begin transaction to ensure atomicity
BEGIN;

-- Add discount_percent column if it doesn't exist (originally nullable)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2);

-- Backfill discount_percent for existing rows in batches to minimize locking
DO $$
DECLARE
    batch_size CONSTANT INTEGER := 10000; -- Adjust based on table size and load
    rows_updated BIGINT;
BEGIN
    LOOP
        WITH updated AS (
            UPDATE orders SET discount_percent = 0
            WHERE ctid IN (
                SELECT ctid FROM orders
                WHERE discount_percent IS NULL
                LIMIT batch_size
            )
            RETURNING 1
        )
        SELECT COUNT(*) INTO rows_updated FROM updated;
        EXIT WHEN rows_updated = 0;
    END LOOP;
END $$;

-- Set a default value for new rows to avoid NULL inserts before NOT NULL
ALTER TABLE orders ALTER COLUMN discount_percent SET DEFAULT 0;

-- Now make the column required (NOT NULL)
ALTER TABLE orders ALTER COLUMN discount_percent SET NOT NULL;

-- Create an index on the new column for performance (if not already present)
CREATE INDEX IF NOT EXISTS idx_orders_discount ON orders(discount_percent);

-- Add a check constraint to ensure discount is between 0 and 100
ALTER TABLE orders ADD CONSTRAINT IF NOT EXISTS check_discount CHECK (discount_percent >= 0 AND discount_percent <= 100);

-- Verify that all total_price values can be safely converted to DECIMAL(12,2)
-- Raise an exception and rollback if any value is out of the allowed range
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM orders
        WHERE total_price::numeric > 9999999999.99 OR total_price::numeric < -9999999999.99
    ) THEN
        RAISE EXCEPTION 'Some total_price values are out of range for DECIMAL(12,2). Maximum allowed is 9999999999.99.';
    END IF;
END $$;

-- Change the data type of total_price with explicit conversion
ALTER TABLE orders ALTER COLUMN total_price TYPE DECIMAL(12,2) USING total_price::DECIMAL(12,2);

-- Safely deprecate and drop the old_discount column
-- First rename it to indicate it's no longer used (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='old_discount') THEN
        ALTER TABLE orders RENAME COLUMN old_discount TO old_discount_deprecated;
    END IF;
END $$;

-- Drop the renamed column if it exists
ALTER TABLE orders DROP COLUMN IF EXISTS old_discount_deprecated;

-- Commit all changes
COMMIT;
```