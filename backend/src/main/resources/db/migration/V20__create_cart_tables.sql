-- ============================================================
--  V20 – Server-side cart persistence
--  Creates: cart (one per user) + cart_item (line items)
-- ============================================================

-- Cart header: one active cart per logged-in user
CREATE TABLE cart (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cart_user UNIQUE (user_id)
);

-- Cart line items
CREATE TABLE cart_item (
    id          BIGSERIAL       PRIMARY KEY,
    cart_id     BIGINT          NOT NULL REFERENCES cart(id) ON DELETE CASCADE,
    product_id  BIGINT          NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    shop_id     BIGINT          REFERENCES shop(id) ON DELETE SET NULL,
    quantity    INT             NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price       DOUBLE PRECISION NOT NULL CHECK (price >= 0),
    added_at    TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cart_product UNIQUE (cart_id, product_id)
);

-- Indexes for cart line lookups
CREATE INDEX idx_cart_item_cart   ON cart_item(cart_id);
CREATE INDEX idx_cart_item_product ON cart_item(product_id);
