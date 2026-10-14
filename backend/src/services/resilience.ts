export interface RateLimiterMetrics {
  algorithm: 'token-bucket' | 'sliding-window';
  capacity: number;
  tokensAvailable: number;
  refillRatePerSec: number;
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
  // Rate Limiter State (Token Bucket)
  private capacity = 100;
  private tokens = 100;
  private refillRate = 20; // 20 tokens per sec
  private totalAllowed = 0;
  private totalThrottled = 0;

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

  // Refill tokens every 200ms
  private startTokenRefillLoop() {
    setInterval(() => {
      const refillAmount = this.refillRate * 0.2;
      this.tokens = Math.min(this.capacity, Math.round((this.tokens + refillAmount) * 10) / 10);
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

  // Check rate limit: consume 1 token if available, else throttle
  public tryAcquireRateLimit(cost = 1): { allowed: boolean; tokensRemaining: number } {
    if (this.tokens >= cost) {
      this.tokens -= cost;
      this.totalAllowed++;
      return { allowed: true, tokensRemaining: Math.floor(this.tokens) };
    }
    this.totalThrottled++;
    return { allowed: false, tokensRemaining: Math.floor(this.tokens) };
  }

  // Force token consumption to simulate a rate limiter spike
  public exhaustTokens(): void {
    this.tokens = 0;
    this.totalThrottled += 5;
  }

  public refillTokens(): void {
    this.tokens = this.capacity;
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
    return {
      rateLimiter: {
        algorithm: 'token-bucket',
        capacity: this.capacity,
        tokensAvailable: Math.floor(this.tokens),
        refillRatePerSec: this.refillRate,
        totalAllowed: this.totalAllowed,
        totalThrottled: this.totalThrottled,
        isThrottling: this.tokens <= 0,
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
