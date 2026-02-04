/**
 * Rank card generator
 *
 * Creates rank/level cards showing user's XP progress and rank.
 *
 * Context variables:
 * - member.avatar: Member avatar URL
 * - member.display_name: Display name
 * - user.discriminator: User discriminator (if available)
 * - level: Current level
 * - xp: Current XP
 * - xpRequired: XP needed for next level
 * - rank: User's rank position
 * - totalUsers: Total ranked users (optional)
 */

import type { CanvasGenerator } from '@furlow/schema';

export interface RankCardOptions {
  /** Card width (default: 934) */
  width?: number;
  /** Card height (default: 282) */
  height?: number;
  /** Background color or image URL */
  background?: string;
  /** Primary/accent color */
  primaryColor?: string;
  /** Progress bar fill color */
  progressColor?: string;
  /** Progress bar background color */
  progressBackground?: string;
  /** Text color */
  textColor?: string;
  /** Secondary text color */
  secondaryTextColor?: string;
  /** Avatar radius (default: 90) */
  avatarRadius?: number;
  /** Avatar border color */
  avatarBorderColor?: string;
  /** Font family */
  fontFamily?: string;
  /** Show discriminator */
  showDiscriminator?: boolean;
  /** XP text format */
  xpText?: string;
  /** Level label */
  levelLabel?: string;
  /** Rank label */
  rankLabel?: string;
}

const DEFAULT_OPTIONS: Required<RankCardOptions> = {
  width: 934,
  height: 282,
  background: '#23272A',
  primaryColor: '#5865F2',
  progressColor: '#5865F2',
  progressBackground: '#484b4e',
  textColor: '#FFFFFF',
  secondaryTextColor: '#B9BBBE',
  avatarRadius: 90,
  avatarBorderColor: '#5865F2',
  fontFamily: 'sans-serif',
  showDiscriminator: false,
  xpText: '${xp} / ${xpRequired} XP',
  levelLabel: 'LEVEL',
  rankLabel: 'RANK',
};

/**
 * Create a rank card generator with customizable options
 */
export function createRankGenerator(
  options: RankCardOptions = {}
): CanvasGenerator {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const padding = 30;
  const avatarX = padding;
  const avatarY = (opts.height - opts.avatarRadius * 2) / 2;
  const contentX = avatarX + opts.avatarRadius * 2 + 30;
  const contentWidth = opts.width - contentX - padding;

  const usernameY = 60;
  const progressBarY = 150;
  const progressBarHeight = 30;
  const xpTextY = progressBarY + progressBarHeight + 15;

  const levelX = opts.width - padding - 150;
  const rankX = opts.width - padding;

  return {
    width: opts.width,
    height: opts.height,
    background: opts.background,
    layers: [
      // Background overlay for better text readability
      {
        type: 'rect',
        x: 0,
        y: 0,
        width: opts.width,
        height: opts.height,
        color: 'rgba(0, 0, 0, 0.3)',
        radius: 20,
      },
      // Avatar
      {
        type: 'circle_image',
        x: avatarX,
        y: avatarY,
        radius: opts.avatarRadius,
        src: '${user.avatar}',
        border: {
          width: 5,
          color: opts.avatarBorderColor,
        },
      },
      // Status indicator (online dot) - conditional
      {
        type: 'rect',
        x: avatarX + opts.avatarRadius * 2 - 30,
        y: avatarY + opts.avatarRadius * 2 - 30,
        width: 30,
        height: 30,
        color: '#43b581',
        radius: 15,
        when: 'user.status == "online"',
      },
      // Username
      {
        type: 'text',
        x: contentX,
        y: usernameY,
        text: '${member.display_name}',
        font: opts.fontFamily,
        size: 36,
        color: opts.textColor,
        align: 'left',
        baseline: 'top',
        max_width: contentWidth - 200,
      },
      // Discriminator (optional)
      ...(opts.showDiscriminator
        ? [
            {
              type: 'text' as const,
              x: contentX,
              y: usernameY + 45,
              text: '#${user.discriminator}',
              font: opts.fontFamily,
              size: 20,
              color: opts.secondaryTextColor,
              align: 'left' as const,
              baseline: 'top' as const,
            },
          ]
        : []),
      // Rank label and value
      {
        type: 'text',
        x: rankX,
        y: 35,
        text: opts.rankLabel,
        font: opts.fontFamily,
        size: 14,
        color: opts.secondaryTextColor,
        align: 'right',
        baseline: 'top',
      },
      {
        type: 'text',
        x: rankX,
        y: 55,
        text: '#${rank}',
        font: opts.fontFamily,
        size: 48,
        color: opts.primaryColor,
        align: 'right',
        baseline: 'top',
      },
      // Level label and value
      {
        type: 'text',
        x: levelX,
        y: 35,
        text: opts.levelLabel,
        font: opts.fontFamily,
        size: 14,
        color: opts.secondaryTextColor,
        align: 'right',
        baseline: 'top',
      },
      {
        type: 'text',
        x: levelX,
        y: 55,
        text: '${level}',
        font: opts.fontFamily,
        size: 48,
        color: opts.textColor,
        align: 'right',
        baseline: 'top',
      },
      // Progress bar
      {
        type: 'progress_bar',
        x: contentX,
        y: progressBarY,
        width: contentWidth,
        height: progressBarHeight,
        progress: '${xp / xpRequired}',
        background: opts.progressBackground,
        fill: opts.progressColor,
        radius: progressBarHeight / 2,
      },
      // XP text
      {
        type: 'text',
        x: contentX + contentWidth,
        y: xpTextY,
        text: opts.xpText,
        font: opts.fontFamily,
        size: 16,
        color: opts.secondaryTextColor,
        align: 'right',
        baseline: 'top',
      },
    ],
  };
}

