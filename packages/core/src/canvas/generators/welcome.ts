/**
 * Welcome card generator
 *
 * Creates welcome images for new members joining a server.
 *
 * Context variables:
 * - member.avatar: Member avatar URL
 * - member.display_name: Display name (nickname or username)
 * - guild.name: Server name
 * - guild.member_count: Number of members
 * - guild.icon: Server icon URL (optional)
 */

import type { CanvasGenerator } from '@furlow/schema';

export interface WelcomeCardOptions {
  /** Card width (default: 800) */
  width?: number;
  /** Card height (default: 300) */
  height?: number;
  /** Background color or image URL */
  background?: string;
  /** Primary color for accents */
  primaryColor?: string;
  /** Text color */
  textColor?: string;
  /** Subtitle color */
  subtitleColor?: string;
  /** Avatar border color */
  avatarBorderColor?: string;
  /** Avatar size/radius (default: 80) */
  avatarRadius?: number;
  /** Welcome text (supports ${} interpolation) */
  welcomeText?: string;
  /** Subtitle text (supports ${} interpolation) */
  subtitleText?: string;
  /** Member count text (supports ${} interpolation) */
  memberCountText?: string;
  /** Font family for text */
  fontFamily?: string;
}

const DEFAULT_OPTIONS: Required<WelcomeCardOptions> = {
  width: 800,
  height: 300,
  background: '#23272A',
  primaryColor: '#5865F2',
  textColor: '#FFFFFF',
  subtitleColor: '#B9BBBE',
  avatarBorderColor: '#5865F2',
  avatarRadius: 80,
  welcomeText: 'Welcome, ${member.display_name}!',
  subtitleText: 'to ${guild.name}',
  memberCountText: 'Member #${guild.member_count}',
  fontFamily: 'sans-serif',
};

/**
 * Create a welcome card generator with customizable options
 */
export function createWelcomeGenerator(
  options: WelcomeCardOptions = {}
): CanvasGenerator {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const centerX = opts.width / 2;
  const avatarY = 40;
  const welcomeY = avatarY + opts.avatarRadius * 2 + 30;
  const subtitleY = welcomeY + 45;
  const memberCountY = subtitleY + 35;

  return {
    width: opts.width,
    height: opts.height,
    background: opts.background,
    layers: [
      // Decorative accent bar at top
      {
        type: 'rect',
        x: 0,
        y: 0,
        width: opts.width,
        height: 4,
        color: opts.primaryColor,
      },
      // Avatar with circular crop
      {
        type: 'circle_image',
        x: centerX - opts.avatarRadius,
        y: avatarY,
        radius: opts.avatarRadius,
        src: '${user.avatar}',
        border: {
          width: 4,
          color: opts.avatarBorderColor,
        },
      },
      // Welcome text
      {
        type: 'text',
        x: centerX,
        y: welcomeY,
        text: opts.welcomeText,
        font: opts.fontFamily,
        size: 32,
        color: opts.textColor,
        align: 'center',
        baseline: 'top',
      },
      // Subtitle (server name)
      {
        type: 'text',
        x: centerX,
        y: subtitleY,
        text: opts.subtitleText,
        font: opts.fontFamily,
        size: 22,
        color: opts.subtitleColor,
        align: 'center',
        baseline: 'top',
      },
      // Member count
      {
        type: 'text',
        x: centerX,
        y: memberCountY,
        text: opts.memberCountText,
        font: opts.fontFamily,
        size: 16,
        color: opts.subtitleColor,
        align: 'center',
        baseline: 'top',
      },
    ],
  };
}

/**
 * Default welcome card generator
 */
export const welcomeGenerator = createWelcomeGenerator();

/**
 * Dark theme welcome card
 */
export const welcomeDarkGenerator = createWelcomeGenerator({
  background: '#1a1a2e',
  primaryColor: '#e94560',
  avatarBorderColor: '#e94560',
});

/**
 * Light theme welcome card
 */
export const welcomeLightGenerator = createWelcomeGenerator({
  background: '#f5f5f5',
  primaryColor: '#5865F2',
  textColor: '#2c2f33',
  subtitleColor: '#747f8d',
  avatarBorderColor: '#5865F2',
});

/**
 * Minimal welcome card (compact)
 */
export const welcomeMinimalGenerator = createWelcomeGenerator({
  width: 600,
  height: 200,
  avatarRadius: 50,
  welcomeText: 'Welcome ${user.username}!',
  subtitleText: '${guild.name}',
  memberCountText: '#${guild.member_count}',
});
