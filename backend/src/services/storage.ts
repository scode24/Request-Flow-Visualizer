import * as Minio from 'minio';
import { config } from '../config';

export interface StorageMetrics {
  connected: boolean;
  isRealMinio: boolean;
  totalReads: number;
  totalWrites: number;
  bucketName: string;
  objectsCount: number;
  avgLatencyMs: number;
}

interface StoredObject {
  name: string;
  size: number;
  lastModified: Date;
  content: string;
  contentType: string;
}

class StorageService {
  private minioClient: Minio.Client | null = null;
  private isConnected = false;
  private totalReads = 0;
  private totalWrites = 0;
  private latencies: number[] = [];

  // Fallback in-memory object storage with demo JSON documents
  private memoryObjects: Map<string, StoredObject> = new Map([
    [
      'architecture-spec.json',
      {
        name: 'architecture-spec.json',
        size: 1420,
        lastModified: new Date(),
        content: JSON.stringify({
          systemName: 'Distributed Request Flow Platform',
          topology: ['client', 'cdn', 'gateway', 'loadbalancer', 'backend', 'redis', 'postgres', 'minio'],
          protocol: 'HTTP/2 & WebSocket',
          version: '2.4.0',
          tier: 'enterprise-production',
        }, null, 2),
        contentType: 'application/json',
      },
    ],
    [
      'product-catalog.json',
      {
        name: 'product-catalog.json',
        size: 3200,
        lastModified: new Date(),
        content: JSON.stringify({
          catalogVersion: '2026.10',
          categories: ['Hardware', 'Networking', 'Edge Computing', 'Optics', 'Servers'],
          activeSKUs: 5,
          currency: 'USD',
          warehouseRegion: 'us-east-1',
        }, null, 2),
        contentType: 'application/json',
      },
    ],
    [
      'system-config.json',
      {
        name: 'system-config.json',
        size: 890,
        lastModified: new Date(),
        content: JSON.stringify({
          hpaEnabled: true,
          minReplicas: 2,
          maxReplicas: 8,
          cpuTargetPercent: 65,
          cacheTTL: 60,
          cdnEnabled: true,
        }, null, 2),
        contentType: 'application/json',
      },
    ],
  ]);

  constructor() {
    this.init();
  }

  private async init() {
    try {
      this.minioClient = new Minio.Client({
        endPoint: config.minio.endPoint,
        port: config.minio.port,
        useSSL: config.minio.useSSL,
        accessKey: config.minio.accessKey,
        secretKey: config.minio.secretKey,
      });

      // Check if bucket exists, or create it
      const bucketExists = await this.minioClient.bucketExists(config.minio.bucket);
      if (!bucketExists) {
        await this.minioClient.makeBucket(config.minio.bucket, 'us-east-1');
        // upload sample objects
        for (const [key, obj] of this.memoryObjects.entries()) {
          const buf = Buffer.from(obj.content);
          await this.minioClient.putObject(config.minio.bucket, key, buf, buf.length, {
            'Content-Type': obj.contentType,
          });
        }
        console.log(`📦 [MinIO] Created bucket '${config.minio.bucket}' and uploaded initial JSON objects.`);
      }

      this.isConnected = true;
      console.log('✅ [MinIO] Connected successfully to host: ' + config.minio.endPoint);
    } catch (err: any) {
      this.isConnected = false;
      console.log('⚠️ [MinIO] Live MinIO unavailable (' + (err?.message || 'timeout') + '). Initialized In-Memory Emulation Mode.');
    }
  }

  public async getObject(key: string): Promise<{ data: any; durationMs: number; sizeBytes: number } | null> {
    const start = Date.now();
    this.totalReads++;

    if (this.isConnected && this.minioClient) {
      try {
        const stream = await this.minioClient.getObject(config.minio.bucket, key);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const duration = Date.now() - start;
        this.recordLatency(duration);

        let data: any = buffer.toString('utf-8');
        try {
          data = JSON.parse(data);
        } catch (e) {}

        return { data, durationMs: duration, sizeBytes: buffer.length };
      } catch (err) {
        console.error('[MinIO] Read error, trying memory store:', err);
      }
    }

    // Memory store fallback with realistic network I/O delay
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 8) + 12));
    const duration = Date.now() - start;
    this.recordLatency(duration);

    const obj = this.memoryObjects.get(key);
    if (!obj) return null;

    let parsed = obj.content;
    try {
      parsed = JSON.parse(obj.content);
    } catch (e) {}

    return { data: parsed, durationMs: duration, sizeBytes: obj.size };
  }

  public async putObject(key: string, content: string | object, contentType = 'application/json'): Promise<{ success: boolean; durationMs: number }> {
    const start = Date.now();
    this.totalWrites++;
    const strContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    if (this.isConnected && this.minioClient) {
      try {
        const buf = Buffer.from(strContent);
        await this.minioClient.putObject(config.minio.bucket, key, buf, buf.length, {
          'Content-Type': contentType,
        });
        const duration = Date.now() - start;
        this.recordLatency(duration);
        return { success: true, durationMs: duration };
      } catch (err) {
        console.error('[MinIO] Put error, saving to memory store:', err);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 15));
    const duration = Date.now() - start;
    this.recordLatency(duration);

    this.memoryObjects.set(key, {
      name: key,
      size: Buffer.byteLength(strContent),
      lastModified: new Date(),
      content: strContent,
      contentType,
    });

    return { success: true, durationMs: duration };
  }

  public async listObjects(): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
    if (this.isConnected && this.minioClient) {
      try {
        const stream = this.minioClient.listObjects(config.minio.bucket, '', true);
        const list: Array<{ name: string; size: number; lastModified: Date }> = [];
        for await (const obj of stream) {
          list.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
          });
        }
        return list;
      } catch (err) {
        console.error('[MinIO] List objects error:', err);
      }
    }

    return Array.from(this.memoryObjects.values()).map((o) => ({
      name: o.name,
      size: o.size,
      lastModified: o.lastModified,
    }));
  }

  private recordLatency(ms: number) {
    this.latencies.push(ms);
    if (this.latencies.length > 100) this.latencies.shift();
  }

  public getMetrics(): StorageMetrics {
    const avg =
      this.latencies.length > 0
        ? Math.round((this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length) * 10) / 10
        : 14.5;

    return {
      connected: this.isConnected,
      isRealMinio: this.isConnected,
      totalReads: this.totalReads,
      totalWrites: this.totalWrites,
      bucketName: config.minio.bucket,
      objectsCount: this.memoryObjects.size,
      avgLatencyMs: avg,
    };
  }
}

export const storageService = new StorageService();
