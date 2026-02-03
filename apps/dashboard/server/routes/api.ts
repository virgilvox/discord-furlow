/**
 * Dashboard API Routes
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express';
import type { Profile } from 'passport-discord';
import type { StorageAdapter, StoredValue } from '@furlow/storage';

// Type augmentation for session user
declare global {
  namespace Express {
    interface User extends Profile {}
  }
}

type StorageGetter = () => StorageAdapter | null;

// Middleware to check authentication
function requireAuth(req: Request, res: Response, next: () => void): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
}

// Middleware to check guild access
function requireGuildAccess(req: Request, res: Response, next: () => void): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const guildId = req.params.id;
  const user = req.user as Profile;
  const guild = user.guilds?.find((g) => g.id === guildId);

  if (!guild) {
    res.status(404).json({ error: 'Guild not found' });
    return;
  }

  // Check for MANAGE_GUILD permission (0x20)
  if ((parseInt(guild.permissions) & 0x20) !== 0x20) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  next();
}

/**
 * Create API routes with storage injection
 */
export function createApiRoutes(getStorage: StorageGetter): RouterType {
  const router: RouterType = Router();

  /**
   * Helper to get a stored value or return default
   */
  async function getStoredValue<T>(key: string, defaultValue: T): Promise<T> {
    const storage = getStorage();
    if (!storage) return defaultValue;

    try {
      const stored = await storage.get(key);
      return stored?.value as T ?? defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Helper to set a stored value
   */
  async function setStoredValue(key: string, value: unknown): Promise<boolean> {
    const storage = getStorage();
    if (!storage) return false;

    try {
      const storedValue: StoredValue = {
        value,
        type: typeof value,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await storage.set(key, storedValue);
      return true;
    } catch {
      return false;
    }
  }

  // ========================================
  // User Routes
  // ========================================

  /**
   * GET /api/user
   * Get the current authenticated user
   */
  router.get('/user', requireAuth, (req: Request, res: Response): void => {
    const user = req.user as Profile;
    res.json({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      email: user.email,
    });
  });

  // ========================================
  // Guild Routes
  // ========================================

  /**
   * GET /api/guilds
   * Get all guilds the user can manage
   */
  router.get('/guilds', requireAuth, (req: Request, res: Response): void => {
    const user = req.user as Profile;
    const guilds = user.guilds?.filter(
      (g) => (parseInt(g.permissions) & 0x20) === 0x20
    ).map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.owner,
      permissions: g.permissions,
    }));
    res.json(guilds ?? []);
  });

  /**
   * GET /api/guilds/:id
   * Get guild details
   */
  router.get('/guilds/:id', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const guildId = req.params.id;
    const user = req.user as Profile;
    const guild = user.guilds?.find((g) => g.id === guildId);

    // Fetch additional data from storage if available
    const botStatus = await getStoredValue(`guild:${guildId}:botStatus`, { joined: false, memberCount: 0 });

    res.json({
      id: guild?.id,
      name: guild?.name,
      icon: guild?.icon,
      owner: guild?.owner,
      memberCount: botStatus.memberCount,
      botJoined: botStatus.joined,
    });
  });

  /**
   * GET /api/guilds/:id/settings
   * Get guild settings
   */
  router.get('/guilds/:id/settings', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const guildId = req.params.id;

    const defaultSettings = {
      prefix: '!',
      language: 'en',
      timezone: 'UTC',
      modules: {
        moderation: { enabled: true },
        welcome: { enabled: false },
        leveling: { enabled: false },
        logging: { enabled: false },
        music: { enabled: false },
        tickets: { enabled: false },
      },
    };

    const settings = await getStoredValue(`guild:${guildId}:settings`, defaultSettings);
    res.json(settings);
  });

  /**
   * POST /api/guilds/:id/settings
   * Update guild settings
   */
  router.post('/guilds/:id/settings', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const guildId = req.params.id;
    const settings = req.body;

    // Validate settings
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'Invalid settings' });
      return;
    }

    // Merge with existing settings
    const existing = await getStoredValue(`guild:${guildId}:settings`, {});
    const merged = { ...existing, ...settings };

    const saved = await setStoredValue(`guild:${guildId}:settings`, merged);
    if (!saved) {
      res.status(500).json({ error: 'Failed to save settings (storage not configured)' });
      return;
    }

    res.json({ success: true, settings: merged });
  });

  /**
   * GET /api/guilds/:id/stats
   * Get guild statistics
   */
  router.get('/guilds/:id/stats', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const guildId = req.params.id;

    const defaultStats = {
      memberCount: 0,
      onlineCount: 0,
      messageCount24h: 0,
      commandsUsed24h: 0,
      activeUsers7d: 0,
      topChannels: [],
      topCommands: [],
      growth: {
        members: [],
        messages: [],
      },
    };

    const stats = await getStoredValue(`guild:${guildId}:stats`, defaultStats);
    res.json(stats);
  });

  // ========================================
  // Moderation Routes
  // ========================================

  /**
   * GET /api/guilds/:id/warnings
   * Get moderation warnings/cases
   */
  router.get('/guilds/:id/warnings', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const guildId = req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const allWarnings = await getStoredValue<any[]>(`guild:${guildId}:warnings`, []);
    const total = allWarnings.length;
    const pages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const warnings = allWarnings.slice(offset, offset + limit);

    res.json({
      warnings,
      total,
      page,
      limit,
      pages,
    });
  });

  /**
   * GET /api/guilds/:id/warnings/:caseId
   * Get a specific moderation case
   */
  router.get('/guilds/:id/warnings/:caseId', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const { id: guildId, caseId } = req.params;

    const allWarnings = await getStoredValue<any[]>(`guild:${guildId}:warnings`, []);
    const warning = allWarnings.find(w => w.id === caseId);

    if (!warning) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    res.json(warning);
  });

  /**
   * DELETE /api/guilds/:id/warnings/:caseId
   * Delete/revoke a moderation case
   */
  router.delete('/guilds/:id/warnings/:caseId', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const { id: guildId, caseId } = req.params;

    const allWarnings = await getStoredValue<any[]>(`guild:${guildId}:warnings`, []);
    const filtered = allWarnings.filter(w => w.id !== caseId);

    if (filtered.length === allWarnings.length) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    await setStoredValue(`guild:${guildId}:warnings`, filtered);
    res.json({ success: true, caseId });
  });

  // ========================================
  // Leveling Routes
  // ========================================

  /**
   * GET /api/guilds/:id/levels
   * Get leveling leaderboard
   */
  router.get('/guilds/:id/levels', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const guildId = req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const allLevels = await getStoredValue<any[]>(`guild:${guildId}:levels`, []);
    // Sort by XP descending
    const sorted = [...allLevels].sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));
    // Add rank
    const ranked = sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));

    const total = ranked.length;
    const pages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const leaderboard = ranked.slice(offset, offset + limit);

    res.json({
      leaderboard,
      total,
      page,
      limit,
      pages,
    });
  });

  /**
   * GET /api/guilds/:id/levels/:userId
   * Get a user's level info
   */
  router.get('/guilds/:id/levels/:userId', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const { id: guildId, userId } = req.params;

    const allLevels = await getStoredValue<any[]>(`guild:${guildId}:levels`, []);
    const sorted = [...allLevels].sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));
    const rank = sorted.findIndex(e => e.userId === userId) + 1;
    const userLevel = allLevels.find(e => e.userId === userId) ?? {
      userId,
      guildId,
      xp: 0,
      level: 0,
      messages: 0,
    };

    res.json({ ...userLevel, rank: rank > 0 ? rank : allLevels.length + 1 });
  });

  /**
   * POST /api/guilds/:id/levels/:userId
   * Update a user's XP/level
   */
  router.post('/guilds/:id/levels/:userId', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const { id: guildId, userId } = req.params;
    const { xp, level } = req.body;

    const allLevels = await getStoredValue<any[]>(`guild:${guildId}:levels`, []);
    const existingIndex = allLevels.findIndex(e => e.userId === userId);

    const updatedEntry = {
      userId,
      guildId,
      xp: xp ?? (existingIndex >= 0 ? allLevels[existingIndex].xp : 0),
      level: level ?? (existingIndex >= 0 ? allLevels[existingIndex].level : 0),
      messages: existingIndex >= 0 ? allLevels[existingIndex].messages : 0,
      updatedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      allLevels[existingIndex] = updatedEntry;
    } else {
      allLevels.push(updatedEntry);
    }

    await setStoredValue(`guild:${guildId}:levels`, allLevels);

    res.json({
      success: true,
      ...updatedEntry,
    });
  });

  // ========================================
  // Module-specific Routes
  // ========================================

  /**
   * GET /api/guilds/:id/welcome
   * Get welcome settings
   */
  router.get('/guilds/:id/welcome', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const guildId = req.params.id;

    const defaultSettings = {
      enabled: false,
      channel: null,
      message: 'Welcome {user} to {server}!',
      dm: false,
      dmMessage: null,
      roles: [],
    };

    const settings = await getStoredValue(`guild:${guildId}:welcome`, defaultSettings);
    res.json(settings);
  });

  /**
   * POST /api/guilds/:id/welcome
   * Update welcome settings
   */
  router.post('/guilds/:id/welcome', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const guildId = req.params.id;
    const settings = req.body;

    const existing = await getStoredValue(`guild:${guildId}:welcome`, {});
    const merged = { ...existing, ...settings };

    await setStoredValue(`guild:${guildId}:welcome`, merged);
    res.json({ success: true, ...merged });
  });

  /**
   * GET /api/guilds/:id/logging
   * Get logging settings
   */
  router.get('/guilds/:id/logging', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const guildId = req.params.id;

    const defaultSettings = {
      enabled: false,
      channels: {
        messages: null,
        members: null,
        moderation: null,
        server: null,
      },
      events: [],
    };

    const settings = await getStoredValue(`guild:${guildId}:logging`, defaultSettings);
    res.json(settings);
  });

  /**
   * POST /api/guilds/:id/logging
   * Update logging settings
   */
  router.post('/guilds/:id/logging', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const guildId = req.params.id;
    const settings = req.body;

    const existing = await getStoredValue(`guild:${guildId}:logging`, {});
    const merged = { ...existing, ...settings };

    await setStoredValue(`guild:${guildId}:logging`, merged);
    res.json({ success: true, ...merged });
  });

  /**
   * GET /api/guilds/:id/automod
   * Get automod settings
   */
  router.get('/guilds/:id/automod', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const guildId = req.params.id;

    const defaultSettings = {
      enabled: false,
      rules: [],
      exemptRoles: [],
      exemptChannels: [],
    };

    const settings = await getStoredValue(`guild:${guildId}:automod`, defaultSettings);
    res.json(settings);
  });

  /**
   * POST /api/guilds/:id/automod
   * Update automod settings
   */
  router.post('/guilds/:id/automod', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
    const guildId = req.params.id;
    const settings = req.body;

    const existing = await getStoredValue(`guild:${guildId}:automod`, {});
    const merged = { ...existing, ...settings };

    await setStoredValue(`guild:${guildId}:automod`, merged);
    res.json({ success: true, ...merged });
  });

  return router;
}

// Legacy default export for backwards compatibility
export default createApiRoutes(() => null);
