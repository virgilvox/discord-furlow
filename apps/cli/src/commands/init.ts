/**
 * Init command - scaffold a new FURLOW bot project
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

interface InitOptions {
  template: string;
  git: boolean;
  install: boolean;
}

const TEMPLATES = {
  simple: {
    name: 'Simple Bot',
    description: 'Basic bot with a few commands',
  },
  moderation: {
    name: 'Moderation Bot',
    description: 'Bot with moderation features',
  },
  full: {
    name: 'Full Featured',
    description: 'Complete bot with all features',
  },
};

export async function initCommand(
  name: string | undefined,
  options: InitOptions
): Promise<void> {
  console.log(chalk.bold.cyan('\n  FURLOW Bot Generator\n'));

  // Prompt for name if not provided
  let projectName: string;
  if (!name) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        default: 'my-furlow-bot',
        validate: (input: string) => {
          if (!/^[a-z0-9-]+$/.test(input)) {
            return 'Name must be lowercase letters, numbers, and hyphens only';
          }
          return true;
        },
      },
    ]);
    projectName = answers.name ?? 'my-furlow-bot';
  } else {
    projectName = name;
  }

  const projectDir = join(process.cwd(), projectName);

  const spinner = ora('Creating project structure...').start();

  try {
    // Create directories
    await mkdir(projectDir, { recursive: true });
    await mkdir(join(projectDir, 'commands'), { recursive: true });
    await mkdir(join(projectDir, 'events'), { recursive: true });
    await mkdir(join(projectDir, 'flows'), { recursive: true });

    // Create main spec file
    await writeFile(
      join(projectDir, 'furlow.yaml'),
      generateMainSpec(projectName, options.template)
    );

    // Create .env.example
    await writeFile(
      join(projectDir, '.env.example'),
      `# Discord Bot Token (required)
DISCORD_TOKEN=your_bot_token_here

# Discord Application ID (required)
DISCORD_CLIENT_ID=your_client_id_here
`
    );

    // Create .gitignore
    await writeFile(
      join(projectDir, '.gitignore'),
      `node_modules/
.env
*.db
*.sqlite
dist/
`
    );

    // Create package.json
    await writeFile(
      join(projectDir, 'package.json'),
      JSON.stringify(
        {
          name,
          version: '1.0.0',
          private: true,
          type: 'module',
          scripts: {
            start: 'furlow start',
            dev: 'furlow dev',
            validate: 'furlow validate furlow.yaml',
          },
          dependencies: {
            furlow: '^0.1.0',
          },
        },
        null,
        2
      )
    );

    // Create example command
    await writeFile(
      join(projectDir, 'commands', 'ping.yaml'),
      generatePingCommand()
    );

    // Create example event
    await writeFile(
      join(projectDir, 'events', 'ready.yaml'),
      generateReadyEvent()
    );

    spinner.succeed('Project structure created');

    // Initialize git
    if (options.git) {
      const gitSpinner = ora('Initializing git repository...').start();
      try {
        const { execSync } = await import('node:child_process');
        execSync('git init', { cwd: projectDir, stdio: 'ignore' });
        gitSpinner.succeed('Git repository initialized');
      } catch {
        gitSpinner.fail('Failed to initialize git');
      }
    }

    // Install dependencies
    if (options.install) {
      const installSpinner = ora('Installing dependencies...').start();
      try {
        const { execSync } = await import('node:child_process');
        execSync('npm install', { cwd: projectDir, stdio: 'ignore' });
        installSpinner.succeed('Dependencies installed');
      } catch {
        installSpinner.fail('Failed to install dependencies');
      }
    }

    console.log('\n' + chalk.green('  Project created successfully!') + '\n');
    console.log('  Next steps:');
    console.log(chalk.dim(`    cd ${projectName}`));
    console.log(chalk.dim('    cp .env.example .env'));
    console.log(chalk.dim('    # Edit .env with your bot token'));
    console.log(chalk.dim('    npm run dev'));
    console.log('');
  } catch (error) {
    spinner.fail('Failed to create project');
    console.error(error);
    process.exit(1);
  }
}

function generateMainSpec(name: string, _template: string): string {
  return `# ${name} - FURLOW Bot Configuration

version: "0.1"

imports:
  - ./commands/ping.yaml
  - ./events/ready.yaml

identity:
  name: "${name}"

presence:
  status: online
  activity:
    type: playing
    text: "with FURLOW"

intents:
  auto: true

state:
  storage:
    type: sqlite
    path: ./data.db
`;
}

function generatePingCommand(): string {
  return `# Ping command
commands:
  - name: ping
    description: Check if the bot is responsive
    actions:
      - action: reply
        content: "Pong! Latency: \${client.ws.ping}ms"
        ephemeral: true
`;
}

function generateReadyEvent(): string {
  return `# Ready event handler
events:
  - event: ready
    actions:
      - action: log
        level: info
        message: "Bot is ready! Logged in as \${client.user.tag}"
`;
}
