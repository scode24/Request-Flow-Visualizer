import { config } from '../config';
import { loadBalancerService } from './loadbalancer';
import { broadcastEvent } from '../websocket/wsServer';

export interface ScalingEvent {
  id: string;
  timestamp: number;
  type: 'scale-up' | 'scale-down';
  previousReplicas: number;
  newReplicas: number;
  currentCpuPercent: number;
  targetCpuPercent: number;
  reason: string;
}

export interface AutoscalerMetrics {
  enabled: boolean;
  minReplicas: number;
  maxReplicas: number;
  currentReplicas: number;
  targetCpuPercent: number;
  currentCpuPercent: number;
  lastScalingTime?: number;
  recentEvents: ScalingEvent[];
}

class AutoscalerService {
  private recentEvents: ScalingEvent[] = [];
  private lastScalingTime = 0;
  private cooldownSeconds = 8; // fast responsiveness for live demo testing
  private scaleDownStabilization = 15;

  constructor() {
    this.startEvaluationLoop();
  }

  private lastSuggestionTime = 0;

  private startEvaluationLoop(): void {
    setInterval(() => {
      const instances = loadBalancerService.getMetrics().instances;
      if (instances.length === 0) return;

      const avgCpu = Math.round(
        instances.reduce((acc, i) => acc + i.cpuPercent, 0) / instances.length
      );

      const now = Date.now();
      const timeSinceLastScale = (now - this.lastScalingTime) / 1000;
      const timeSinceLastSuggestion = (now - this.lastSuggestionTime) / 1000;

      // If Autoscaling is ENABLED
      if (config.backend.autoscalingEnabled) {
        // Scale Up Condition: CPU > target and below maxReplicas
        if (avgCpu > config.backend.targetCpuPercent && instances.length < config.backend.maxReplicas) {
          if (timeSinceLastScale >= this.cooldownSeconds) {
            const newCount = Math.min(
              config.backend.maxReplicas,
              instances.length + Math.max(1, Math.ceil((avgCpu - config.backend.targetCpuPercent) / 20))
            );

            // Pre-scaling advisory notification broadcast
            broadcastEvent('scaling_advisory', {
              type: 'scaling_advisory',
              level: 'warning',
              title: 'Autoscaler Trigger Imminent',
              message: `Incoming load elevated CPU to ${avgCpu}% (threshold: ${config.backend.targetCpuPercent}%). Autoscaling is scaling pods from ${instances.length} to ${newCount}!`,
              previousReplicas: instances.length,
              targetReplicas: newCount,
              cpu: avgCpu,
              timestamp: Date.now(),
            });

            this.triggerScale('scale-up', instances.length, newCount, avgCpu, `Avg CPU (${avgCpu}%) exceeded target threshold (${config.backend.targetCpuPercent}%)`);
          }
        }
        // Scale Down Condition
        else if (avgCpu < config.backend.targetCpuPercent - 25 && instances.length > config.backend.minReplicas) {
          if (timeSinceLastScale >= this.scaleDownStabilization) {
            const newCount = Math.max(config.backend.minReplicas, instances.length - 1);
            this.triggerScale('scale-down', instances.length, newCount, avgCpu, `Avg CPU (${avgCpu}%) stabilized well below target (${config.backend.targetCpuPercent}%)`);
          }
        }
      } else {
        // Autoscaling is DISABLED: Provide intelligent recommendations if system is under stress
        if (avgCpu > 65 && timeSinceLastSuggestion >= 8) {
          this.lastSuggestionTime = now;
          const recommendedCount = Math.min(8, instances.length + 2);
          broadcastEvent('scaling_advisory', {
            type: 'scaling_advisory',
            level: 'suggestion',
            title: 'Scaling Advisory (Autoscaler Disabled)',
            message: `Pod CPU is under heavy strain (${avgCpu}%). Autoscaling is disabled. To prevent latency degradation and drop errors, scale backend pods to ${recommendedCount} or enable consistent hashing Redis cluster.`,
            suggestion: {
              recommendedPods: recommendedCount,
              recommendedCache: 'cluster',
              recommendedDbMode: 'read-replicas',
            },
            timestamp: Date.now(),
          });
        }
      }
    }, 2000);
  }

  private triggerScale(
    type: 'scale-up' | 'scale-down',
    prevCount: number,
    newCount: number,
    cpu: number,
    reason: string
  ): void {
    if (prevCount === newCount) return;

    this.lastScalingTime = Date.now();
    loadBalancerService.setReplicaCount(newCount);

    const event: ScalingEvent = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      type,
      previousReplicas: prevCount,
      newReplicas: newCount,
      currentCpuPercent: cpu,
      targetCpuPercent: config.backend.targetCpuPercent,
      reason,
    };

    this.recentEvents.unshift(event);
    if (this.recentEvents.length > 20) this.recentEvents.pop();

    console.log(`📈 [HPA Autoscaler] ${type.toUpperCase()}: ${prevCount} ➔ ${newCount} pods. Reason: ${reason}`);

    broadcastEvent('scaling_event', {
      type: 'scaling_event',
      event,
    });
  }

  public setEnabled(enabled: boolean): void {
    config.backend.autoscalingEnabled = enabled;
  }

  public setTargetCpu(cpu: number): void {
    config.backend.targetCpuPercent = Math.max(20, Math.min(95, cpu));
  }

  public setLimits(min: number, max: number): void {
    config.backend.minReplicas = Math.max(1, min);
    config.backend.maxReplicas = Math.max(config.backend.minReplicas, max);
  }

  public getMetrics(): AutoscalerMetrics {
    const instances = loadBalancerService.getMetrics().instances;
    const avgCpu =
      instances.length > 0
        ? Math.round(instances.reduce((acc, i) => acc + i.cpuPercent, 0) / instances.length)
        : 15;

    return {
      enabled: config.backend.autoscalingEnabled,
      minReplicas: config.backend.minReplicas,
      maxReplicas: config.backend.maxReplicas,
      currentReplicas: instances.length,
      targetCpuPercent: config.backend.targetCpuPercent,
      currentCpuPercent: avgCpu,
      lastScalingTime: this.lastScalingTime || undefined,
      recentEvents: [...this.recentEvents],
    };
  }
}

export const autoscalerService = new AutoscalerService();
