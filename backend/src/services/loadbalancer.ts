import { config } from '../config';

export interface BackendInstance {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  activeConnections: number;
  totalRequests: number;
  cpuPercent: number;
  memoryPercent: number;
  lastResponseTimeMs: number;
  uptimeSeconds: number;
}

export interface LoadBalancerMetrics {
  algorithm: 'round-robin' | 'least-connections' | 'random';
  scalingMode: 'single' | 'fixed' | 'autoscaling';
  replicas: number;
  totalRequestsRouted: number;
  activeConnections: number;
  cpuUtilizationPercent: number;
  instances: BackendInstance[];
}

class LoadBalancerService {
  private instances: BackendInstance[] = [];
  private roundRobinIndex = 0;
  private totalRequestsRouted = 0;

  constructor() {
    this.initInstances(config.backend.activeReplicas);
    this.startHealthCheckLoop();
  }

  public initInstances(count: number): void {
    const newInstances: BackendInstance[] = [];
    for (let i = 1; i <= count; i++) {
      const existing = this.instances.find((inst) => inst.id === `backend-instance-${i}`);
      if (existing) {
        newInstances.push(existing);
      } else {
        newInstances.push({
          id: `backend-instance-${i}`,
          name: `Backend Pod #${i}`,
          status: 'healthy',
          activeConnections: 0,
          totalRequests: 0,
          cpuPercent: Math.floor(Math.random() * 15) + 10,
          memoryPercent: Math.floor(Math.random() * 10) + 25,
          lastResponseTimeMs: 15,
          uptimeSeconds: 0,
        });
      }
    }
    this.instances = newInstances;
    config.backend.activeReplicas = count;
  }

  public selectInstance(): BackendInstance {
    const healthy = this.instances.filter((i) => i.status !== 'unhealthy');
    const candidates = healthy.length > 0 ? healthy : this.instances;

    if (candidates.length === 0) {
      throw new Error('No backend instances available in pool');
    }

    let selected: BackendInstance;

    switch (config.loadBalancer.algorithm) {
      case 'least-connections': {
        selected = candidates.reduce((min, cur) =>
          cur.activeConnections < min.activeConnections ? cur : min
        );
        break;
      }
      case 'random': {
        const idx = Math.floor(Math.random() * candidates.length);
        selected = candidates[idx];
        break;
      }
      case 'round-robin':
      default: {
        this.roundRobinIndex = (this.roundRobinIndex + 1) % candidates.length;
        selected = candidates[this.roundRobinIndex];
        break;
      }
    }

    selected.activeConnections++;
    selected.totalRequests++;
    this.totalRequestsRouted++;

    return selected;
  }

  public releaseConnection(instanceId: string, responseTimeMs: number): void {
    const instance = this.instances.find((i) => i.id === instanceId);
    if (instance) {
      instance.activeConnections = Math.max(0, instance.activeConnections - 1);
      instance.lastResponseTimeMs = responseTimeMs;
    }
  }

  public setAlgorithm(algo: 'round-robin' | 'least-connections' | 'random'): void {
    config.loadBalancer.algorithm = algo;
  }

  public setReplicaCount(count: number): void {
    const safeCount = Math.max(1, Math.min(12, count));
    this.initInstances(safeCount);
  }

  public setLbReplicas(count: number): void {
    config.loadBalancer.replicas = Math.max(1, Math.min(6, count));
  }

  public setLbScalingMode(mode: 'single' | 'fixed' | 'autoscaling'): void {
    config.loadBalancer.scalingMode = mode;
    if (mode === 'single') {
      config.loadBalancer.replicas = 1;
    }
  }

  private startHealthCheckLoop(): void {
    setInterval(() => {
      // Simulate slight dynamic fluctuation of CPU and memory per pod
      for (const inst of this.instances) {
        inst.uptimeSeconds += 5;
        // Base CPU relates to active connections
        const connLoad = inst.activeConnections * 4;
        const jitter = Math.floor(Math.random() * 6) - 3;
        inst.cpuPercent = Math.max(5, Math.min(99, 15 + connLoad + jitter));
        inst.memoryPercent = Math.max(15, Math.min(90, 30 + Math.floor(inst.totalRequests / 100) % 20));
      }
    }, 5000);
  }

  public getMetrics(): LoadBalancerMetrics {
    const activeConns = this.instances.reduce((acc, i) => acc + i.activeConnections, 0);
    // LB CPU is related to traffic throughput
    const lbCpu = Math.min(95, Math.max(8, Math.floor(activeConns * 1.5) + (config.loadBalancer.replicas > 1 ? 12 : 22)));

    return {
      algorithm: config.loadBalancer.algorithm,
      scalingMode: config.loadBalancer.scalingMode,
      replicas: config.loadBalancer.replicas,
      totalRequestsRouted: this.totalRequestsRouted,
      activeConnections: activeConns,
      cpuUtilizationPercent: lbCpu,
      instances: [...this.instances],
    };
  }
}

export const loadBalancerService = new LoadBalancerService();
