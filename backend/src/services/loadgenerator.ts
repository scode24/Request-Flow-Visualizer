import { broadcastEvent } from '../websocket/wsServer';

export interface LoadTestConfig {
  scenario: 'get_product_cached' | 'get_product_uncached' | 'get_random_product' | 'post_product' | 'get_object_storage' | 'mixed_workload';
  concurrentUsers: number;
  durationSeconds: number;
  targetRps?: number;
}

export interface LoadTestStatus {
  id: string;
  isRunning: boolean;
  config: LoadTestConfig;
  elapsedSeconds: number;
  remainingSeconds: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  currentRps: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  statusCodes: Record<string, number>;
  activeWorkers: number;
}

class LoadGeneratorService {
  private isRunning = false;
  private currentTestId: string | null = null;
  private activeConfig: LoadTestConfig | null = null;
  private abortController: AbortController | null = null;

  // Real-time metrics
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private latencies: number[] = [];
  private statusCodes: Record<string, number> = {};
  private startTime = 0;
  private lastTickTime = 0;
  private lastTickRequests = 0;
  private currentRps = 0;
  private progressInterval: NodeJS.Timeout | null = null;

  public async start(config: LoadTestConfig, baseUrl: string): Promise<LoadTestStatus> {
    if (this.isRunning) {
      this.stop();
    }

    this.isRunning = true;
    this.currentTestId = Math.random().toString(36).substring(2, 9);
    this.activeConfig = config;
    this.abortController = new AbortController();

    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.latencies = [];
    this.statusCodes = {};
    this.startTime = Date.now();
    this.lastTickTime = Date.now();
    this.lastTickRequests = 0;
    this.currentRps = 0;

    console.log(`🚀 [Load Generator] Starting test: ${config.scenario} (${config.concurrentUsers} users, ${config.durationSeconds}s)`);

    // Start progress streaming
    this.progressInterval = setInterval(() => {
      this.tickMetrics();
      broadcastEvent('load_test_update', {
        type: 'load_test_update',
        status: this.getStatus(),
      });
    }, 250);

    // Launch worker pool
    this.runWorkerPool(config, baseUrl, this.abortController.signal).finally(() => {
      this.stop();
    });

    return this.getStatus();
  }

  public stop(): LoadTestStatus {
    if (!this.isRunning) return this.getStatus();

    this.isRunning = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    this.tickMetrics();
    console.log(`🛑 [Load Generator] Test finished. Total requests: ${this.totalRequests}, Success: ${this.successfulRequests}, RPS: ${this.currentRps}`);

    broadcastEvent('load_test_completed', {
      type: 'load_test_completed',
      status: this.getStatus(),
    });

    return this.getStatus();
  }

