/**
 * FURLOW Dashboard - Main Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import { GuildSelect } from './pages/GuildSelect';
import { Overview } from './pages/Overview';
import { Settings } from './pages/Settings';
import { Moderation } from './pages/Moderation';
import { Levels } from './pages/Levels';
import { Handlers } from './pages/Handlers';

// Global styles
const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: #1a1a2e;
    color: #fff;
    line-height: 1.5;
  }

  a {
    color: inherit;
  }

  button {
    font-family: inherit;
  }

  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #1a1a2e;
  }

  ::-webkit-scrollbar-thumb {
    background: #0f3460;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #16213e;
  }
`;

function App() {
  return (
    <>
      <style>{globalStyles}</style>
      <BrowserRouter>
        <Routes>
          {/* Home - Guild Selection */}
          <Route path="/" element={<GuildSelect />} />

          {/* Guild Routes */}
          <Route path="/guild/:id" element={<Overview />} />
          <Route path="/guild/:id/settings" element={<Settings />} />
          <Route path="/guild/:id/moderation" element={<Moderation />} />
          <Route path="/guild/:id/levels" element={<Levels />} />
          <Route path="/handlers" element={<Handlers />} />

          {/* Placeholder routes for future pages */}
          <Route path="/guild/:id/welcome" element={<ComingSoon title="Welcome Settings" />} />
          <Route path="/guild/:id/logging" element={<ComingSoon title="Logging Settings" />} />
          <Route path="/guild/:id/automod" element={<ComingSoon title="AutoMod Settings" />} />

          {/* Login redirect */}
          <Route path="/login" element={<Navigate to="/" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1a1a2e',
      padding: '2rem',
    }}>
      <h1 style={{ color: '#fff', marginBottom: '1rem' }}>{title}</h1>
      <p style={{ color: '#b9bbbe', marginBottom: '2rem' }}>
        This feature is coming soon.
      </p>
      <a
        href="/"
        style={{
          padding: '0.75rem 1.5rem',
          background: '#e94560',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '8px',
        }}
      >
        Back to Home
      </a>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1a1a2e',
      padding: '2rem',
    }}>
      <h1 style={{ color: '#fff', fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
      <p style={{ color: '#b9bbbe', marginBottom: '2rem' }}>
        Page not found.
      </p>
      <a
        href="/"
        style={{
          padding: '0.75rem 1.5rem',
          background: '#e94560',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '8px',
        }}
      >
        Back to Home
      </a>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
