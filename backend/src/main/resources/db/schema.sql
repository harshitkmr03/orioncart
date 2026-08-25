-- PostgreSQL schema for Hyperlocal platform (Supabase-ready)

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  role VARCHAR(50),
  shop_name VARCHAR(255),
  phone_verified BOOLEAN DEFAULT FALSE,
  referral_code VARCHAR(20) UNIQUE,
  loyalty_tier VARCHAR(20) DEFAULT 'BRONZE'
);

CREATE TABLE shop (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255),
  category VARCHAR(100),
  address VARCHAR(500),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_url VARCHAR(500),
  shopkeeper_id BIGINT REFERENCES users(id)
);

CREATE TABLE shop_categories (
  shop_id BIGINT REFERENCES shop(id),
  categories VARCHAR(255)
);

CREATE TABLE product (
  id BIGSERIAL PRIMARY KEY,
  sku VARCHAR(100),
  name VARCHAR(255),
  price DOUBLE PRECISION,
  description TEXT,
  features TEXT,
  category VARCHAR(100),
  image_url VARCHAR(500),
  stock_qty INT,
  low_stock_threshold INT DEFAULT 5,
  last_stock_update_at TIMESTAMP,
  shop_id BIGINT REFERENCES shop(id)
);

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT,
  subtotal_amount DOUBLE PRECISION DEFAULT 0,
  tax_amount DOUBLE PRECISION DEFAULT 0,
  total_amount DOUBLE PRECISION,
  fulfillment_type VARCHAR(100),
  delivery_address TEXT,
  delivery_latitude DOUBLE PRECISION,
  delivery_longitude DOUBLE PRECISION,
  schedule_time VARCHAR(255),
  scheduled_slot VARCHAR(255),
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  delivery_partner VARCHAR(100),
  delivery_charge DOUBLE PRECISION DEFAULT 0,
  coupon_code VARCHAR(50),
  discount_amount DOUBLE PRECISION DEFAULT 0,
  loyalty_points_redeemed INT DEFAULT 0,
  note TEXT,
  status VARCHAR(50),
  created_at TIMESTAMP,
  payment_method VARCHAR(20),
  payment_status VARCHAR(20) DEFAULT 'PENDING'
);

CREATE TABLE order_item (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT,
  product_name VARCHAR(255),
  quantity INT,
  price DOUBLE PRECISION,
  shop_id BIGINT,
  order_id BIGINT REFERENCES orders(id)
);

CREATE TABLE reward (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT,
  coupon_code VARCHAR(100),
  message TEXT,
  created_at VARCHAR(50)
);

CREATE TABLE review (
  id BIGSERIAL PRIMARY KEY,
  shop_id BIGINT REFERENCES shop(id),
  product_id BIGINT REFERENCES product(id),
  buyer_id BIGINT REFERENCES users(id),
  order_id BIGINT,
  rating INT,
  comment TEXT,
  created_at TIMESTAMP
);

CREATE TABLE coupons (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) NOT NULL,
  discount_value DOUBLE PRECISION NOT NULL,
  min_order_value DOUBLE PRECISION DEFAULT 0,
  max_uses INT,
  current_uses INT DEFAULT 0,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  scope VARCHAR(20) DEFAULT 'PLATFORM',
  shop_id BIGINT REFERENCES shop(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wishlists (
  id BIGSERIAL PRIMARY KEY,
  buyer_id BIGINT NOT NULL REFERENCES users(id),
  product_id BIGINT NOT NULL REFERENCES product(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(buyer_id, product_id)
);

CREATE TABLE loyalty_points (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
  points_balance INT DEFAULT 0,
  lifetime_points INT DEFAULT 0,
  tier VARCHAR(20) DEFAULT 'BRONZE',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loyalty_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  points_change INT NOT NULL,
  transaction_type VARCHAR(50),
  reference_id BIGINT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id BIGINT NOT NULL REFERENCES users(id),
  referee_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
  referral_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disputes (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  customer_id BIGINT NOT NULL REFERENCES users(id),
  shop_id BIGINT NOT NULL REFERENCES shop(id),
  reason VARCHAR(50) NOT NULL,
  description TEXT,
  evidence_image_urls TEXT,
  status VARCHAR(30) DEFAULT 'OPEN',
  shopkeeper_response TEXT,
  shopkeeper_responded_at TIMESTAMP,
  admin_resolution TEXT,
  refund_issued BOOLEAN DEFAULT FALSE,
  raised_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient_id BIGINT NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  link VARCHAR(300),
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
