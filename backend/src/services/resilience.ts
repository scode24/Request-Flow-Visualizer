export interface RateLimiterMetrics {
  algorithm: 'token-bucket' | 'leaky-bucket' | 'sliding-window' | 'fixed-window';
  capacity: number;
  tokensAvailable: number;
  refillRatePerSec: number;
  clientIdentifier: 'ip' | 'api-key' | 'jwt-user';
  burstAllowance: number;
  totalAllowed: number;
  totalThrottled: number;
  isThrottling: boolean;
}

export interface CircuitBreakerMetrics {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureThreshold: number;
  consecutiveFailures: number;
  totalTrips: number;
  lastStateChange: number;
  recoveryTimeoutMs: number;
  fallbackResponses: number;
}

export interface ResilienceMetrics {
  rateLimiter: RateLimiterMetrics;
  circuitBreaker: CircuitBreakerMetrics;
}

class ResilienceService {
  // Rate Limiter State
  private algorithm: 'token-bucket' | 'leaky-bucket' | 'sliding-window' | 'fixed-window' = 'token-bucket';
  private capacity = 100;
  private tokens = 100;
  private refillRate = 20; // 20 tokens per sec
  private burstAllowance = 150;
  private clientIdentifier: 'ip' | 'api-key' | 'jwt-user' = 'ip';
  private totalAllowed = 0;
  private totalThrottled = 0;

  // Sliding window timestamps
  private slidingWindowTimestamps: number[] = [];
  // Fixed window counter
  private fixedWindowCount = 0;
  private fixedWindowStart = Date.now();

  // Circuit Breaker State
  private cbState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureThreshold = 4;
  private consecutiveFailures = 0;
  private totalTrips = 0;
  private lastStateChange = Date.now();
  private recoveryTimeoutMs = 7000;
  private fallbackResponses = 0;

  constructor() {
    this.startTokenRefillLoop();
    this.startCircuitBreakerWatcher();
  }

  public configureRateLimiter(opts: {
    algorithm?: 'token-bucket' | 'leaky-bucket' | 'sliding-window' | 'fixed-window';
    capacity?: number;
    refillRate?: number;
    burstAllowance?: number;
    clientIdentifier?: 'ip' | 'api-key' | 'jwt-user';
  }): void {
    if (opts.algorithm) this.algorithm = opts.algorithm;
    if (typeof opts.capacity === 'number') {
      this.capacity = opts.capacity;
      this.tokens = Math.min(this.tokens, this.capacity);
    }
    if (typeof opts.refillRate === 'number') this.refillRate = opts.refillRate;
    if (typeof opts.burstAllowance === 'number') this.burstAllowance = opts.burstAllowance;
    if (opts.clientIdentifier) this.clientIdentifier = opts.clientIdentifier;
    console.log(`🛡️ [ResilienceService] Rate Limiter reconfigured: algorithm=${this.algorithm}, capacity=${this.capacity}, refillRate=${this.refillRate}/s, clientIdentifier=${this.clientIdentifier}`);
  }

  // Refill tokens / drain queue every 200ms
  private startTokenRefillLoop() {
    setInterval(() => {
      const now = Date.now();

      // Reset fixed window if 1 second elapsed
      if (now - this.fixedWindowStart >= 1000) {
        this.fixedWindowCount = 0;
        this.fixedWindowStart = now;
      }

      // Purge old sliding window entries older than 1 second
      this.slidingWindowTimestamps = this.slidingWindowTimestamps.filter((t) => now - t < 1000);

      // Continuous token / leak refill
      const refillAmount = this.refillRate * 0.2;
      const maxCap = Math.max(this.capacity, this.burstAllowance);
      this.tokens = Math.min(maxCap, Math.round((this.tokens + refillAmount) * 10) / 10);
    }, 200);
  }

  // Watcher to transition OPEN -> HALF_OPEN when cooldown timer expires
  private startCircuitBreakerWatcher() {
    setInterval(() => {
      if (this.cbState === 'OPEN') {
        const elapsed = Date.now() - this.lastStateChange;
        if (elapsed >= this.recoveryTimeoutMs) {
          this.cbState = 'HALF_OPEN';
          this.lastStateChange = Date.now();
          console.log('⚡ [Circuit Breaker] Recovery cooldown passed -> Transitioning to HALF_OPEN (probing)');
        }
      }
    }, 500);
  }

