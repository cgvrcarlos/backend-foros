import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface ServerEvent {
  type: string;
  data: any;
  timestamp?: number;
}

@Injectable()
export class EventsGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsGateway.name);
  private readonly eventSubject = new Subject<ServerEvent>();
  private readonly clients = new Set<any>();

  onModuleInit() {
    this.logger.log('EventsGateway initialized');
  }

  onModuleDestroy() {
    this.logger.log('Cleaning up SSE connections');
    this.clients.forEach((res) => {
      res.close();
    });
    this.clients.clear();
  }

  /**
   * Subscribe to all events (SSE response)
   */
  getEvents(): Observable<ServerEvent> {
    return this.eventSubject.asObservable();
  }

  /**
   * Broadcast an event to all subscribed clients
   */
  broadcast(event: ServerEvent): void {
    this.logger.debug(`Broadcasting event: ${event.type}`);
    this.eventSubject.next({
      ...event,
      timestamp: Date.now(),
    });
  }

  // Forum feature (uncomment when Post/Comment models are added)
  // broadcastPostCreated(post: any): void { ... }
  // broadcastPostUpdated(post: any): void { ... }
  // broadcastCommentCreated(comment: any): void { ... }

  /**
   * Register a client for SSE
   */
  addClient(client: any): void {
    this.clients.add(client);
    this.logger.debug(`Client connected. Total clients: ${this.clients.size}`);
  }

  /**
   * Remove a client from SSE
   */
  removeClient(client: any): void {
    this.clients.delete(client);
    this.logger.debug(`Client disconnected. Total clients: ${this.clients.size}`);
  }
}