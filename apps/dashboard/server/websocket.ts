/**
 * WebSocket server for real-time dashboard updates
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server, IncomingMessage } from 'http';
import type { RequestHandler, Request, Response } from 'express';
import type { Profile } from 'passport-discord';

export interface WSMessage {
  type: string;
  payload: unknown;
}

export interface BotStatus {
  online: boolean;
  guilds: number;
  users: number;
  uptime: number;
  ping: number;
}

export interface GuildStats {
  guildId: string;
  memberCount: number;
  onlineCount: number;
  messageCount: number;
}

export interface NowPlaying {
  guildId: string;
  track: {
    title: string;
    artist: string;
    duration: number;
    position: number;
    thumbnail?: string;
  } | null;
  queue: number;
  volume: number;
  paused: boolean;
}

// Store connected clients by guild subscription
const guildSubscriptions = new Map<string, Set<WebSocket>>();
const allClients = new Set<WebSocket>();

// Per-socket auth context. Pulled from the session at upgrade time.
const socketUsers = new WeakMap<WebSocket, Profile>();

// Current bot status
let botStatus: BotStatus = {
  online: false,
  guilds: 0,
  users: 0,
  uptime: 0,
  ping: 0,
};

const MANAGE_GUILD = 0x20;

function userCanManageGuild(user: Profile | undefined, guildId: string): boolean {
  if (!user) return false;
  const guild = user.guilds?.find((g) => g.id === guildId);
  if (!guild) return false;
  return (parseInt(guild.permissions) & MANAGE_GUILD) === MANAGE_GUILD;
}

/**
 * Run express-session against a raw IncomingMessage so we can read the
 * authenticated user during the WebSocket upgrade. Resolves to the
 * passport user (if any) or null.
 */
function authenticateUpgrade(
  sessionMiddleware: RequestHandler,
  request: IncomingMessage
): Promise<Profile | null> {
  return new Promise((resolve) => {
    // If the session store is unavailable or misconfigured the middleware
    // may never call next(). A 5s cap keeps a broken store from holding
    // half-open sockets indefinitely. Errors from the middleware are
    // surfaced via the err arg and treated as "not authenticated" rather
    // than propagated (the upgrade path has no express error chain).
    const timer = setTimeout(() => resolve(null), 5000);
    try {
      sessionMiddleware(request as Request, {} as Response, (err?: unknown) => {
        clearTimeout(timer);
        if (err) {
          console.error('WebSocket session middleware error:', err);
          resolve(null);
          return;
        }
        const session = (request as Request).session as unknown as
          | { passport?: { user?: Profile } }
          | undefined;
        resolve(session?.passport?.user ?? null);
      });
    } catch (err) {
      clearTimeout(timer);
      console.error('WebSocket session middleware threw:', err);
      resolve(null);
    }
  });
}

/**
 * Initialize WebSocket server. The session middleware is required so
 * connections can be tied to an authenticated dashboard user; clients
 * without a valid session are rejected at upgrade time.
 */
export function initWebSocket(
  server: Server,
  sessionMiddleware: RequestHandler
): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = request.url ?? '';
    if (!url.startsWith('/ws')) return;

    void authenticateUpgrade(sessionMiddleware, request).then((user) => {
      if (!user) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        socketUsers.set(ws, user);
        wss.emit('connection', ws, request);
      });
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    allClients.add(ws);

    // Send initial bot status
    ws.send(JSON.stringify({
      type: 'bot_status',
      payload: botStatus,
    }));

    ws.on('message', (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (err) {
        console.error('Invalid WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      allClients.delete(ws);

      // Remove from all guild subscriptions
      for (const subscribers of guildSubscriptions.values()) {
        subscribers.delete(ws);
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  });

  return wss;
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(ws: WebSocket, message: WSMessage): void {
  switch (message.type) {
    case 'subscribe_guild': {
      const guildId = message.payload;
      if (typeof guildId !== 'string' || guildId.length === 0) {
        ws.send(JSON.stringify({ type: 'error', payload: 'subscribe_guild: payload must be a guild id' }));
        return;
      }
      const user = socketUsers.get(ws);
      if (!userCanManageGuild(user, guildId)) {
        ws.send(JSON.stringify({ type: 'error', payload: 'subscribe_guild: forbidden' }));
        return;
      }
      if (!guildSubscriptions.has(guildId)) {
        guildSubscriptions.set(guildId, new Set());
      }
      guildSubscriptions.get(guildId)!.add(ws);
      break;
    }

    case 'unsubscribe_guild': {
      const guildId = message.payload;
      if (typeof guildId !== 'string') return;
      guildSubscriptions.get(guildId)?.delete(ws);
      break;
    }

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', payload: Date.now() }));
      break;

    default:
      console.warn('Unknown WebSocket message type:', message.type);
  }
}

/**
 * Broadcast bot status to all connected clients
 */
export function broadcastBotStatus(status: BotStatus): void {
  botStatus = status;
  const message = JSON.stringify({
    type: 'bot_status',
    payload: status,
  });

  for (const ws of allClients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

/**
 * Broadcast guild stats to subscribers
 */
export function broadcastGuildStats(stats: GuildStats): void {
  const subscribers = guildSubscriptions.get(stats.guildId);
  if (!subscribers) return;

  const message = JSON.stringify({
    type: 'guild_stats',
    payload: stats,
  });

  for (const ws of subscribers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

/**
 * Broadcast now playing to guild subscribers
 */
export function broadcastNowPlaying(nowPlaying: NowPlaying): void {
  const subscribers = guildSubscriptions.get(nowPlaying.guildId);
  if (!subscribers) return;

  const message = JSON.stringify({
    type: 'now_playing',
    payload: nowPlaying,
  });

  for (const ws of subscribers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

/**
 * Broadcast a moderation event to guild subscribers
 */
export function broadcastModerationEvent(guildId: string, event: {
  type: 'warning' | 'kick' | 'ban' | 'mute' | 'unmute' | 'unban';
  userId: string;
  moderatorId: string;
  reason?: string;
}): void {
  const subscribers = guildSubscriptions.get(guildId);
  if (!subscribers) return;

  const message = JSON.stringify({
    type: 'moderation_event',
    payload: {
      guildId,
      ...event,
      timestamp: Date.now(),
    },
  });

  for (const ws of subscribers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

/**
 * Broadcast a member join/leave event
 */
export function broadcastMemberEvent(guildId: string, event: {
  type: 'join' | 'leave';
  userId: string;
  username: string;
}): void {
  const subscribers = guildSubscriptions.get(guildId);
  if (!subscribers) return;

  const message = JSON.stringify({
    type: 'member_event',
    payload: {
      guildId,
      ...event,
      timestamp: Date.now(),
    },
  });

  for (const ws of subscribers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

/**
 * Get number of connected clients
 */
export function getConnectedClients(): number {
  return allClients.size;
}

/**
 * Get number of guild subscribers
 */
export function getGuildSubscribers(guildId: string): number {
  return guildSubscriptions.get(guildId)?.size ?? 0;
}
