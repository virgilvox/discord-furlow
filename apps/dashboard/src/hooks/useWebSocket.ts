/**
 * WebSocket hook for real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const WS_URL = import.meta.env.DEV ? 'ws://localhost:3000/ws' : `wss://${window.location.host}/ws`;

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

export interface ModerationEvent {
  guildId: string;
  type: 'warning' | 'kick' | 'ban' | 'mute' | 'unmute' | 'unban';
  userId: string;
  moderatorId: string;
  reason?: string;
  timestamp: number;
}

export interface MemberEvent {
  guildId: string;
  type: 'join' | 'leave';
  userId: string;
  username: string;
  timestamp: number;
}

type WSMessage =
  | { type: 'bot_status'; payload: BotStatus }
  | { type: 'guild_stats'; payload: GuildStats }
  | { type: 'now_playing'; payload: NowPlaying }
  | { type: 'moderation_event'; payload: ModerationEvent }
  | { type: 'member_event'; payload: MemberEvent }
  | { type: 'pong'; payload: number };

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [guildStats, setGuildStats] = useState<Map<string, GuildStats>>(new Map());
  const [nowPlaying, setNowPlaying] = useState<Map<string, NowPlaying>>(new Map());
  const [lastModerationEvent, setLastModerationEvent] = useState<ModerationEvent | null>(null);
  const [lastMemberEvent, setLastMemberEvent] = useState<MemberEvent | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');

      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'bot_status':
            setBotStatus(message.payload);
            break;

          case 'guild_stats':
            setGuildStats((prev) => {
              const next = new Map(prev);
              next.set(message.payload.guildId, message.payload);
              return next;
            });
            break;

          case 'now_playing':
            setNowPlaying((prev) => {
              const next = new Map(prev);
              next.set(message.payload.guildId, message.payload);
              return next;
            });
            break;

          case 'moderation_event':
            setLastModerationEvent(message.payload);
            break;

          case 'member_event':
            setLastMemberEvent(message.payload);
            break;

          case 'pong':
            // Handle pong response if needed
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  const subscribeToGuild = useCallback((guildId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe_guild',
        payload: guildId,
      }));
    }
  }, []);

  const unsubscribeFromGuild = useCallback((guildId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe_guild',
        payload: guildId,
      }));
    }
  }, []);

  const ping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connected,
    botStatus,
    guildStats,
    nowPlaying,
    lastModerationEvent,
    lastMemberEvent,
    subscribeToGuild,
    unsubscribeFromGuild,
    ping,
  };
}

/**
 * Hook for subscribing to a specific guild
 */
export function useGuildWebSocket(guildId: string | undefined) {
  const ws = useWebSocket();

  useEffect(() => {
    if (guildId) {
      ws.subscribeToGuild(guildId);
      return () => ws.unsubscribeFromGuild(guildId);
    }
    return undefined;
  }, [guildId, ws]);

  return {
    connected: ws.connected,
    botStatus: ws.botStatus,
    stats: guildId ? ws.guildStats.get(guildId) : undefined,
    nowPlaying: guildId ? ws.nowPlaying.get(guildId) : undefined,
    lastModerationEvent: ws.lastModerationEvent,
    lastMemberEvent: ws.lastMemberEvent,
  };
}
