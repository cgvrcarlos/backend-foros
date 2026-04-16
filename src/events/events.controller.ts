import { Controller, Get, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { EventsGateway } from './events.gateway';
import { Public } from '../auth/decorators/public.decorator';

@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly eventsGateway: EventsGateway) {}

  /**
   * SSE endpoint for real-time event streaming
   * 
   * Clients connect to this endpoint and receive Server-Sent Events
   * for real-time updates (new posts, comments, votes).
   */
  @Get('stream')
  @Public() // Can be public or protected depending on requirements
  async streamEvents(@Res() res: Response) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Register client
    this.eventsGateway.addClient(res);
    
    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

    // Subscribe to events and stream to client
    const subscription = this.eventsGateway.getEvents().subscribe((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    // Cleanup on client disconnect
    res.on('close', () => {
      subscription.unsubscribe();
      this.eventsGateway.removeClient(res);
      this.logger.debug('SSE client disconnected');
    });
  }
}