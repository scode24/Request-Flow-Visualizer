import { v4 as uuidv4 } from 'uuid';
import { broadcastEvent } from '../websocket/wsServer';

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string | null;
  component: 'client' | 'cdn' | 'gateway' | 'loadbalancer' | 'backend' | 'cache' | 'database' | 'storage' | 'autoscaler';
  instanceId?: string;
  operation: string;
  status: 'start' | 'success' | 'error' | 'cache-hit' | 'cache-miss' | 'bypassed';
  startTime: number;
  endTime?: number;
  durationMs?: number;
  details?: Record<string, any>;
}

export interface TraceSummary {
  traceId: string;
  method: string;
  path: string;
  statusCode?: number;
  totalDurationMs?: number;
  startTime: number;
  endTime?: number;
  backendInstance?: string;
  cdnOutcome?: 'hit' | 'miss' | 'bypassed';
  cacheOutcome?: 'hit' | 'miss' | 'bypassed';
  databaseQueried: boolean;
  storageAccessed: boolean;
  spans: TraceSpan[];
  error?: string;
}

// In-memory ring buffer of the most recent 200 traces for inspection
const TRACE_HISTORY_LIMIT = 200;
const recentTraces: Map<string, TraceSummary> = new Map();

export class Tracer {
  public static startTrace(method: string, path: string, traceIdOverride?: string): TraceSummary {
    const traceId = traceIdOverride || uuidv4();
    const trace: TraceSummary = {
      traceId,
      method,
      path,
      startTime: Date.now(),
      databaseQueried: false,
      storageAccessed: false,
      spans: [],
    };

    if (recentTraces.size >= TRACE_HISTORY_LIMIT) {
      const oldestKey = recentTraces.keys().next().value;
      if (oldestKey) recentTraces.delete(oldestKey);
    }
    recentTraces.set(traceId, trace);

    return trace;
  }

  public static addSpan(
    traceId: string,
    component: TraceSpan['component'],
    operation: string,
    status: TraceSpan['status'],
    parentSpanId?: string | null,
    instanceId?: string,
    details?: Record<string, any>,
    durationMs?: number
  ): TraceSpan {
    const span: TraceSpan = {
      traceId,
      spanId: uuidv4().slice(0, 8),
      parentSpanId: parentSpanId || null,
      component,
      instanceId,
      operation,
      status,
      startTime: Date.now() - (durationMs || 0),
      endTime: Date.now(),
      durationMs: durationMs || 0,
      details,
    };

    const trace = recentTraces.get(traceId);
    if (trace) {
      trace.spans.push(span);
      if (component === 'cdn') {
        if (status === 'cache-hit') trace.cdnOutcome = 'hit';
        else if (status === 'cache-miss') trace.cdnOutcome = 'miss';
        else if (status === 'bypassed') trace.cdnOutcome = 'bypassed';
      }
      if (component === 'cache') {
        if (status === 'cache-hit') trace.cacheOutcome = 'hit';
        else if (status === 'cache-miss') trace.cacheOutcome = 'miss';
        else if (status === 'bypassed') trace.cacheOutcome = 'bypassed';
      }
      if (component === 'database') {
        trace.databaseQueried = true;
      }
      if (component === 'storage') {
        trace.storageAccessed = true;
      }
      if (component === 'backend' && instanceId) {
        trace.backendInstance = instanceId;
      }
    }

    // Broadcast live event over WebSocket
    broadcastEvent('trace_event', {
      type: 'trace_event',
      span,
      timestamp: Date.now(),
    });

    return span;
  }

  public static completeTrace(
    traceId: string,
    statusCode: number,
    error?: string
  ): TraceSummary | undefined {
    const trace = recentTraces.get(traceId);
    if (!trace) return undefined;

    trace.statusCode = statusCode;
    trace.endTime = Date.now();
    trace.totalDurationMs = trace.endTime - trace.startTime;
    trace.error = error;

    broadcastEvent('trace_completed', {
      type: 'trace_completed',
      trace,
      timestamp: Date.now(),
    });

    return trace;
  }

  public static getTrace(traceId: string): TraceSummary | undefined {
    return recentTraces.get(traceId);
  }

  public static getRecentTraces(limit: number = 50): TraceSummary[] {
    return Array.from(recentTraces.values())
      .slice(-limit)
      .reverse();
  }

  public static clearTraces(): void {
    recentTraces.clear();
  }
}