/**
 * Default rank card generator
 */
export const rankGenerator = createRankGenerator();

/**
 * Dark theme rank card
 */
export const rankDarkGenerator = createRankGenerator({
  background: '#0d1117',
  primaryColor: '#58a6ff',
  progressColor: '#58a6ff',
  avatarBorderColor: '#58a6ff',
});

/**
 * Gradient rank card
 */
export const rankGradientGenerator: CanvasGenerator = {
  width: 934,
  height: 282,
  layers: [
    // Gradient background
    {
      type: 'gradient',
      x: 0,
      y: 0,
      width: 934,
      height: 282,
      direction: 'diagonal',
      stops: [
        { offset: 0, color: '#667eea' },
        { offset: 1, color: '#764ba2' },
      ],
      radius: 20,
    },
    // Semi-transparent overlay
    {
      type: 'rect',
      x: 20,
      y: 20,
      width: 894,
      height: 242,
      color: 'rgba(0, 0, 0, 0.4)',
      radius: 15,
    },
    // Avatar
    {
      type: 'circle_image',
      x: 40,
      y: 51,
      radius: 90,
      src: '${user.avatar}',
      border: {
        width: 5,
        color: '#ffffff',
      },
    },
    // Username
    {
      type: 'text',
      x: 250,
      y: 60,
      text: '${member.display_name}',
      font: 'sans-serif',
      size: 36,
      color: '#FFFFFF',
      align: 'left',
      baseline: 'top',
      max_width: 400,
    },
    // Rank
    {
      type: 'text',
      x: 904,
      y: 35,
      text: 'RANK',
      font: 'sans-serif',
      size: 14,
      color: 'rgba(255, 255, 255, 0.7)',
      align: 'right',
      baseline: 'top',
    },
    {
      type: 'text',
      x: 904,
      y: 55,
      text: '#${rank}',
      font: 'sans-serif',
      size: 48,
      color: '#FFFFFF',
      align: 'right',
      baseline: 'top',
    },
    // Level
    {
      type: 'text',
      x: 754,
      y: 35,
      text: 'LEVEL',
      font: 'sans-serif',
      size: 14,
      color: 'rgba(255, 255, 255, 0.7)',
      align: 'right',
      baseline: 'top',
    },
    {
      type: 'text',
      x: 754,
      y: 55,
      text: '${level}',
      font: 'sans-serif',
      size: 48,
      color: '#FFFFFF',
      align: 'right',
      baseline: 'top',
    },
    // Progress bar
    {
      type: 'progress_bar',
      x: 250,
      y: 150,
      width: 654,
      height: 30,
      progress: '${xp / xpRequired}',
      background: 'rgba(255, 255, 255, 0.2)',
      fill: '#FFFFFF',
      radius: 15,
    },
    // XP text
    {
      type: 'text',
      x: 904,
      y: 195,
      text: '${xp} / ${xpRequired} XP',
      font: 'sans-serif',
      size: 16,
      color: 'rgba(255, 255, 255, 0.7)',
      align: 'right',
      baseline: 'top',
    },
  ],
};

/**
 * Minimal rank card (compact)
 */
export const rankMinimalGenerator = createRankGenerator({
  width: 600,
  height: 180,
  avatarRadius: 55,
  levelLabel: 'LVL',
  rankLabel: '#',
});
