-- Initialize Flow Visualizer Database Schema
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id),
  quantity INT NOT NULL DEFAULT 1,
  total_price NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_telemetry (
  id SERIAL PRIMARY KEY,
  trace_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  duration_ms INT NOT NULL,
  component VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Data
INSERT INTO products (name, description, price, stock, category) VALUES
  ('Cloud Router X9', 'Enterprise low-latency core network router', 1299.99, 45, 'Hardware'),
  ('High-Density Switch 48P', '100GbE rack switch with redundant power supply', 2499.50, 18, 'Networking'),
  ('Edge Gateway Micro', 'DIN-rail industrial IoT protocol gateway', 349.00, 120, 'Edge Computing'),
  ('Optic SFP28 Transceiver', '25G optical transceiver module 850nm', 89.99, 350, 'Optics'),
  ('Server Chassis 2U', 'Dual Xeon scalable rack chassis with 12 hot-swap bays', 850.00, 12, 'Servers')
ON CONFLICT DO NOTHING;
