import { Router, Request, Response } from 'express';
import { loadGeneratorService, LoadTestConfig } from '../services/loadgenerator';
import { config } from '../config';

const router = Router();

// POST /api/load-test/start
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { scenario, concurrentUsers, durationSeconds, targetRps } = req.body;

    // Validation with expanded capacity
    const testConfig: LoadTestConfig = {
      scenario: scenario || 'get_product_cached',
      concurrentUsers: Math.min(1000, Math.max(1, parseInt(concurrentUsers || '10', 10))),
      durationSeconds: Math.min(600, Math.max(3, parseInt(durationSeconds || '15', 10))),
      targetRps: targetRps ? Math.min(5000, Math.max(1, parseInt(targetRps, 10))) : undefined,
    };

    const host = req.get('host') || `localhost:${config.port}`;
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    const status = await loadGeneratorService.start(testConfig, baseUrl);
    res.json({ message: 'Load test initiated successfully', status });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to start load test', message: err?.message });
  }
});

// POST /api/load-test/stop
router.post('/stop', (req: Request, res: Response) => {
  const status = loadGeneratorService.stop();
  res.json({ message: 'Load test stopped', status });
});

// GET /api/load-test/status
router.get('/status', (req: Request, res: Response) => {
  res.json(loadGeneratorService.getStatus());
});

export default router;
