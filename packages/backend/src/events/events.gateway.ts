import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import * as ws from 'ws';

export interface RealtimeEventPayload {
  session_id: string;
  event_type: string;
  page_url: string;
  timestamp: string;
  x?: number;
  y?: number;
  viewport?: { w: number; h: number };
  referrer?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

@WebSocketGateway({ path: '/ws/events' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: ws.Server;

  handleConnection(_client: ws.WebSocket) {
    this.logger.debug('Dashboard client connected to WebSocket event stream');
  }

  handleDisconnect(_client: ws.WebSocket) {
    this.logger.debug('Dashboard client disconnected from WebSocket event stream');
  }

  broadcastEvents(events: RealtimeEventPayload[]): void {
    if (!this.server?.clients) return;

    const message = JSON.stringify({
      type: 'events',
      data: events,
      timestamp: new Date().toISOString(),
    });

    for (const client of this.server.clients) {
      if (client.readyState === ws.WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}
