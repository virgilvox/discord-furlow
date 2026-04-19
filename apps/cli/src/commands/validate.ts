/**
 * Validate command - check YAML syntax and schema
 */

import { resolve, relative } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';

interface ValidateOptions {
  strict: boolean;
}

// Hints for common validation errors
const ERROR_HINTS: Record<string, string> = {
  'must have required property': 'Add the missing property to your configuration',
  'must be string': 'Ensure the value is wrapped in quotes',
  'must be number': 'Remove quotes if the value should be a number',
  'must be array': 'Use YAML list syntax with dashes (-)',
  'must be object': 'Use YAML map syntax with key: value pairs',
  'must match pattern': 'Check the format matches the expected pattern',
  'must be equal to one of': 'Use one of the allowed values listed',
  'must NOT have additional properties': 'Remove the unknown property or check spelling',
};

function getHint(message: string): string | null {
  for (const [pattern, hint] of Object.entries(ERROR_HINTS)) {
    if (message.includes(pattern)) {
      return hint;
    }
  }
  return null;
}

function formatPath(path: string): string {
  // Convert JSON path to more readable format
  return path
    .replace(/^\//, '')
    .replace(/\//g, ' > ')
    .replace(/(\d+)/g, '[$1]');
}

export async function validateCommand(
  path: string,
  options: ValidateOptions
): Promise<void> {
  const specPath = resolve(path);
  const relPath = relative(process.cwd(), specPath);

  console.log(chalk.bold.cyan('\n  FURLOW Validator\n'));
  console.log(chalk.dim(`  File: ${relPath}\n`));

  const spinner = ora('Loading and validating...').start();

  try {
    const { loadSpec } = await import('@furlow/core/parser');
    const { validateFurlowSpec } = await import('@furlow/schema');

    // Load the spec (with validation)
    const { spec, files } = await loadSpec(specPath, {
      validate: true,
    });

    spinner.succeed(`Loaded ${files.length} file(s)`);

    // Show loaded files
    if (files.length > 1) {
      console.log(chalk.dim('\n  Loaded files:'));
      for (const file of files) {
        console.log(chalk.dim(`    - ${relative(process.cwd(), file)}`));
      }
    }

    // Additional validation
    const result = validateFurlowSpec(spec);

    if (!result.valid) {
      console.log('\n' + chalk.red.bold('  Validation Errors\n'));

      for (let i = 0; i < result.errors.length; i++) {
        const error = result.errors[i];
        console.log(chalk.red(`  ${i + 1}. ${formatPath(error.path)}`));
        console.log(chalk.white(`     ${error.message}`));

        const hint = getHint(error.message);
        if (hint) {
          console.log(chalk.cyan(`     ${hint}`));
        }
        console.log('');
      }

      console.log(chalk.red(`  Found ${result.errors.length} error(s)\n`));
      process.exit(1);
    }

    // Collect warnings
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for missing descriptions
    if (spec.commands) {
      for (const cmd of spec.commands) {
        if (!cmd.description) {
          warnings.push(`Command "${cmd.name}" is missing a description`);
        } else if (cmd.description.length < 10) {
          suggestions.push(`Command "${cmd.name}" has a very short description`);
        }

        // Check for empty actions
        if (!cmd.actions || cmd.actions.length === 0) {
          warnings.push(`Command "${cmd.name}" has no actions defined`);
        }
      }
    }

    // Check for empty event handlers
    if (spec.events) {
      for (const event of spec.events) {
        if (!event.actions || event.actions.length === 0) {
          warnings.push(`Event handler for "${event.event}" has no actions`);
        }
      }
    }

    // Check for empty flows
    if (spec.flows) {
      for (const flow of spec.flows) {
        if (!flow.actions || flow.actions.length === 0) {
          warnings.push(`Flow "${flow.name}" has no actions defined`);
        }
      }
    }

    // Check for best practices
    if (!spec.identity?.name) {
      suggestions.push('Consider setting an identity.name for your bot');
    }

    if (!spec.presence) {
      suggestions.push('Consider setting a presence for your bot');
    }

    if (spec.intents?.auto !== true && !spec.intents?.explicit?.length) {
      suggestions.push('Consider explicitly listing required intents');
    }

    // Strict mode shows all warnings, non-strict only shows critical ones
    const displayWarnings = options.strict ? warnings : warnings.filter(w => w.includes('no actions'));
    const displaySuggestions = options.strict ? suggestions : [];

    if (displayWarnings.length > 0) {
      console.log('\n' + chalk.yellow.bold('  Warnings\n'));
      for (const warning of displayWarnings) {
        console.log(chalk.yellow(`    • ${warning}`));
      }
    }

    if (displaySuggestions.length > 0) {
      console.log('\n' + chalk.blue.bold('  Suggestions\n'));
      for (const suggestion of displaySuggestions) {
        console.log(chalk.blue(`    • ${suggestion}`));
      }
    }

    // Print summary
    console.log('\n' + chalk.green.bold('  Specification is valid!\n'));

    // Detailed summary
    console.log('  ' + chalk.bold('Summary'));
    console.log('  ─────────────────────────────');

    const summaryItems = [
      { label: 'Version', value: spec.version },
      { label: 'Commands', value: spec.commands?.length ?? 0 },
      { label: 'Events', value: spec.events?.length ?? 0 },
      { label: 'Flows', value: spec.flows?.length ?? 0 },
      { label: 'Builtins', value: spec.builtins?.length ?? 0 },
      { label: 'Pipes', value: Object.keys(spec.pipes ?? {}).length },
    ];

    for (const item of summaryItems) {
      const valueStr = String(item.value);
      const valueColor = typeof item.value === 'number' && item.value > 0 ? chalk.green : chalk.dim;
      console.log(`  ${chalk.dim(item.label.padEnd(12))} ${valueColor(valueStr)}`);
    }

    // Show intents if explicit
    if (spec.intents?.explicit?.length) {
      console.log(`  ${chalk.dim('Intents'.padEnd(12))} ${chalk.green(spec.intents.explicit.length)} explicit`);
    } else if (spec.intents?.auto) {
      console.log(`  ${chalk.dim('Intents'.padEnd(12))} ${chalk.cyan('auto-detected')}`);
    }

    console.log('');

  } catch (error) {
    spinner.fail('Validation failed');

    if (error instanceof Error) {
      // Format error with code highlighting
      const errorCode = 'code' in error ? (error as { code: string }).code : null;

      console.log('\n' + chalk.red.bold('  Error'));
      console.log('');

      if (errorCode) {
        console.log(chalk.red(`  [${errorCode}]`));
      }

      console.log(chalk.white(`  ${error.message}`));

      // Show file location if available
      if ('file' in error) {
        const e = error as { file?: string; line?: number; column?: number };
        const location = e.file ? relative(process.cwd(), e.file) : 'unknown';

        if (e.line !== undefined) {
          console.log(chalk.dim(`\n  Location: ${location}:${e.line}${e.column ? `:${e.column}` : ''}`));
        } else {
          console.log(chalk.dim(`\n  File: ${location}`));
        }
      }

      // Show cause if available
      if (error.cause instanceof Error) {
        console.log(chalk.dim(`\n  Caused by: ${error.cause.message}`));
      }

      // Show hint based on error type
      const hint = getHint(error.message);
      if (hint) {
        console.log(chalk.cyan(`\n  ${hint}`));
      }
    }

    console.log('');
    process.exit(1);
  }
}
