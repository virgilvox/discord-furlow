/**
 * API Client for Dashboard
 */

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

interface FetchOptions extends RequestInit {
  json?: unknown;
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { json, ...fetchOptions } = options;

  const config: RequestInit = {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  };

  if (json) {
    config.body = JSON.stringify(json);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// User API
export const userApi = {
  getUser: () => request<User>('/api/user'),
};

// Guild API
export const guildApi = {
  getGuilds: () => request<Guild[]>('/api/guilds'),
  getGuild: (id: string) => request<GuildDetails>(`/api/guilds/${id}`),
  getSettings: (id: string) => request<GuildSettings>(`/api/guilds/${id}/settings`),
  updateSettings: (id: string, settings: Partial<GuildSettings>) =>
    request<{ success: boolean; settings: GuildSettings }>(`/api/guilds/${id}/settings`, {
      method: 'POST',
      json: settings,
    }),
  getStats: (id: string) => request<GuildStats>(`/api/guilds/${id}/stats`),
};

// Moderation API
export const moderationApi = {
  getWarnings: (guildId: string, page = 1, limit = 20) =>
    request<WarningsResponse>(`/api/guilds/${guildId}/warnings?page=${page}&limit=${limit}`),
  getWarning: (guildId: string, caseId: string) =>
    request<Warning>(`/api/guilds/${guildId}/warnings/${caseId}`),
  deleteWarning: (guildId: string, caseId: string) =>
    request<{ success: boolean }>(`/api/guilds/${guildId}/warnings/${caseId}`, {
      method: 'DELETE',
    }),
};

// Leveling API
export const levelingApi = {
  getLeaderboard: (guildId: string, page = 1, limit = 20) =>
    request<LeaderboardResponse>(`/api/guilds/${guildId}/levels?page=${page}&limit=${limit}`),
  getUserLevel: (guildId: string, userId: string) =>
    request<UserLevel>(`/api/guilds/${guildId}/levels/${userId}`),
  updateUserLevel: (guildId: string, userId: string, data: { xp?: number; level?: number }) =>
    request<UserLevel>(`/api/guilds/${guildId}/levels/${userId}`, {
      method: 'POST',
      json: data,
    }),
};

// Module APIs
export const welcomeApi = {
  getSettings: (guildId: string) => request<WelcomeSettings>(`/api/guilds/${guildId}/welcome`),
  updateSettings: (guildId: string, settings: Partial<WelcomeSettings>) =>
    request<WelcomeSettings>(`/api/guilds/${guildId}/welcome`, {
      method: 'POST',
      json: settings,
    }),
};

export const loggingApi = {
  getSettings: (guildId: string) => request<LoggingSettings>(`/api/guilds/${guildId}/logging`),
  updateSettings: (guildId: string, settings: Partial<LoggingSettings>) =>
    request<LoggingSettings>(`/api/guilds/${guildId}/logging`, {
      method: 'POST',
      json: settings,
    }),
};

export const automodApi = {
  getSettings: (guildId: string) => request<AutomodSettings>(`/api/guilds/${guildId}/automod`),
  updateSettings: (guildId: string, settings: Partial<AutomodSettings>) =>
    request<AutomodSettings>(`/api/guilds/${guildId}/automod`, {
      method: 'POST',
      json: settings,
    }),
};

// Types
export interface User {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface GuildDetails extends Guild {
  memberCount: number;
  botJoined: boolean;
}

export interface GuildSettings {
  prefix: string;
  language: string;
  timezone: string;
  modules: {
    moderation: { enabled: boolean };
    welcome: { enabled: boolean };
    leveling: { enabled: boolean };
    logging: { enabled: boolean };
    music: { enabled: boolean };
    tickets: { enabled: boolean };
  };
}

export interface GuildStats {
  memberCount: number;
  onlineCount: number;
  messageCount24h: number;
  commandsUsed24h: number;
  activeUsers7d: number;
  topChannels: Array<{ id: string; name: string; messages: number }>;
  topCommands: Array<{ name: string; uses: number }>;
  growth: {
    members: Array<{ date: string; count: number }>;
    messages: Array<{ date: string; count: number }>;
  };
}

export interface Warning {
  id: string;
  guildId: string;
  type: 'warn' | 'kick' | 'ban' | 'mute' | 'unmute' | 'unban';
  userId: string;
  moderatorId: string;
  reason: string;
  createdAt: string;
  expiresAt?: string;
  expired: boolean;
}

export interface WarningsResponse {
  warnings: Warning[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface UserLevel {
  userId: string;
  guildId: string;
  xp: number;
  level: number;
  rank: number;
  messages: number;
}

export interface LeaderboardResponse {
  leaderboard: UserLevel[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface WelcomeSettings {
  enabled: boolean;
  channel: string | null;
  message: string;
  dm: boolean;
  dmMessage: string | null;
  roles: string[];
}

export interface LoggingSettings {
  enabled: boolean;
  channels: {
    messages: string | null;
    members: string | null;
    moderation: string | null;
    server: string | null;
  };
  events: string[];
}

export interface AutomodSettings {
  enabled: boolean;
  rules: Array<{
    id: string;
    name: string;
    type: string;
    action: string;
    enabled: boolean;
  }>;
  exemptRoles: string[];
  exemptChannels: string[];
}