  private async runWorkerPool(config: LoadTestConfig, baseUrl: string, signal: AbortSignal): Promise<void> {
    const endTime = Date.now() + config.durationSeconds * 1000;
    const workers = Array.from({ length: config.concurrentUsers }).map(async (_, idx) => {
      // Stagger worker start slightly to avoid immediate spike
      await new Promise((r) => setTimeout(r, idx * 15));

      while (!signal.aborted && Date.now() < endTime) {
        const loopStart = Date.now();
        await this.executeSingleRequest(config.scenario, baseUrl, signal);

        // If targetRps is set, calculate delay per worker
        if (config.targetRps && config.targetRps > 0) {
          const delayPerReq = (1000 / config.targetRps) * config.concurrentUsers;
          const elapsed = Date.now() - loopStart;
          const waitTime = Math.max(5, delayPerReq - elapsed);
          await new Promise((r) => setTimeout(r, waitTime));
        } else {
          // Minimal inter-request jitter to emulate human/app traffic
          await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20) + 10));
        }
      }
    });

    await Promise.all(workers);
  }

  private async executeSingleRequest(scenario: LoadTestConfig['scenario'], baseUrl: string, signal: AbortSignal): Promise<void> {
    let url = `${baseUrl}/api/products/1`;
    let method = 'GET';
    let body: string | undefined = undefined;

    switch (scenario) {
      case 'get_product_cached':
        url = `${baseUrl}/api/products/1`;
        break;
      case 'get_product_uncached':
        url = `${baseUrl}/api/products/1?cache=false`;
        break;
      case 'get_random_product': {
        const id = Math.floor(Math.random() * 5) + 1;
        url = `${baseUrl}/api/products/${id}`;
        break;
      }
      case 'post_product':
        url = `${baseUrl}/api/products`;
        method = 'POST';
        body = JSON.stringify({
          name: `Device SKU-${Math.floor(Math.random() * 9000) + 1000}`,
          description: 'Load test dynamically generated inventory unit',
          price: Math.floor(Math.random() * 500) + 50,
          stock: 100,
          category: 'LoadTesting',
        });
        break;
      case 'get_object_storage':
        url = `${baseUrl}/api/objects/product-catalog.json`;
        break;
      case 'mixed_workload': {
        const roll = Math.random();
        if (roll < 0.65) {
          url = `${baseUrl}/api/products/${Math.floor(Math.random() * 3) + 1}`;
        } else if (roll < 0.85) {
          url = `${baseUrl}/api/products/${Math.floor(Math.random() * 5) + 1}?cache=false`;
        } else if (roll < 0.95) {
          url = `${baseUrl}/api/objects/product-catalog.json`;
        } else {
          url = `${baseUrl}/api/products`;
          method = 'POST';
          body = JSON.stringify({
            name: `Mix Item-${Math.floor(Math.random() * 1000)}`,
            description: 'Generated during mixed load test',
            price: 99.00,
            stock: 25,
            category: 'Testing',
          });
        }
        break;
      }
    }

    const reqStart = Date.now();
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Load-Test': 'true',
        },
        body,
        signal,
      });

      const latency = Date.now() - reqStart;
      this.totalRequests++;
      this.latencies.push(latency);
      if (this.latencies.length > 5000) this.latencies.shift();

      const status = res.status.toString();
      this.statusCodes[status] = (this.statusCodes[status] || 0) + 1;

      if (res.ok) {
        this.successfulRequests++;
      } else {
        this.failedRequests++;
      }
    } catch (err: any) {
      if (signal.aborted) return;
      const latency = Date.now() - reqStart;
      this.totalRequests++;
      this.failedRequests++;
      this.latencies.push(latency);
      this.statusCodes['500'] = (this.statusCodes['500'] || 0) + 1;
    }
  }

  private tickMetrics(): void {
    const now = Date.now();
    const timeDeltaSec = (now - this.lastTickTime) / 1000;
    if (timeDeltaSec >= 0.2) {
      const reqDelta = this.totalRequests - this.lastTickRequests;
      this.currentRps = Math.round((reqDelta / timeDeltaSec) * 10) / 10;
      this.lastTickTime = now;
      this.lastTickRequests = this.totalRequests;
    }
  }

  public getStatus(): LoadTestStatus {
    const elapsed = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    const duration = this.activeConfig ? this.activeConfig.durationSeconds : 0;
    const remaining = Math.max(0, duration - elapsed);

    // Calculate percentiles
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p50 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)] : 0;
    const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;
    const p99 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] : 0;
    const min = sorted.length > 0 ? sorted[0] : 0;
    const max = sorted.length > 0 ? sorted[sorted.length - 1] : 0;
    const avg =
      sorted.length > 0
        ? Math.round((sorted.reduce((a, b) => a + b, 0) / sorted.length) * 10) / 10
        : 0;

    return {
      id: this.currentTestId || 'idle',
      isRunning: this.isRunning,
      config: this.activeConfig || {
        scenario: 'get_product_cached',
        concurrentUsers: 10,
        durationSeconds: 15,
      },
      elapsedSeconds: elapsed,
      remainingSeconds: remaining,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      currentRps: this.currentRps,
      avgLatencyMs: avg,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      minLatencyMs: min,
      maxLatencyMs: max,
      statusCodes: { ...this.statusCodes },
      activeWorkers: this.isRunning && this.activeConfig ? this.activeConfig.concurrentUsers : 0,
    };
  }
}

export const loadGeneratorService = new LoadGeneratorService();
