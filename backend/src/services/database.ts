import { Pool, PoolClient } from 'pg';
import { config } from '../config';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  created_at: string;
}

export interface Review {
  id: number;
  author_name: string;
  author_email: string;
  rating: number;
  category: string;
  title: string;
  comment: string;
  created_at: string;
}

export interface DatabaseNodeMetric {
  id: string;
  name: string;
  role: 'primary' | 'replica' | 'shard';
  shardKey?: string;
  totalQueries: number;
  activeConnections: number;
  cpuPercent: number;
  status: 'healthy' | 'active' | 'degraded';
}

export interface DatabaseQueryResult<T> {
  data: T;
  durationMs: number;
  targetNodeId: string;
  targetRole: 'primary' | 'replica' | 'shard';
}

export interface DatabaseMetrics {
  connected: boolean;
  isRealPostgres: boolean;
  totalQueries: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  avgQueryDurationMs: number;
  lastQueryDurationMs: number;
  mode: 'standalone' | 'read-replicas' | 'sharded';
  replicasCount: number;
  shardsCount: number;
  nodes: DatabaseNodeMetric[];
}

class DatabaseService {
  private pool: Pool | null = null;
  private isConnected = false;
  private totalQueries = 0;
  private queryDurations: number[] = [];
  private lastQueryDurationMs = 0;
  private nodes: DatabaseNodeMetric[] = [];
  private replicaRoundRobin = 0;

  // In-memory fallback dataset for seamless local execution
  private mockProducts: Product[] = [
    { id: 1, name: 'Cloud Router X9', description: 'Enterprise low-latency core network router', price: 1299.99, stock: 45, category: 'Hardware', created_at: new Date().toISOString() },
    { id: 2, name: 'High-Density Switch 48P', description: '100GbE rack switch with redundant power supply', price: 2499.50, stock: 18, category: 'Networking', created_at: new Date().toISOString() },
    { id: 3, name: 'Edge Gateway Micro', description: 'DIN-rail industrial IoT protocol gateway', price: 349.00, stock: 120, category: 'Edge Computing', created_at: new Date().toISOString() },
    { id: 4, name: 'Optic SFP28 Transceiver', description: '25G optical transceiver module 850nm', price: 89.99, stock: 350, category: 'Optics', created_at: new Date().toISOString() },
    { id: 5, name: 'Server Chassis 2U', description: 'Dual Xeon scalable rack chassis with 12 hot-swap bays', price: 850.00, stock: 12, category: 'Servers', created_at: new Date().toISOString() },
  ];

