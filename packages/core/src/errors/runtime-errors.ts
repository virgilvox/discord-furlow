/**
 * Runtime errors
 */

import { FurlowError } from './base.js';
import { ErrorCodes } from './codes.js';

export class ExpressionSyntaxError extends FurlowError {
  constructor(expression: string, message: string) {
    super({
      code: ErrorCodes.EXPR_SYNTAX,
      message: `Expression syntax error in "${expression}": ${message}`,
      context: { expression },
    });
    this.name = 'ExpressionSyntaxError';
  }
}

export class UndefinedVariableError extends FurlowError {
  constructor(varName: string, expression: string) {
    super({
      code: ErrorCodes.EXPR_UNDEFINED_VAR,
      message: `Undefined variable "${varName}" in expression`,
      context: { varName, expression },
    });
    this.name = 'UndefinedVariableError';
  }
}

export class ActionNotFoundError extends FurlowError {
  constructor(actionName: string) {
    super({
      code: ErrorCodes.ACTION_NOT_FOUND,
      message: `Action not found: ${actionName}`,
      context: { actionName },
    });
    this.name = 'ActionNotFoundError';
  }
}

export class ActionExecutionError extends FurlowError {
  constructor(actionName: string, message: string, cause?: Error) {
    super({
      code: ErrorCodes.ACTION_EXECUTION_FAILED,
      message: `Action "${actionName}" failed: ${message}`,
      context: { actionName },
      cause,
    });
    this.name = 'ActionExecutionError';
  }
}

export class FlowNotFoundError extends FurlowError {
  constructor(flowName: string) {
    super({
      code: ErrorCodes.FLOW_NOT_FOUND,
      message: `Flow not found: ${flowName}`,
      context: { flowName },
    });
    this.name = 'FlowNotFoundError';
  }
}

export class FlowAbortedError extends FurlowError {
  constructor(flowName: string, reason?: string) {
    super({
      code: ErrorCodes.FLOW_ABORTED,
      message: `Flow "${flowName}" was aborted${reason ? `: ${reason}` : ''}`,
      context: { flowName, reason },
    });
    this.name = 'FlowAbortedError';
  }
}

export class MaxFlowDepthError extends FurlowError {
  constructor(maxDepth: number) {
    super({
      code: ErrorCodes.FLOW_MAX_DEPTH,
      message: `Maximum flow call depth (${maxDepth}) exceeded`,
      context: { maxDepth },
    });
    this.name = 'MaxFlowDepthError';
  }
}

export class QuotaExceededError extends FurlowError {
  public readonly metric: string;
  public readonly limit: number;
  public readonly observed: number;

  constructor(metric: string, limit: number, observed: number) {
    super({
      code: ErrorCodes.FLOW_QUOTA_EXCEEDED,
      message: `Handler quota exceeded: ${metric} ${observed} > ${limit}`,
      context: { metric, limit, observed },
    });
    this.name = 'QuotaExceededError';
    this.metric = metric;
    this.limit = limit;
    this.observed = observed;
  }
}

export class StateVariableNotFoundError extends FurlowError {
  constructor(varName: string, scope: string) {
    super({
      code: ErrorCodes.STATE_VAR_NOT_FOUND,
      message: `Variable "${varName}" not found in scope "${scope}"`,
      context: { varName, scope },
    });
    this.name = 'StateVariableNotFoundError';
  }
}

export class PipeNotFoundError extends FurlowError {
  constructor(pipeName: string) {
    super({
      code: ErrorCodes.PIPE_NOT_FOUND,
      message: `Pipe not found: ${pipeName}`,
      context: { pipeName },
    });
    this.name = 'PipeNotFoundError';
  }
}

export class VoiceNotConnectedError extends FurlowError {
  constructor(guildId: string) {
    super({
      code: ErrorCodes.VOICE_NOT_CONNECTED,
      message: `Not connected to voice in guild ${guildId}`,
      context: { guildId },
    });
    this.name = 'VoiceNotConnectedError';
  }
}

export class DiscordApiError extends FurlowError {
  constructor(message: string, statusCode?: number, cause?: Error) {
    super({
      code: ErrorCodes.DISCORD_API_ERROR,
      message: `Discord API error: ${message}`,
      context: { statusCode },
      cause,
    });
    this.name = 'DiscordApiError';
  }
}
