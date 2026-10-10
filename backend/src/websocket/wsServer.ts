import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

let wss: WebSocketServer | null = null;
const activeClients: Set<WebSocket> = new Set();

export function initWebSocketServer(server: http.Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    activeClients.add(ws);

    // Send initial handshake
    ws.send(JSON.stringify({
      type: 'connection_established',
      timestamp: Date.now(),
      clientCount: activeClients.size,
    }));

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (err) {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      activeClients.delete(ws);
    });

    ws.on('error', () => {
      activeClients.delete(ws);
    });
  });

  return wss;
}

export function broadcastEvent(eventType: string, payload: any): void {
  if (!wss || activeClients.size === 0) return;

  const message = JSON.stringify(payload);
  for (const client of activeClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

export function getConnectedClientCount(): number {
  return activeClients.size;
}
