/**
 * Automod engine
 */

import type { AutomodRule, AutomodConfig, AutomodTrigger } from '@furlow/schema';
import type { AutomodMatch, AutomodResult } from './types.js';
import type { ActionContext } from '../actions/types.js';
import type { ActionExecutor } from '../actions/executor.js';
import type { ExpressionEvaluator } from '../expression/evaluator.js';

/**
 * Validate regex pattern for ReDoS vulnerabilities
 */
function isValidRegexPattern(pattern: string): boolean {
  // Check pattern length
  if (pattern.length > 500) {
    return false;
  }
  // Check for dangerous patterns (nested quantifiers, overlapping alternatives)
  const dangerousPatterns = [
    /\([^)]*[+*][^)]*\)[+*]/,  // Nested quantifiers: (a+)+ or (a*)*
    /\([^)]*\|[^)]*\)[+*]/,    // Overlapping alternatives: (a|a)+
    /(.+)\1+[+*]/,             // Backreference with quantifier
  ];
  for (const dangerous of dangerousPatterns) {
    if (dangerous.test(pattern)) {
      return false;
    }
  }
  // Try to compile to catch syntax errors
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

export class AutomodEngine {
  private rules: AutomodRule[] = [];
  private enabled = true;

  /**
   * Configure the automod engine
   */
  configure(config: AutomodConfig): void {
    this.enabled = config.enabled !== false;
    this.rules = config.rules ?? [];
  }

  /**
   * Check content against automod rules
   */
  async check(
    content: string,
    context: ActionContext,
    evaluator: ExpressionEvaluator
  ): Promise<AutomodResult> {
    if (!this.enabled) {
      return { passed: true, matches: [] };
    }

    const matches: AutomodMatch[] = [];

    for (const rule of this.rules) {
      if (rule.enabled === false) continue;

      // Check exempt conditions
      if (rule.exempt) {
        const isExempt = await this.checkExempt(rule.exempt, context);
        if (isExempt) continue;
      }

      // Check when condition
      if (rule.when) {
        const shouldRun = await evaluator.evaluate<boolean>(
          typeof rule.when === 'string' ? rule.when : (rule.when.expr ?? 'true'),
          context
        );
        if (!shouldRun) continue;
      }

      // Check triggers
      const triggers = Array.isArray(rule.trigger) ? rule.trigger : [rule.trigger];
      for (const trigger of triggers) {
        const matched = this.checkTrigger(trigger, content);
        if (matched.length > 0) {
          matches.push({
            rule,
            trigger,
            matched,
            content,
          });
        }
      }
    }

    return {
      passed: matches.length === 0,
      matches,
    };
  }

  /**
   * Execute actions for automod matches
   */
  async executeActions(
    matches: AutomodMatch[],
    context: ActionContext,
    executor: ActionExecutor
  ): Promise<void> {
    for (const match of matches) {
      const matchContext = {
        ...context,
        automod: {
          rule: match.rule.name,
          trigger: match.trigger.type,
          matched: match.matched,
        },
      };

      const normalizedActions = normalizeActions(match.rule.actions);
      await executor.executeSequence(normalizedActions, matchContext as ActionContext);
    }
  }

