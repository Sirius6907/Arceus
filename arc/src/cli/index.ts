#!/usr/bin/env node

// Heap re-spawn removed — only analyze.ts needs the 8GB heap (via its own ensureHeap()).
// Removing it from here improves MCP server startup time significantly.

import { createRequire } from 'node:module';
import { binName } from './cli-message.js';

const _require = createRequire(import.meta.url);
const pkg = _require('../../package.json');

function camelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function parseArgs(args: string[], cmd: string) {
  const positionals: string[] = [];
  const options: Record<string, any> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('-')) {
      let key = arg.replace(/^--?/, '');
      let hasValue = false;
      let value: any = true;

      // Handle negative prefix (--no-stats, --no-reasoning-model)
      let isNegative = false;
      if (key.startsWith('no-')) {
        isNegative = true;
        key = key.substring(3);
      }

      // Check if it's in format --name=value
      if (key.includes('=')) {
        const parts = key.split('=');
        key = parts[0];
        value = parts.slice(1).join('=');
        hasValue = true;
      }

      // Translate short flags to full option names based on command context
      if (key === 'f') {
        key = cmd === 'context' ? 'file' : 'force';
      } else if (key === 'p') {
        key = 'port';
      } else if (key === 'r') {
        key = 'repo';
      } else if (key === 'v') {
        key = 'verbose';
      } else if (key === 'l') {
        key = 'limit';
      } else if (key === 'c') {
        key = 'context';
      } else if (key === 'g') {
        key = 'goal';
      } else if (key === 'u') {
        key = 'uid';
      } else if (key === 'd') {
        key = 'direction';
      } else if (key === 's') {
        key = 'scope';
      } else if (key === 'b') {
        key = 'base-ref';
      }

      const camelKey = camelCase(key);

      if (isNegative) {
        options[camelKey] = false;
      } else if (!hasValue) {
        // Look ahead to check if the next argument is a value
        const next = args[i + 1];
        if (next !== undefined && !next.startsWith('-')) {
          options[camelKey] = next;
          i++; // Skip the next arg as it was consumed as value
        } else {
          options[camelKey] = true;
        }
      } else {
        options[camelKey] = value;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { positionals, options };
}

function printMainHelp() {
  console.log(`Usage: ${binName} <command> [options]

Arceus local CLI and MCP server

Commands:
  setup                            One-time setup: configure MCP for Cursor, Claude Code, OpenCode, Codex
  analyze [path]                   Index a repository (full analysis)
  index [path...]                 Register an existing .arc/ folder into the global registry
  serve                            Start local HTTP server for web UI connection
  stop                             Stop the local HTTP server on a port (default: 4747)
  mcp                              Start MCP server (stdio) — serves all indexed repos
  list                             List all indexed repositories
  status                           Show index status for current repo
  doctor                           Show runtime platform capabilities and embedding configuration
  clean                            Delete Arceus index for current repo
  remove <target>                  Delete the Arceus index for a registered repo
  wiki [path]                      Generate repository wiki from knowledge graph
  augment <pattern>                Augment a search pattern with knowledge graph context
  publish [path]                   Notify the understand-quickly registry that this repo has a fresh Arceus index
  query <search_query>             Search the knowledge graph for execution flows
  context [name]                   360-degree view of a code symbol
  impact <target>                  Blast radius analysis: what breaks if you change a symbol
  cypher <query>                   Execute raw Cypher query against the knowledge graph
  detect-changes                   Map git diff hunks to indexed symbols
  eval-server                      Start lightweight HTTP server for fast tool calls during evaluation
  group <subcommand>               Manage repository groups for cross-index impact analysis

Options:
  -h, --help                       Show this help information
  -v, --version                    Show version number

Run "${binName} <command> --help" for detailed option information.`);
}

function printCommandHelp(cmd: string) {
  switch (cmd) {
    case 'setup':
      console.log(`Usage: ${binName} setup [options]

One-time setup: configure MCP for Cursor, Claude Code, OpenCode, Codex

Options:
  -h, --help            Show this help information`);
      break;
    case 'analyze':
      console.log(`Usage: ${binName} analyze [path] [options]

Index a repository (full analysis)

Options:
  -f, --force                   Force full re-index even if up to date
  --embeddings [limit]          Enable embedding generation for semantic search (off by default)
  --drop-embeddings             Drop existing embeddings on rebuild
  --skills                      Generate repo-specific skill files from detected communities
  --skip-agents-md              Skip updating the arc section in AGENTS.md and CLAUDE.md
  --no-stats                    Omit volatile file/symbol counts from AGENTS.md and CLAUDE.md
  --skip-skills                 Skip installing standard Arceus skill files under .claude/skills/arc/
  --index-only                  Pure index mode: skip all file injection
  --skip-git                    Treat the provided path/cwd as the index root and skip parent git-root discovery
  --name <alias>                Register this repo under a custom name in ~/.arc/registry.json
  --allow-duplicate-name        Register this repo even if another path already uses the same --name alias
  -v, --verbose                 Enable verbose ingestion warnings
  --max-file-size <kb>          Skip files larger than this (KB)
  --worker-timeout <seconds>    Worker sub-batch idle timeout before retry/fallback
  --embedding-threads <n>       Limit local ONNX embedding CPU threads
  --embedding-batch-size <n>    Number of nodes per embedding batch
  --embedding-sub-batch-size <n> Number of chunks per embedding model call
  --embedding-device <device>   Embedding device: auto, cpu, dml, cuda, or wasm`);
      break;
    case 'index':
      console.log(`Usage: ${binName} index [path...] [options]

Register an existing .arc/ folder into the global registry (no re-analysis needed)

Options:
  -f, --force           Register even if meta.json is missing (stats will be empty)
  --allow-non-git       Allow registering folders that are not Git repositories`);
      break;
    case 'serve':
      console.log(`Usage: ${binName} serve [options]

Start local HTTP/HTTPS server for web UI connection

Options:
  -p, --port <port>     Port number (default: 4747)
  --host <host>         Bind address (default: 127.0.0.1)
  --ssl-key <path>      Path to SSL/TLS private key file (enables HTTPS)
  --ssl-cert <path>     Path to SSL/TLS certificate file (enables HTTPS)`);
      break;
    case 'stop':
      console.log(`Usage: ${binName} stop [options]

Stop the local HTTP server on a port

Options:
  -p, --port <port>     Port number (default: 4747)`);
      break;
    case 'clean':
      console.log(`Usage: ${binName} clean [options]

Delete Arceus index for current repo

Options:
  -f, --force           Skip confirmation prompt
  --all                 Clean all indexed repos`);
      break;
    case 'remove':
      console.log(`Usage: ${binName} remove <target> [options]

Delete the Arceus index for a registered repo (by alias, name, or absolute path)

Options:
  -f, --force           Skip confirmation prompt`);
      break;
    case 'wiki':
      console.log(`Usage: ${binName} wiki [path] [options]

Generate repository wiki from knowledge graph

Options:
  -f, --force                   Force full regeneration even if up to date
  --provider <provider>         LLM provider: openai or cursor (default: openai)
  --model <model>               LLM model or Azure deployment name
  --base-url <url>              LLM API base URL
  --api-key <key>               LLM API key or Azure api-key
  --api-version <version>       Azure api-version query param
  --reasoning-model             Mark deployment as reasoning model
  --no-reasoning-model          Disable reasoning model mode
  --concurrency <n>             Parallel LLM calls (default: 3)
  --timeout <seconds>           Per-attempt LLM request timeout in seconds
  --retries <n>                 Max LLM retry attempts per request
  --gist                        Publish wiki as a public GitHub Gist after generation
  -v, --verbose                 Enable verbose output
  --review                      Stop after grouping to review module structure before generating pages`);
      break;
    case 'augment':
      console.log(`Usage: ${binName} augment <pattern>

Augment a search pattern with knowledge graph context`);
      break;
    case 'publish':
      console.log(`Usage: ${binName} publish [path] [options]

Notify the understand-quickly registry that this repo has a fresh Arceus index.
Uses UNDERSTAND_QUICKLY_TOKEN environment variable for registry authorization.

Options:
  --id <owner/repo>             Override the registry id
  --skip-git                    Treat cwd as the repo root and skip parent git-root discovery`);
      break;
    case 'query':
      console.log(`Usage: ${binName} query <search_query> [options]

Search the knowledge graph for execution flows related to a concept

Options:
  -r, --repo <name>     Target repository
  -c, --context <text>  Task context to improve ranking
  -g, --goal <text>     What you want to find
  -l, --limit <n>       Max processes to return (default: 5)
  --content             Include full symbol source code`);
      break;
    case 'context':
      console.log(`Usage: ${binName} context [options] [name]

360-degree view of a code symbol: callers, callees, processes

Options:
  -r, --repo <name>     Target repository
  -u, --uid <uid>       Direct symbol UID (zero-ambiguity lookup)
  -f, --file <path>     File path to disambiguate common names
  --content             Include full symbol source code`);
      break;
    case 'impact':
      console.log(`Usage: ${binName} impact <target> [options]

Blast radius analysis: what breaks if you change a symbol

Options:
  -d, --direction <dir> upstream (dependants) or downstream (dependencies) (default: upstream)
  -r, --repo <name>     Target repository
  --depth <n>           Max relationship depth (default: 3)
  --include-tests       Include test files in results`);
      break;
    case 'cypher':
      console.log(`Usage: ${binName} cypher <query> [options]

Execute raw Cypher query against the knowledge graph

Options:
  -r, --repo <name>     Target repository`);
      break;
    case 'detect-changes':
    case 'detect_changes':
      console.log(`Usage: ${binName} detect-changes|detect_changes [options]

Map git diff hunks to indexed symbols and affected execution flows

Options:
  -s, --scope <scope>   What to analyze: unstaged, staged, all, or compare (default: unstaged)
  -b, --base-ref <ref>  Branch/commit for compare scope
  -r, --repo <name>     Target repository`);
      break;
    case 'eval-server':
      console.log(`Usage: ${binName} eval-server [options]

Start lightweight HTTP server for fast tool calls during evaluation

Options:
  -p, --port <port>             Port number (default: 4848)
  --idle-timeout <seconds>      Auto-shutdown after N seconds idle (default: 0)`);
      break;
    case 'group':
      console.log(`Usage: ${binName} group <subcommand> [options]

Manage repository groups for cross-index impact analysis

Subcommands:
  create <name>                   Create a new group with template group.yaml
  add <group> <groupPath> <registryName>  Add a repo to a group
  remove <group> <path>           Remove a repo from a group
  list [name]                     List all groups or details of one
  status <name>                   Check staleness of group and repos
  sync <name>                     Sync Contract Registry
  impact <name>                   Cross-repo impact analysis
  query <name> <query>            Search execution flows across group repos
  contracts <name>                Inspect Contract Registry`);
      break;
  }
}

async function runCLI() {
  // Anti-rebranding runtime protection
  const authorTarget = ['Chan', 'dan', ' ', 'Ku', 'mar', ' ', 'Be', 'he', 'ra'].join('');
  const repoTarget = ['Sir', 'ius', '69', '07', '/', 'Arc', 'eus'].join('');
  const nameTarget = ['arc', 'eus', '-', 's'].join('');
  if (
    pkg.author !== authorTarget ||
    pkg.name !== nameTarget ||
    !pkg.homepage?.includes(repoTarget) ||
    !pkg.repository?.url?.includes(repoTarget)
  ) {
    console.error(
      '\x1b[31m%s\x1b[0m',
      '----------------------------------------------------------------------',
    );
    console.error('\x1b[31m%s\x1b[0m', 'ERROR: Unauthorized rebranding detected.');
    console.error(
      '\x1b[31m%s\x1b[0m',
      `Arceus is licensed only under ownership of ${authorTarget}.`,
    );
    console.error('\x1b[31m%s\x1b[0m', `Original Repository: https://github.com/${repoTarget}`);
    console.error(
      '\x1b[31m%s\x1b[0m',
      '----------------------------------------------------------------------',
    );
    process.exit(1);
  }

  const args = process.argv.slice(2);

  if (args.length === 0) {
    printMainHelp();
    process.exitCode = 1;
    return;
  }

  const firstArg = args[0];

  if (firstArg === '--help' || firstArg === '-h' || firstArg === 'help') {
    printMainHelp();
    return;
  }

  if (firstArg === '--version' || firstArg === '-v') {
    console.log(pkg.version);
    return;
  }

  const cmd = firstArg;
  const { positionals, options } = parseArgs(args.slice(1), cmd);

  if (options.help || options.h) {
    printCommandHelp(cmd);
    return;
  }

  switch (cmd) {
    case 'setup': {
      const { setupCommand } = await import('./setup.js');
      await setupCommand();
      break;
    }
    case 'analyze': {
      const inputPath = positionals[0];
      const { analyzeCommand } = await import('./analyze.js');
      await analyzeCommand(inputPath, options);
      break;
    }
    case 'index': {
      const { indexCommand } = await import('./index-repo.js');
      await indexCommand(positionals, options);
      break;
    }
    case 'serve': {
      if (options.port === undefined) options.port = '4747';
      const { serveCommand } = await import('./serve.js');
      await serveCommand(options);
      break;
    }
    case 'stop': {
      if (options.port === undefined) options.port = '4747';
      const { stopCommand } = await import('./stop.js');
      await stopCommand(options);
      break;
    }
    case 'mcp': {
      const { mcpCommand } = await import('./mcp.js');
      await mcpCommand();
      break;
    }
    case 'list': {
      const { listCommand } = await import('./list.js');
      await listCommand();
      break;
    }
    case 'status': {
      const { statusCommand } = await import('./status.js');
      await statusCommand();
      break;
    }
    case 'doctor': {
      const { doctorCommand } = await import('./doctor.js');
      await doctorCommand();
      break;
    }
    case 'clean': {
      const { cleanCommand } = await import('./clean.js');
      await cleanCommand(options);
      break;
    }
    case 'remove': {
      const target = positionals[0];
      if (!target) {
        console.error('Error: remove command requires a target repo name/path');
        process.exitCode = 1;
        return;
      }
      const { removeCommand } = await import('./remove.js');
      await removeCommand(target, options);
      break;
    }
    case 'wiki': {
      const inputPath = positionals[0];
      if (options.concurrency === undefined) options.concurrency = '3';
      const { wikiCommand } = await import('./wiki.js');
      await wikiCommand(inputPath, options);
      break;
    }
    case 'augment': {
      const pattern = positionals[0];
      if (!pattern) {
        console.error('Error: augment command requires a pattern');
        process.exitCode = 1;
        return;
      }
      const { augmentCommand } = await import('./augment.js');
      await augmentCommand(pattern);
      break;
    }
    case 'publish': {
      const inputPath = positionals[0];
      const { publishCommand } = await import('./publish.js');
      await publishCommand(inputPath, options);
      break;
    }
    case 'query': {
      const queryText = positionals[0];
      const { queryCommand } = await import('./tool.js');
      await queryCommand(queryText, options);
      break;
    }
    case 'context': {
      const name = positionals[0];
      const { contextCommand } = await import('./tool.js');
      await contextCommand(name || '', options);
      break;
    }
    case 'impact': {
      const target = positionals[0];
      const { impactCommand } = await import('./tool.js');
      await impactCommand(target, options);
      break;
    }
    case 'cypher': {
      const queryText = positionals[0];
      const { cypherCommand } = await import('./tool.js');
      await cypherCommand(queryText, options);
      break;
    }
    case 'detect-changes':
    case 'detect_changes': {
      const { detectChangesCommand } = await import('./tool.js');
      await detectChangesCommand(options);
      break;
    }
    case 'eval-server': {
      if (options.port === undefined) options.port = '4848';
      if (options.idleTimeout === undefined) options.idleTimeout = '0';
      const { evalServerCommand } = await import('./eval-server.js');
      await evalServerCommand(options);
      break;
    }
    case 'group': {
      const subcommand = positionals[0];
      if (!subcommand) {
        printCommandHelp('group');
        return;
      }
      const { executeGroupCommand } = await import('./group.js');
      await executeGroupCommand(subcommand, positionals.slice(1), options);
      break;
    }
    default: {
      console.error(`Unknown command: ${cmd}`);
      console.error(`Run "${binName} --help" for detailed option information.`);
      process.exitCode = 1;
    }
  }
}

runCLI().catch((err) => {
  console.error('CLI execution failed:', err);
  process.exitCode = 1;
});