  // In-memory review comments store pre-seeded with architecture reviews
  private mockReviews: Review[] = [
    {
      id: 1,
      author_name: 'Alex Rivera',
      author_email: 'alex.rivera@sysarch.dev',
      rating: 5,
      category: 'System Design Concepts',
      title: 'Incredible visual intuition for distributed systems!',
      comment: 'The consistent hashing ring combined with horizontal pod autoscaling helped me understand partitioning and elasticity much better than static diagrams.',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: 2,
      author_name: 'Sophia Chen',
      author_email: 'sophia.c@cloudeng.io',
      rating: 5,
      category: 'Architecture Topology',
      title: 'Database read/write replication split is spot on',
      comment: 'Routing read queries across async replicas while preserving writes to the primary is a classic interview concept that is clearly visualized here.',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 3,
      author_name: 'Marcus Brody',
      author_email: 'm.brody@scaleup.tech',
      rating: 4,
      category: 'Resilience & Load Testing',
      title: 'Load generator metrics are super responsive',
      comment: 'Being able to ramp up 50 virtual users and observe p95 and p99 latency percentiles change as cache hit ratio drops provides immediate feedback.',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ];

  constructor() {
    this.initNodes();
    this.init();
    this.startLoadJitterLoop();
  }

  public initNodes() {
    const mode = config.database.mode;
    const replicas = Math.max(1, Math.min(4, config.database.replicasCount));
    const shards = Math.max(2, Math.min(4, config.database.shardsCount));
    const newNodes: DatabaseNodeMetric[] = [];

    if (mode === 'standalone') {
      newNodes.push({
        id: 'database-primary',
        name: 'PostgreSQL Primary',
        role: 'primary',
        totalQueries: 0,
        activeConnections: 1,
        cpuPercent: 12,
        status: 'healthy',
      });
    } else if (mode === 'read-replicas') {
      // Primary Node for writes & fallback reads
      newNodes.push({
        id: 'database-primary',
        name: 'Primary (Leader / R+W)',
        role: 'primary',
        totalQueries: 0,
        activeConnections: 2,
        cpuPercent: 18,
        status: 'healthy',
      });
      // Scaled Read Replicas
      for (let i = 1; i <= replicas; i++) {
        newNodes.push({
          id: `database-replica-${i}`,
          name: `Read Replica #${i} (Async)`,
          role: 'replica',
          totalQueries: 0,
          activeConnections: 1,
          cpuPercent: 10,
          status: 'healthy',
        });
      }
    } else if (mode === 'sharded') {
      // Partitioned Shards
      const ranges = [
        'Hash [0x00 - 0x3F]',
        'Hash [0x40 - 0x7F]',
        'Hash [0x80 - 0xBF]',
        'Hash [0xC0 - 0xFF]',
      ];
      for (let i = 1; i <= shards; i++) {
        newNodes.push({
          id: `database-shard-${i}`,
          name: `DB Shard #${i}`,
          role: 'shard',
          shardKey: ranges[i - 1] || `Partition #${i}`,
          totalQueries: 0,
          activeConnections: 1,
          cpuPercent: 14,
          status: 'healthy',
        });
      }
    }

    this.nodes = newNodes;
  }

  public setConfiguration(
    mode: 'standalone' | 'read-replicas' | 'sharded',
    replicasCount?: number,
    shardsCount?: number
  ) {
    config.database.mode = mode;
    if (typeof replicasCount === 'number') {
      config.database.replicasCount = Math.max(1, Math.min(4, replicasCount));
    }
    if (typeof shardsCount === 'number') {
      config.database.shardsCount = Math.max(2, Math.min(4, shardsCount));
    }
    this.initNodes();
  }

  private startLoadJitterLoop() {
    setInterval(() => {
      // Simulate realistic fluctuation of active connections & CPU based on recent queries
      for (const node of this.nodes) {
        const jitter = Math.floor(Math.random() * 4) - 2;
        const baseCpu = node.activeConnections * 5 + 10;
        node.cpuPercent = Math.max(5, Math.min(95, baseCpu + jitter));
        if (node.activeConnections > 1 && Math.random() > 0.6) {
          node.activeConnections = Math.max(1, node.activeConnections - 1);
        }
      }
    }, 3000);
  }

  private selectReadNode(idHint?: number): DatabaseNodeMetric {
    if (this.nodes.length === 0) this.initNodes();
    const mode = config.database.mode;

    if (mode === 'read-replicas') {
      const replicas = this.nodes.filter((n) => n.role === 'replica');
      if (replicas.length > 0) {
        const selected = replicas[this.replicaRoundRobin % replicas.length];
        this.replicaRoundRobin++;
        selected.activeConnections = Math.min(10, selected.activeConnections + 1);
        selected.totalQueries++;
        return selected;
      }
    } else if (mode === 'sharded') {
      const shards = this.nodes.filter((n) => n.role === 'shard');
      if (shards.length > 0) {
        const shardIdx = ((idHint ?? this.replicaRoundRobin++) % shards.length);
        const selected = shards[shardIdx];
        selected.activeConnections = Math.min(10, selected.activeConnections + 1);
        selected.totalQueries++;
        return selected;
      }
    }

    const primary = this.nodes.find((n) => n.role === 'primary') || this.nodes[0];
    if (primary) {
      primary.activeConnections = Math.min(10, primary.activeConnections + 1);
      primary.totalQueries++;
      return primary;
    }

    return {
      id: 'database-primary',
      name: 'PostgreSQL Primary',
      role: 'primary',
      totalQueries: 1,
      activeConnections: 1,
      cpuPercent: 15,
      status: 'healthy',
    };
  }

  private selectWriteNode(idHint?: number): DatabaseNodeMetric {
    if (this.nodes.length === 0) this.initNodes();
    const mode = config.database.mode;

    if (mode === 'sharded') {
      const shards = this.nodes.filter((n) => n.role === 'shard');
      if (shards.length > 0) {
        const shardIdx = ((idHint ?? this.mockProducts.length) % shards.length);
        const selected = shards[shardIdx];
        selected.activeConnections = Math.min(10, selected.activeConnections + 1);
        selected.totalQueries++;
        return selected;
      }
    }

    // Standalone and Read-Replicas both write directly to Primary
    const primary = this.nodes.find((n) => n.role === 'primary') || this.nodes[0];
    if (primary) {
      primary.activeConnections = Math.min(10, primary.activeConnections + 1);
      primary.totalQueries++;
      return primary;
    }

    return {
      id: 'database-primary',
      name: 'PostgreSQL Primary',
      role: 'primary',
      totalQueries: 1,
      activeConnections: 1,
      cpuPercent: 15,
      status: 'healthy',
    };
  }

  private async init() {
    try {
      this.pool = new Pool({
        host: config.postgres.host,
        port: config.postgres.port,
        user: config.postgres.user,
        password: config.postgres.password,
        database: config.postgres.database,
        max: config.postgres.poolSize,
        connectionTimeoutMillis: 2000,
        idleTimeoutMillis: 10000,
      });

      // Test connection
      const client = await this.pool.connect();
      await this.initSchema(client);
      client.release();
      this.isConnected = true;
      console.log('✅ [PostgreSQL] Connected successfully to host: ' + config.postgres.host);
    } catch (err: any) {
      this.isConnected = false;
      console.log('⚠️ [PostgreSQL] Live DB connection unavailable (' + (err?.message || 'timeout') + '). Initialized In-Memory Emulation Mode.');
    }
  }

  private async initSchema(client: PoolClient) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS system_reviews (
        id SERIAL PRIMARY KEY,
        author_name VARCHAR(120) NOT NULL,
        author_email VARCHAR(255) NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        category VARCHAR(100) NOT NULL,
        title VARCHAR(200) NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if products table is empty, if so, seed
    const res = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(res.rows[0].count, 10) === 0) {
      for (const p of this.mockProducts) {
        await client.query(
          'INSERT INTO products (name, description, price, stock, category) VALUES ($1, $2, $3, $4, $5)',
          [p.name, p.description, p.price, p.stock, p.category]
        );
      }
      console.log('🌱 [PostgreSQL] Seeded initial sample products table');
    }

    // Check if reviews table is empty, if so, seed
    const reviewRes = await client.query('SELECT COUNT(*) FROM system_reviews');
    if (parseInt(reviewRes.rows[0].count, 10) === 0) {
      for (const r of this.mockReviews) {
        await client.query(
          'INSERT INTO system_reviews (author_name, author_email, rating, category, title, comment) VALUES ($1, $2, $3, $4, $5, $6)',
          [r.author_name, r.author_email, r.rating, r.category, r.title, r.comment]
        );
      }
      console.log('🌱 [PostgreSQL] Seeded initial sample system reviews table');
    }
  }

