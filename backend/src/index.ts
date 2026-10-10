import express from 'express';
import cors from 'cors';
import http from 'http';
import { config } from './config';
import { initWebSocketServer, broadcastEvent, getConnectedClientCount } from './websocket/wsServer';
import apiRoutes from './routes/api';
import loadtestRoutes from './routes/loadtest';
import componentRoutes from './routes/components';
import configRoutes from './routes/config';
import metricsRoutes from './routes/metrics';
import { databaseService } from './services/database';
import { cacheService } from './services/cache';
import { storageService } from './services/storage';
import { loadBalancerService } from './services/loadbalancer';
import { cdnService } from './services/cdn';
import { autoscalerService } from './services/autoscaler';
import { loadGeneratorService } from './services/loadgenerator';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Initialize WebSocket
initWebSocketServer(server);

// Routes
app.use('/api', apiRoutes);
app.use('/api/load-test', loadtestRoutes);
app.use('/api/test', componentRoutes);
app.use('/api/config', configRoutes);
app.use('/api/metrics', metricsRoutes);

// Periodic Telemetry Broadcaster (1 sec interval)
setInterval(() => {
  if (getConnectedClientCount() > 0) {
    broadcastEvent('telemetry_tick', {
      type: 'telemetry_tick',
      timestamp: Date.now(),
      data: {
        database: databaseService.getMetrics(),
        cache: cacheService.getMetrics(),
        storage: storageService.getMetrics(),
        cdn: cdnService.getMetrics(),
        loadBalancer: loadBalancerService.getMetrics(),
        autoscaler: autoscalerService.getMetrics(),
        loadTest: loadGeneratorService.getStatus(),
      },
    });
  }
}, 1000);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err?.message });
});

// Start Server
server.listen(config.port, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 [Distributed Flow Backend] Running on http://localhost:${config.port}`);
  console.log(`📡 [WebSocket Server] Ready at ws://localhost:${config.port}/ws`);
  console.log(`📊 [Prometheus Metrics] Available at http://localhost:${config.port}/api/metrics`);
  console.log(`🛠️ [Environment] ${config.environment} | Mode: ${config.infrastructureMode}`);
  console.log(`======================================================\n`);
});

export default app;
