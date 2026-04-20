/**
 * FURLOW Dashboard Server
 */

import express, { type Request, type Response, type Express } from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy, type Profile } from 'passport-discord';
import { createServer } from 'http';
import { join } from 'node:path';
import { createApiRoutes } from './routes/api.js';
import { initWebSocket, broadcastBotStatus } from './websocket.js';
import { randomBytes } from 'node:crypto';
import type { StorageAdapter } from '@furlow/storage';

const app: Express = express();
const httpServer = createServer(app);

// Storage adapter - will be set by configureStorage
let storage: StorageAdapter | null = null;

/**
 * Configure the storage adapter for the dashboard
 */
export function configureStorage(adapter: StorageAdapter): void {
  storage = adapter;
}

/**
 * Get the current storage adapter
 */
export function getStorage(): StorageAdapter | null {
  return storage;
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });
}

// Session configuration. DASHBOARD_SECRET must be set in production; we
// refuse to fall back to a well-known hardcoded default that would let
// anyone forge sessions. In development a per-process random secret is
// fine (sessions do not need to survive restarts).
const sessionSecret =
  process.env.DASHBOARD_SECRET ??
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('DASHBOARD_SECRET environment variable must be set in production');
      })()
    : randomBytes(32).toString('hex'));

// Build session middleware once and reuse it on the WS upgrade path so
// websocket connections get the same authenticated user as HTTP requests.
const sessionMiddleware = session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
  },
});
app.use(sessionMiddleware);

// Passport configuration
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  passport.use(
    new DiscordStrategy(
      {
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: process.env.DISCORD_CALLBACK_URL ?? '/auth/discord/callback',
        scope: ['identify', 'guilds', 'email'],
      },
      (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (err: Error | null, user?: Profile | false) => void
      ) => {
        // Store tokens for API calls
        (profile as Profile & { accessToken?: string }).accessToken = accessToken;
        return done(null, profile);
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });

  app.use(passport.initialize());
  app.use(passport.session());
}

// Auth routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get(
  '/auth/discord/callback',
  passport.authenticate('discord', {
    failureRedirect: '/login?error=auth_failed',
  }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

// API routes (with storage injection)
app.use('/api', createApiRoutes(() => storage));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// Metrics endpoint (Prometheus-scrape format). Forwards real per-handler
// counters from `@furlow/core/observability` if the dashboard is running
// in the same process as the bot (typical self-host); otherwise emits just
// the dashboard-local counters.
app.get('/metrics', async (req, res) => {
  let body = '';
  try {
    const { getHandlerStats, renderPrometheus } = await import('@furlow/core/observability');
    body += renderPrometheus(getHandlerStats());
  } catch {
    // core not loaded (e.g. dashboard running standalone); fall through
  }
  res.set('Content-Type', 'text/plain');
  res.send(body);
});

// Handler stats as JSON for the dashboard UI (M8).
app.get('/api/handlers', async (req, res) => {
  try {
    const { getHandlerStats } = await import('@furlow/core/observability');
    res.json({ handlers: getHandlerStats().snapshot() });
  } catch {
    res.json({ handlers: [] });
  }
});

// Initialize WebSocket server with session middleware so the upgrade
// handler can reject unauthenticated clients.
const wss = initWebSocket(httpServer, sessionMiddleware);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client')));

  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../client/index.html'));
  });
}

// Start server
const PORT = parseInt(process.env.DASHBOARD_PORT ?? '3000', 10);

export function startDashboard(): void {
  httpServer.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
    console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  });

  // Simulate bot status updates for demo
  if (process.env.NODE_ENV !== 'production') {
    setInterval(() => {
      broadcastBotStatus({
        online: true,
        guilds: Math.floor(Math.random() * 10) + 1,
        users: Math.floor(Math.random() * 1000) + 100,
        uptime: process.uptime() * 1000,
        ping: Math.floor(Math.random() * 50) + 20,
      });
    }, 5000);
  }
}

export { app, httpServer, wss };
export default app;
