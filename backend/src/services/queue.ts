import { v4 as uuidv4 } from 'uuid';
import { broadcastEvent } from '../websocket/wsServer';

export interface QueueMessage {
  id: string;
  topic: string;
  partition: number;
  payload: Record<string, any>;
  timestamp: number;
  isPoisonPill?: boolean;
  status: 'queued' | 'processing' | 'completed' | 'dead-letter';
  retryCount?: number;
}

export interface WorkerInstance {
  id: string;
  name: string;
  status: 'idle' | 'processing' | 'degraded';
  processedCount: number;
  cpuPercent: number;
  activeJobId?: string | null;
  avgLatencyMs: number;
}

export interface QueueMetrics {
  topic: string;
  partitions: number;
  queueDepth: number;
  consumerLag: number;
  totalPublished: number;
  totalConsumed: number;
  throughputMsgPerSec: number;
  deadLetterQueueCount: number;
  workers: WorkerInstance[];
  recentMessages: QueueMessage[];
}

class QueueService {
  private topic = 'events.async.stream';
  private partitions = 3;
  private queue: QueueMessage[] = [];
  private deadLetterQueue: QueueMessage[] = [];
  private totalPublished = 0;
  private totalConsumed = 0;
  private recentMessages: QueueMessage[] = [];
  private publishedInLastSecond = 0;
  private throughputMsgPerSec = 0;

  private workers: WorkerInstance[] = [
    {
      id: 'worker-instance-1',
      name: 'Event Consumer #1',
      status: 'idle',
      processedCount: 0,
      cpuPercent: 12,
      activeJobId: null,
      avgLatencyMs: 25,
    },
    {
      id: 'worker-instance-2',
      name: 'Event Consumer #2',
      status: 'idle',
      processedCount: 0,
      cpuPercent: 10,
      activeJobId: null,
      avgLatencyMs: 28,
    },
  ];

  constructor() {
    this.startWorkerProcessingLoop();
    this.startThroughputTicker();
  }

  // Ticker for throughput calculation
  private startThroughputTicker() {
    setInterval(() => {
      this.throughputMsgPerSec = this.publishedInLastSecond;
      this.publishedInLastSecond = 0;
    }, 1000);
  }

  // Background consumer processing loop
  private startWorkerProcessingLoop() {
    setInterval(() => {
      if (this.queue.length === 0) {
        this.workers.forEach((w) => {
          w.status = 'idle';
          w.activeJobId = null;
          w.cpuPercent = Math.max(8, w.cpuPercent - 2);
        });
        return;
      }

      // Each available worker picks up 1 message
      for (const worker of this.workers) {
        if (this.queue.length === 0) break;

        const msg = this.queue.shift();
        if (!msg) break;

        worker.status = 'processing';
        worker.activeJobId = msg.id;
        worker.cpuPercent = Math.min(95, Math.max(35, worker.cpuPercent + 15));

        // Simulate async work processing
        setTimeout(() => {
          if (msg.isPoisonPill) {
            // Poison pill fails consumer parsing -> routes directly into Dead Letter Queue (DLQ)!
            msg.status = 'dead-letter';
            this.deadLetterQueue.unshift(msg);
            if (this.deadLetterQueue.length > 50) this.deadLetterQueue.pop();
            worker.status = 'degraded';
            console.log(`☠️ [Dead Letter Queue] Poison-pill message routed to DLQ: ${msg.id}`);
          } else {
            msg.status = 'completed';
            this.totalConsumed++;
            worker.processedCount++;
            worker.status = 'idle';
            worker.activeJobId = null;
          }
        }, 120 + Math.floor(Math.random() * 80));
      }
    }, 250);
  }

  public publishMessage(payload: Record<string, any>, isPoisonPill = false): QueueMessage {
    const partition = Math.floor(Math.random() * this.partitions);
    const msg: QueueMessage = {
      id: `msg-${uuidv4().slice(0, 8)}`,
      topic: this.topic,
      partition,
      payload,
      timestamp: Date.now(),
      isPoisonPill,
      status: 'queued',
      retryCount: 0,
    };

    this.queue.push(msg);
    this.totalPublished++;
    this.publishedInLastSecond++;

    this.recentMessages.unshift(msg);
    if (this.recentMessages.length > 30) {
      this.recentMessages.pop();
    }

    return msg;
  }

  public simulateBurst(count = 15): { published: number; lag: number } {
    for (let i = 0; i < count; i++) {
      this.publishMessage({
        event: 'order.placed',
        userId: Math.floor(Math.random() * 9000) + 1000,
        amount: Math.round(Math.random() * 500 * 100) / 100,
        index: i + 1,
      });
    }
    return { published: count, lag: this.queue.length };
  }

  public injectPoisonPill(): QueueMessage {
    return this.publishMessage(
      {
        event: 'malformed.poison.payload',
        corruptedBytes: '0xDEADBEEF',
        error: 'JSON_SYNTAX_PARSER_EXCEPTION',
      },
      true
    );
  }

  public clear(): void {
    this.queue = [];
    this.deadLetterQueue = [];
    this.workers.forEach((w) => {
      w.status = 'idle';
      w.activeJobId = null;
      w.cpuPercent = 10;
    });
  }

  public getMetrics(): QueueMetrics {
    return {
      topic: this.topic,
      partitions: this.partitions,
      queueDepth: this.queue.length,
      consumerLag: this.queue.length, // consumer lag equals queue depth in this model
      totalPublished: this.totalPublished,
      totalConsumed: this.totalConsumed,
      throughputMsgPerSec: this.throughputMsgPerSec,
      deadLetterQueueCount: this.deadLetterQueue.length,
      workers: this.workers.map((w) => ({ ...w })),
      recentMessages: [...this.recentMessages],
    };
  }
}

export const queueService = new QueueService();