  /**
   * Check if context is exempt from a rule
   */
  private async checkExempt(
    exempt: NonNullable<AutomodRule['exempt']>,
    context: ActionContext
  ): Promise<boolean> {
    // Check roles
    if (exempt.roles?.length && context.member?.role_ids) {
      const memberRoles = new Set(context.member.role_ids);
      if (exempt.roles.some((r) => memberRoles.has(r))) {
        return true;
      }
    }

    // Check users
    if (exempt.users?.length && context.user?.id) {
      if (exempt.users.includes(context.user.id)) {
        return true;
      }
    }

    // Check channels
    if (exempt.channels?.length && context.channel?.id) {
      if (exempt.channels.includes(context.channel.id)) {
        return true;
      }
    }

    // Check permissions
    if (exempt.permissions?.length && context.member?.permissions) {
      const memberPerms = new Set(context.member.permissions);
      if (exempt.permissions.some((p) => memberPerms.has(p))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check a trigger against content
   */
  private checkTrigger(trigger: AutomodTrigger, content: string): string[] {
    const matches: string[] = [];
    const lowerContent = content.toLowerCase();

    switch (trigger.type) {
      case 'keyword':
        if (trigger.keywords) {
          for (const keyword of trigger.keywords) {
            if (lowerContent.includes(keyword.toLowerCase())) {
              if (!trigger.allowed?.some((a) => lowerContent.includes(a.toLowerCase()))) {
                matches.push(keyword);
              }
            }
          }
        }
        break;

      case 'regex':
        if (trigger.regex) {
          for (const pattern of trigger.regex) {
            // Validate pattern for ReDoS before compiling
            if (!isValidRegexPattern(pattern)) {
              console.warn(`Skipping potentially dangerous regex pattern: ${pattern.substring(0, 50)}...`);
              continue;
            }
            try {
              const regex = new RegExp(pattern, 'gi');
              const found = content.match(regex);
              if (found) {
                matches.push(...found);
              }
            } catch {
              // Invalid regex, skip
            }
          }
        }
        break;

      case 'link':
        const urlPattern = /https?:\/\/[^\s]+/gi;
        const urls = content.match(urlPattern) ?? [];
        for (const url of urls) {
          if (trigger.blocked?.some((b) => url.includes(b))) {
            matches.push(url);
          } else if (!trigger.allowed?.some((a) => url.includes(a))) {
            matches.push(url);
          }
        }
        break;

      case 'invite':
        const invitePattern = /discord(?:\.gg|app\.com\/invite)\/[\w-]+/gi;
        const invites = content.match(invitePattern) ?? [];
        matches.push(...invites);
        break;

      case 'caps':
        const threshold = trigger.threshold ?? 70;
        const letters = content.replace(/[^a-zA-Z]/g, '');
        if (letters.length > 0) {
          const capsRatio = (letters.replace(/[^A-Z]/g, '').length / letters.length) * 100;
          if (capsRatio >= threshold) {
            matches.push(`${capsRatio.toFixed(0)}% caps`);
          }
        }
        break;

      case 'emoji_spam':
        const emojiPattern = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
        const emojis = content.match(emojiPattern) ?? [];
        if (emojis.length >= (trigger.threshold ?? 10)) {
          matches.push(`${emojis.length} emojis`);
        }
        break;

      case 'mention_spam':
        const mentionPattern = /<@!?\d+>|<@&\d+>/g;
        const mentions = content.match(mentionPattern) ?? [];
        if (mentions.length >= (trigger.threshold ?? 5)) {
          matches.push(`${mentions.length} mentions`);
        }
        break;

      case 'newline_spam':
        const newlines = (content.match(/\n/g) ?? []).length;
        if (newlines >= (trigger.threshold ?? 10)) {
          matches.push(`${newlines} newlines`);
        }
        break;
    }

    return matches;
  }

  /**
   * Get all rule names
   */
  getRuleNames(): string[] {
    return this.rules.map((r) => r.name);
  }

  /**
   * Enable/disable the engine
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if engine is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * Normalize actions from YAML shorthand format to schema format
 * YAML allows: { reply: { content: "..." } }
 * Schema expects: { action: "reply", content: "..." }
 */
function normalizeActions(actions: any[]): any[] {
  return actions.map((action) => {
    // If action already has 'action' property, it's in schema format
    if (action.action) {
      return action;
    }

    // Convert shorthand to schema format
    for (const [key, value] of Object.entries(action)) {
      if (key === 'when' || key === 'error_handler') continue;

      // Found the action type
      const normalized: any = {
        action: key,
        ...((typeof value === 'object' && value !== null) ? value : {}),
      };

      // Copy over when and error_handler if present
      if (action.when) normalized.when = action.when;
      if (action.error_handler) normalized.error_handler = action.error_handler;

      return normalized;
    }

    return action;
  });
}

/**
 * Create an automod engine
 */
export function createAutomodEngine(): AutomodEngine {
  return new AutomodEngine();
}