  public async getProductById(id: number): Promise<{ product: Product | null; durationMs: number; targetNodeId: string; targetRole: 'primary' | 'replica' | 'shard' }> {
    const start = Date.now();
    this.totalQueries++;
    const target = this.selectReadNode(id);

    if (this.isConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM products WHERE id = $1', [id]);
        const duration = Date.now() - start;
        this.recordDuration(duration);
        return {
          product: res.rows[0] ? (res.rows[0] as Product) : null,
          durationMs: duration,
          targetNodeId: target.id,
          targetRole: target.role,
        };
      } catch (err) {
        console.error('[PostgreSQL] Query failed, using fallback:', err);
      }
    }

    // Fallback in-memory query with realistic database I/O delay (5-15ms)
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 10) + 5));
    const duration = Date.now() - start;
    this.recordDuration(duration);
    const product = this.mockProducts.find((p) => p.id === id) || null;
    return {
      product,
      durationMs: duration,
      targetNodeId: target.id,
      targetRole: target.role,
    };
  }

  public async listProducts(): Promise<{ products: Product[]; durationMs: number; targetNodeId: string; targetRole: 'primary' | 'replica' | 'shard' }> {
    const start = Date.now();
    this.totalQueries++;
    const target = this.selectReadNode();

    if (this.isConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM products ORDER BY id ASC LIMIT 50');
        const duration = Date.now() - start;
        this.recordDuration(duration);
        return {
          products: res.rows as Product[],
          durationMs: duration,
          targetNodeId: target.id,
          targetRole: target.role,
        };
      } catch (err) {
        console.error('[PostgreSQL] List query failed, using fallback:', err);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 8));
    const duration = Date.now() - start;
    this.recordDuration(duration);
    return {
      products: [...this.mockProducts],
      durationMs: duration,
      targetNodeId: target.id,
      targetRole: target.role,
    };
  }

  public async createProduct(
    productData: Omit<Product, 'id' | 'created_at'>
  ): Promise<{ product: Product; durationMs: number; targetNodeId: string; targetRole: 'primary' | 'shard' }> {
    const start = Date.now();
    this.totalQueries++;
    const target = this.selectWriteNode();

    if (this.isConnected && this.pool) {
      try {
        const res = await this.pool.query(
          'INSERT INTO products (name, description, price, stock, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [productData.name, productData.description, productData.price, productData.stock, productData.category]
        );
        const duration = Date.now() - start;
        this.recordDuration(duration);
        return {
          product: res.rows[0] as Product,
          durationMs: duration,
          targetNodeId: target.id,
          targetRole: target.role as 'primary' | 'shard',
        };
      } catch (err) {
        console.error('[PostgreSQL] Insert failed, using fallback:', err);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 12));
    const duration = Date.now() - start;
    this.recordDuration(duration);
    const newId = this.mockProducts.length ? Math.max(...this.mockProducts.map((p) => p.id)) + 1 : 1;
    const newProduct: Product = {
      id: newId,
      ...productData,
      created_at: new Date().toISOString(),
    };
    this.mockProducts.push(newProduct);
    return {
      product: newProduct,
      durationMs: duration,
      targetNodeId: target.id,
      targetRole: target.role as 'primary' | 'shard',
    };
  }

  public async resetSeedData(): Promise<{ success: boolean; durationMs: number }> {
    const start = Date.now();
    this.totalQueries++;

    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE');
        for (const p of [
          { name: 'Cloud Router X9', description: 'Enterprise low-latency core network router', price: 1299.99, stock: 45, category: 'Hardware' },
          { name: 'High-Density Switch 48P', description: '100GbE rack switch with redundant power supply', price: 2499.50, stock: 18, category: 'Networking' },
          { name: 'Edge Gateway Micro', description: 'DIN-rail industrial IoT protocol gateway', price: 349.00, stock: 120, category: 'Edge Computing' },
          { name: 'Optic SFP28 Transceiver', description: '25G optical transceiver module 850nm', price: 89.99, stock: 350, category: 'Optics' },
          { name: 'Server Chassis 2U', description: 'Dual Xeon scalable rack chassis with 12 hot-swap bays', price: 850.00, stock: 12, category: 'Servers' },
        ]) {
          await this.pool.query(
            'INSERT INTO products (name, description, price, stock, category) VALUES ($1, $2, $3, $4, $5)',
            [p.name, p.description, p.price, p.stock, p.category]
          );
        }
      } catch (err) {
        console.error('Reset seed data failed on Postgres:', err);
      }
    }

    this.mockProducts = [
      { id: 1, name: 'Cloud Router X9', description: 'Enterprise low-latency core network router', price: 1299.99, stock: 45, category: 'Hardware', created_at: new Date().toISOString() },
      { id: 2, name: 'High-Density Switch 48P', description: '100GbE rack switch with redundant power supply', price: 2499.50, stock: 18, category: 'Networking', created_at: new Date().toISOString() },
      { id: 3, name: 'Edge Gateway Micro', description: 'DIN-rail industrial IoT protocol gateway', price: 349.00, stock: 120, category: 'Edge Computing', created_at: new Date().toISOString() },
      { id: 4, name: 'Optic SFP28 Transceiver', description: '25G optical transceiver module 850nm', price: 89.99, stock: 350, category: 'Optics', created_at: new Date().toISOString() },
      { id: 5, name: 'Server Chassis 2U', description: 'Dual Xeon scalable rack chassis with 12 hot-swap bays', price: 850.00, stock: 12, category: 'Servers', created_at: new Date().toISOString() },
    ];

    const duration = Date.now() - start;
    this.recordDuration(duration);
    return { success: true, durationMs: duration };
  }

  public async getReviews(): Promise<Review[]> {
    this.totalQueries++;
    if (this.isConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM system_reviews ORDER BY created_at DESC');
        return res.rows as Review[];
      } catch (err) {
        console.error('[PostgreSQL] Failed to fetch reviews, using mock store:', err);
      }
    }
    return [...this.mockReviews].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async addReview(reviewData: {
    author_name: string;
    author_email: string;
    rating: number;
    category: string;
    title: string;
    comment: string;
  }): Promise<Review> {
    const start = Date.now();
    this.totalQueries++;

    if (this.isConnected && this.pool) {
      try {
        const res = await this.pool.query(
          `INSERT INTO system_reviews (author_name, author_email, rating, category, title, comment)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            reviewData.author_name,
            reviewData.author_email,
            Math.max(1, Math.min(5, reviewData.rating)),
            reviewData.category || 'General',
            reviewData.title,
            reviewData.comment,
          ]
        );
        const duration = Date.now() - start;
        this.recordDuration(duration);
        return res.rows[0] as Review;
      } catch (err) {
        console.error('[PostgreSQL] Failed to insert review, falling back to mock store:', err);
      }
    }

    const newId = this.mockReviews.length ? Math.max(...this.mockReviews.map((r) => r.id)) + 1 : 1;
    const newReview: Review = {
      id: newId,
      author_name: reviewData.author_name,
      author_email: reviewData.author_email,
      rating: Math.max(1, Math.min(5, reviewData.rating)),
      category: reviewData.category || 'General',
      title: reviewData.title,
      comment: reviewData.comment,
      created_at: new Date().toISOString(),
    };
    this.mockReviews.unshift(newReview);
    const duration = Date.now() - start;
    this.recordDuration(duration);
    return newReview;
  }

  public async deleteReview(id: number): Promise<boolean> {
    this.totalQueries++;
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM system_reviews WHERE id = $1', [id]);
        return true;
      } catch (err) {
        console.error('[PostgreSQL] Failed to delete review:', err);
      }
    }
    const idx = this.mockReviews.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.mockReviews.splice(idx, 1);
      return true;
    }
    return false;
  }

  private recordDuration(ms: number) {
    this.lastQueryDurationMs = ms;
    this.queryDurations.push(ms);
    if (this.queryDurations.length > 100) this.queryDurations.shift();
  }

  public getMetrics(): DatabaseMetrics {
    const avgDuration =
      this.queryDurations.length > 0
        ? Math.round(
            (this.queryDurations.reduce((a, b) => a + b, 0) / this.queryDurations.length) * 10
          ) / 10
        : 0;

    const totalActiveConns = this.nodes.reduce((acc, n) => acc + n.activeConnections, 0);

    return {
      connected: this.isConnected,
      isRealPostgres: this.isConnected,
      totalQueries: this.totalQueries,
      activeConnections: totalActiveConns,
      idleConnections: Math.max(1, (this.nodes.length * 4) - totalActiveConns),
      waitingClients: 0,
      avgQueryDurationMs: avgDuration,
      lastQueryDurationMs: this.lastQueryDurationMs,
      mode: config.database.mode,
      replicasCount: config.database.replicasCount,
      shardsCount: config.database.shardsCount,
      nodes: [...this.nodes],
    };
  }
}

export const databaseService = new DatabaseService();
