CREATE TABLE IF NOT EXISTS review (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shop(id),
    product_id BIGINT REFERENCES product(id),
    buyer_id BIGINT NOT NULL REFERENCES users(id),
    order_id BIGINT,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_review_shop_id ON review(shop_id);
CREATE INDEX IF NOT EXISTS idx_review_product_id ON review(product_id);