  // Check rate limit: consume based on algorithm
  public tryAcquireRateLimit(cost = 1): { allowed: boolean; tokensRemaining: number; algorithm: string } {
    const now = Date.now();

    if (this.algorithm === 'fixed-window') {
      if (now - this.fixedWindowStart >= 1000) {
        this.fixedWindowCount = 0;
        this.fixedWindowStart = now;
      }
      if (this.fixedWindowCount + cost <= this.refillRate) {
        this.fixedWindowCount += cost;
        this.totalAllowed++;
        return { allowed: true, tokensRemaining: Math.max(0, this.refillRate - this.fixedWindowCount), algorithm: 'fixed-window' };
      }
      this.totalThrottled++;
      return { allowed: false, tokensRemaining: 0, algorithm: 'fixed-window' };
    }

    if (this.algorithm === 'sliding-window') {
      this.slidingWindowTimestamps = this.slidingWindowTimestamps.filter((t) => now - t < 1000);
      if (this.slidingWindowTimestamps.length + cost <= this.refillRate) {
        for (let i = 0; i < cost; i++) this.slidingWindowTimestamps.push(now);
        this.totalAllowed++;
        return { allowed: true, tokensRemaining: Math.max(0, this.refillRate - this.slidingWindowTimestamps.length), algorithm: 'sliding-window' };
      }
      this.totalThrottled++;
      return { allowed: false, tokensRemaining: 0, algorithm: 'sliding-window' };
    }

    // Default: token-bucket and leaky-bucket
    if (this.tokens >= cost) {
      this.tokens -= cost;
      this.totalAllowed++;
      return { allowed: true, tokensRemaining: Math.floor(this.tokens), algorithm: this.algorithm };
    }
    this.totalThrottled++;
    return { allowed: false, tokensRemaining: Math.floor(this.tokens), algorithm: this.algorithm };
  }

  // Force token consumption to simulate a rate limiter spike
  public exhaustTokens(): void {
    this.tokens = 0;
    this.fixedWindowCount = this.refillRate * 2;
    for (let i = 0; i < this.refillRate; i++) this.slidingWindowTimestamps.push(Date.now());
    this.totalThrottled += 5;
  }

  public refillTokens(): void {
    this.tokens = this.capacity;
    this.fixedWindowCount = 0;
    this.slidingWindowTimestamps = [];
  }

  // Circuit Breaker Execution Gate
  public canExecuteDownstream(): boolean {
    if (this.cbState === 'OPEN') {
      this.fallbackResponses++;
      return false;
    }
    return true;
  }

  public recordSuccess(): void {
    if (this.cbState === 'HALF_OPEN') {
      // Canary request succeeded -> fully close circuit breaker
      this.cbState = 'CLOSED';
      this.consecutiveFailures = 0;
      this.lastStateChange = Date.now();
      console.log('✅ [Circuit Breaker] Downstream recovered -> Transitioning to CLOSED');
    } else if (this.cbState === 'CLOSED') {
      this.consecutiveFailures = Math.max(0, this.consecutiveFailures - 1);
    }
  }

  public recordFailure(): void {
    this.consecutiveFailures++;
    if (this.cbState === 'HALF_OPEN') {
      // Probe failed -> trip back to OPEN immediately
      this.cbState = 'OPEN';
      this.lastStateChange = Date.now();
      this.totalTrips++;
      console.log('💥 [Circuit Breaker] Half-open probe failed -> Re-opening circuit breaker');
    } else if (this.cbState === 'CLOSED' && this.consecutiveFailures >= this.failureThreshold) {
      // Tripped!
      this.cbState = 'OPEN';
      this.lastStateChange = Date.now();
      this.totalTrips++;
      console.log(`🚨 [Circuit Breaker] ${this.consecutiveFailures} consecutive failures exceeded threshold (${this.failureThreshold}) -> Tripping to OPEN!`);
    }
  }

  public tripCircuitBreaker(): void {
    this.cbState = 'OPEN';
    this.consecutiveFailures = this.failureThreshold;
    this.totalTrips++;
    this.lastStateChange = Date.now();
  }

  public resetCircuitBreaker(): void {
    this.cbState = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastStateChange = Date.now();
  }

  public getMetrics(): ResilienceMetrics {
    const isThrottling =
      this.algorithm === 'fixed-window'
        ? this.fixedWindowCount >= this.refillRate
        : this.algorithm === 'sliding-window'
        ? this.slidingWindowTimestamps.length >= this.refillRate
        : this.tokens <= 0;

    const tokensAvailable =
      this.algorithm === 'fixed-window'
        ? Math.max(0, this.refillRate - this.fixedWindowCount)
        : this.algorithm === 'sliding-window'
        ? Math.max(0, this.refillRate - this.slidingWindowTimestamps.length)
        : Math.floor(this.tokens);

    return {
      rateLimiter: {
        algorithm: this.algorithm,
        capacity: this.capacity,
        tokensAvailable,
        refillRatePerSec: this.refillRate,
        clientIdentifier: this.clientIdentifier,
        burstAllowance: this.burstAllowance,
        totalAllowed: this.totalAllowed,
        totalThrottled: this.totalThrottled,
        isThrottling,
      },
      circuitBreaker: {
        state: this.cbState,
        failureThreshold: this.failureThreshold,
        consecutiveFailures: this.consecutiveFailures,
        totalTrips: this.totalTrips,
        lastStateChange: this.lastStateChange,
        recoveryTimeoutMs: this.recoveryTimeoutMs,
        fallbackResponses: this.fallbackResponses,
      },
    };
  }
}

export const resilienceService = new ResilienceService();
