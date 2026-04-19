/**
 * Guild Overview Page
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { guildApi, userApi, type Guild, type GuildStats, type User } from '../api/client';
import { Layout } from '../components/Layout';
import { useGuildWebSocket } from '../hooks/useWebSocket';

export function Overview() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [stats, setStats] = useState<GuildStats | null>(null);
  const [loading, setLoading] = useState(true);

  const { botStatus, stats: liveStats, nowPlaying } = useGuildWebSocket(id);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      userApi.getUser(),
      guildApi.getGuilds().then((guilds) => guilds.find((g) => g.id === id) || null),
      guildApi.getStats(id),
    ])
      .then(([userData, guildData, statsData]) => {
        setUser(userData);
        setGuild(guildData);
        setStats(statsData);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Layout user={user} guild={guild} botStatus={botStatus}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: '#b9bbbe' }}>Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!guild) {
    return (
      <Layout user={user} botStatus={botStatus}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <h1 style={{ color: '#fff' }}>Guild Not Found</h1>
          <p style={{ color: '#b9bbbe' }}>You don't have access to this guild.</p>
        </div>
      </Layout>
    );
  }

  const memberCount = liveStats?.memberCount ?? stats?.memberCount ?? 0;
  const onlineCount = liveStats?.onlineCount ?? stats?.onlineCount ?? 0;

  return (
    <Layout user={user} guild={guild} botStatus={botStatus}>
      <div>
        <h1 style={{ color: '#fff', marginBottom: '2rem' }}>Server Overview</h1>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          <StatCard
            label="Members"
            value={memberCount.toLocaleString()}
            icon=""
            trend={null}
          />
          <StatCard
            label="Online"
            value={onlineCount.toLocaleString()}
            icon=""
            trend={null}
          />
          <StatCard
            label="Messages (24h)"
            value={(stats?.messageCount24h ?? 0).toLocaleString()}
            icon=""
            trend={null}
          />
          <StatCard
            label="Commands (24h)"
            value={(stats?.commandsUsed24h ?? 0).toLocaleString()}
            icon=""
            trend={null}
          />
        </div>

        {/* Now Playing */}
        {nowPlaying?.track && (
          <div style={{
            background: '#16213e',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}>
            <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1rem' }}>Now Playing</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {nowPlaying.track.thumbnail && (
                <img
                  src={nowPlaying.track.thumbnail}
                  alt=""
                  style={{ width: '64px', height: '64px', borderRadius: '8px' }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 500 }}>{nowPlaying.track.title}</div>
                <div style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>{nowPlaying.track.artist}</div>
                <div style={{
                  marginTop: '0.5rem',
                  height: '4px',
                  background: '#0f3460',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(nowPlaying.track.position / nowPlaying.track.duration) * 100}%`,
                    height: '100%',
                    background: '#e94560',
                    transition: 'width 1s linear',
                  }} />
                </div>
              </div>
              <div style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>
                {nowPlaying.queue} in queue
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}>
          {/* Top Commands */}
          <div style={{
            background: '#16213e',
            borderRadius: '12px',
            padding: '1.5rem',
          }}>
            <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1rem' }}>Top Commands</h3>
            {stats?.topCommands && stats.topCommands.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats.topCommands.slice(0, 5).map((cmd, i) => (
                  <div key={cmd.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      color: '#b9bbbe',
                      fontSize: '0.875rem',
                      width: '20px',
                    }}>
                      #{i + 1}
                    </span>
                    <span style={{ color: '#fff', flex: 1 }}>{cmd.name}</span>
                    <span style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>
                      {cmd.uses} uses
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>No commands used yet.</p>
            )}
          </div>

          {/* Top Channels */}
          <div style={{
            background: '#16213e',
            borderRadius: '12px',
            padding: '1.5rem',
          }}>
            <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1rem' }}>Most Active Channels</h3>
            {stats?.topChannels && stats.topChannels.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats.topChannels.slice(0, 5).map((channel, i) => (
                  <div key={channel.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      color: '#b9bbbe',
                      fontSize: '0.875rem',
                      width: '20px',
                    }}>
                      #{i + 1}
                    </span>
                    <span style={{ color: '#fff', flex: 1 }}>#{channel.name}</span>
                    <span style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>
                      {channel.messages} msgs
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>No channel activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({
  label,
  value,
  icon,
  trend,
}: {
  label: string;
  value: string;
  icon: string;
  trend: number | null;
}) {
  return (
    <div style={{
      background: '#16213e',
      borderRadius: '12px',
      padding: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <span style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ color: '#fff', fontSize: '2rem', fontWeight: 'bold' }}>{value}</span>
        {trend !== null && (
          <span style={{
            color: trend >= 0 ? '#43b581' : '#f04747',
            fontSize: '0.875rem',
          }}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </div>
  );
}

export default Overview;
