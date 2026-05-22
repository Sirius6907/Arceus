// arc/src/cli/group.ts
import { createRequire } from 'node:module';
import { logger } from '../core/logger.js';

const _require = createRequire(import.meta.url);
const yaml = _require('js-yaml') as typeof import('js-yaml');

export async function executeGroupCommand(
  subcommand: string,
  args: string[],
  options: Record<string, any>,
): Promise<void> {
  switch (subcommand) {
    case 'create': {
      const name = args[0];
      if (!name) {
        console.error('Error: group create requires a group name');
        process.exitCode = 1;
        return;
      }
      const force = !!options.force;
      const { createGroupDir, getDefaultArceusDir } = await import('../core/group/storage.js');
      const dir = await createGroupDir(getDefaultArceusDir(), name, force);
      console.log(`Created group "${name}" at ${dir}`);
      console.log('Edit group.yaml to add repos, then run: arc group sync ' + name);
      break;
    }

    case 'add': {
      const groupName = args[0];
      const groupPath = args[1];
      const registryName = args[2];
      if (!groupName || !groupPath || !registryName) {
        console.error('Error: group add requires <group> <groupPath> <registryName>');
        process.exitCode = 1;
        return;
      }
      const { getGroupDir, getDefaultArceusDir } = await import('../core/group/storage.js');
      const { loadGroupConfig } = await import('../core/group/config-parser.js');
      const path = await import('node:path');
      const fs = await import('node:fs/promises');
      const groupDir = getGroupDir(getDefaultArceusDir(), groupName);
      const config = await loadGroupConfig(groupDir);
      config.repos[groupPath] = registryName;

      await fs.writeFile(path.join(groupDir, 'group.yaml'), yaml.dump(config), 'utf-8');
      console.log(`Added ${registryName} as "${groupPath}" to group "${groupName}"`);
      console.log(`Run: arc group sync ${groupName}`);
      break;
    }

    case 'remove': {
      const groupName = args[0];
      const repoPath = args[1];
      if (!groupName || !repoPath) {
        console.error('Error: group remove requires <group> <path>');
        process.exitCode = 1;
        return;
      }
      const { getGroupDir, getDefaultArceusDir } = await import('../core/group/storage.js');
      const { loadGroupConfig } = await import('../core/group/config-parser.js');
      const path = await import('node:path');
      const fs = await import('node:fs/promises');
      const groupDir = getGroupDir(getDefaultArceusDir(), groupName);
      const config = await loadGroupConfig(groupDir);
      if (!(repoPath in config.repos)) {
        logger.error(`Repo path "${repoPath}" not found in group "${groupName}"`);
        process.exitCode = 1;
        return;
      }
      delete config.repos[repoPath];
      await fs.writeFile(path.join(groupDir, 'group.yaml'), yaml.dump(config), 'utf-8');
      console.log(`Removed "${repoPath}" from group "${groupName}"`);
      break;
    }

    case 'list': {
      const name = args[0];
      const { listGroups, getDefaultArceusDir, getGroupDir } =
        await import('../core/group/storage.js');
      if (!name) {
        const groups = await listGroups();
        if (groups.length === 0) {
          console.log('No groups configured. Create one with: arc group create <name>');
          return;
        }
        console.log('Groups:');
        groups.forEach((g) => console.log(`  ${g}`));
        return;
      }
      const { loadGroupConfig } = await import('../core/group/config-parser.js');
      const groupDir = getGroupDir(getDefaultArceusDir(), name);
      const config = await loadGroupConfig(groupDir);
      console.log(`Group: ${config.name}`);
      if (config.description) console.log(`Description: ${config.description}`);
      console.log(`\nRepos (${Object.keys(config.repos).length}):`);
      for (const [p, id] of Object.entries(config.repos)) {
        console.log(`  ${p} -> ${id}`);
      }
      if (config.links.length > 0) {
        console.log(`\nManifest links (${config.links.length}):`);
        for (const link of config.links) {
          console.log(`  ${link.from} -> ${link.to} [${link.type}: ${link.contract}]`);
        }
      }
      break;
    }

    case 'status': {
      const name = args[0];
      if (!name) {
        console.error('Error: group status requires a group name');
        process.exitCode = 1;
        return;
      }
      const { readContractRegistry, getGroupDir, getDefaultArceusDir } =
        await import('../core/group/storage.js');
      const { LocalBackend } = await import('../mcp/local/local-backend.js');

      const groupDir = getGroupDir(getDefaultArceusDir(), name);
      const registry = await readContractRegistry(groupDir);

      console.log(
        `Group: ${name}${registry ? ` (last sync: ${registry.generatedAt})` : ' (never synced)'}\n`,
      );

      const backend = new LocalBackend();
      try {
        await backend.init();
        const raw = await backend.getGroupService().groupStatus({ name });
        const st = raw as {
          repos?: Record<
            string,
            {
              indexStale: boolean;
              contractsStale: boolean;
              missing: boolean;
              commitsBehind?: number;
            }
          >;
          missingRepos?: string[];
        };

        console.log('  Repo index / contracts staleness:');
        for (const [repoPath, row] of Object.entries(st.repos || {})) {
          if (row.missing) {
            console.log(`  ${repoPath.padEnd(25)} MISSING   (not in registry or unreadable)`);
            continue;
          }
          const idx = row.indexStale
            ? `STALE     (${row.commitsBehind ?? '?'} commits behind)`
            : 'OK        ';
          const ctr = row.contractsStale ? ' CONTRACTS_STALE' : '';
          console.log(`  ${repoPath.padEnd(25)} ${idx}${ctr}`);
        }
        if ((st.missingRepos || []).length > 0) {
          console.log(`\n  Last sync missing repos: ${st.missingRepos!.join(', ')}`);
        }
      } finally {
        await backend.dispose().catch(() => {});
      }
      break;
    }

    case 'sync': {
      const name = args[0];
      if (!name) {
        console.error('Error: group sync requires a group name');
        process.exitCode = 1;
        return;
      }
      const { getGroupDir, getDefaultArceusDir } = await import('../core/group/storage.js');
      const { loadGroupConfig } = await import('../core/group/config-parser.js');
      const { syncGroup } = await import('../core/group/sync.js');

      const groupDir = getGroupDir(getDefaultArceusDir(), name);
      const config = await loadGroupConfig(groupDir);

      console.log(`Syncing group "${name}" (${Object.keys(config.repos).length} repos)...\n`);

      const result = await syncGroup(config, {
        groupDir,
        allowStale: Boolean(options.allowStale),
        verbose: Boolean(options.verbose),
        skipEmbeddings: Boolean(options.skipEmbeddings),
        exactOnly: Boolean(options.exactOnly),
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\nMatching cascade:`);
        const exactLinks = result.crossLinks.filter((l) => l.matchType === 'exact');
        console.log(`  exact:     ${exactLinks.length} cross-links (confidence 1.0)`);
        console.log(`  unmatched: ${result.unmatched.length} contracts`);
        console.log(
          `\nWrote contracts.json (${result.contracts.length} contracts, ${result.crossLinks.length} cross-links)`,
        );
      }
      break;
    }

    case 'impact': {
      const name = args[0];
      if (!name) {
        console.error('Error: group impact requires a group name');
        process.exitCode = 1;
        return;
      }
      const { LocalBackend } = await import('../mcp/local/local-backend.js');

      const backend = new LocalBackend();
      try {
        await backend.init();

        const payload: Record<string, unknown> = {
          name,
          repo: options.repo,
          target: options.target,
          direction: (options.direction as string) || 'upstream',
        };
        if (options.service) payload.service = options.service;
        if (options.subgroup) payload.subgroup = options.subgroup;
        if (options.maxDepth !== undefined && options.maxDepth !== '') {
          const n = parseInt(String(options.maxDepth), 10);
          if (!Number.isNaN(n)) payload.maxDepth = n;
        }
        if (options.crossDepth !== undefined && options.crossDepth !== '') {
          const n = parseInt(String(options.crossDepth), 10);
          if (!Number.isNaN(n)) payload.crossDepth = n;
        }
        if (options.minConfidence !== undefined && options.minConfidence !== '') {
          const n = parseFloat(String(options.minConfidence));
          if (!Number.isNaN(n)) payload.minConfidence = n;
        }
        if (options.timeoutMs !== undefined && options.timeoutMs !== '') {
          const n = parseInt(String(options.timeoutMs), 10);
          if (!Number.isNaN(n)) payload.timeoutMs = n;
        }
        if (options.includeTests) payload.includeTests = true;

        const raw = await backend.getGroupService().groupImpact(payload);
        if (raw && typeof raw === 'object' && 'error' in raw) {
          logger.error(String((raw as { error: string }).error));
          process.exitCode = 1;
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(raw, null, 2));
        } else {
          const summary = (raw as { summary?: Record<string, number> })?.summary;
          const risk = (raw as { risk?: string })?.risk;
          console.log(`Group impact for "${name}" (${String(options.repo)}): risk=${risk ?? '?'}`);
          if (summary) {
            console.log(
              `  direct=${summary.direct ?? 0} processes=${summary.processes_affected ?? 0} cross=${summary.cross_repo_hits ?? 0}`,
            );
          }
        }
      } finally {
        await backend.dispose().catch(() => {});
      }
      break;
    }

    case 'query': {
      const name = args[0];
      const queryText = args[1];
      if (!name || !queryText) {
        console.error('Error: group query requires <group> <query>');
        process.exitCode = 1;
        return;
      }
      const { LocalBackend } = await import('../mcp/local/local-backend.js');

      const limit = parseInt(String(options.limit ?? '5'), 10) || 5;
      const subgroup = options.subgroup as string | undefined;
      const backend = new LocalBackend();
      try {
        await backend.init();

        console.log(`Searching "${queryText}" across group "${name}"...\n`);

        const raw = await backend.getGroupService().groupQuery({
          name,
          query: queryText,
          limit,
          subgroup,
        });
        const merged = raw as {
          results: Array<Record<string, unknown>>;
          per_repo: Array<{ repo: string; count: number }>;
        };

        if (options.json) {
          console.log(JSON.stringify(raw, null, 2));
        } else {
          console.log(`Results (top ${merged.results.length}):\n`);
          for (const p of merged.results) {
            const label = (p.summary || p.heuristicLabel || p.name || 'unnamed') as string;
            console.log(`  [${p._repo}] ${label} (rrf: ${(p._rrf_score as number).toFixed(4)})`);
          }
          if (merged.results.length === 0) {
            console.log('  No matching execution flows found.');
          }
        }
      } finally {
        await backend.dispose().catch(() => {});
      }
      break;
    }

    case 'contracts': {
      const name = args[0];
      if (!name) {
        console.error('Error: group contracts requires a group name');
        process.exitCode = 1;
        return;
      }
      const { LocalBackend } = await import('../mcp/local/local-backend.js');

      const backend = new LocalBackend();
      try {
        await backend.init();
        const raw = await backend.getGroupService().groupContracts({
          name,
          type: options.type as string | undefined,
          repo: options.repo as string | undefined,
          unmatchedOnly: Boolean(options.unmatched),
        });

        if (raw && typeof raw === 'object' && 'error' in raw) {
          logger.error(String((raw as { error: string }).error));
          process.exitCode = 1;
          return;
        }

        const { contracts, crossLinks } = raw as {
          contracts: Array<{
            role: string;
            contractId: string;
            repo: string;
            symbolRef: { name: string };
          }>;
          crossLinks: Array<{
            from: { repo: string };
            to: { repo: string };
            matchType: string;
            confidence: number;
            contractId: string;
          }>;
        };

        if (options.json) {
          console.log(JSON.stringify({ contracts, crossLinks }, null, 2));
        } else {
          console.log(`Contracts (${contracts.length}):`);
          for (const c of contracts) {
            console.log(`  [${c.role}] ${c.contractId}  (${c.repo})  ${c.symbolRef.name}`);
          }
          console.log(`\nCross-links (${crossLinks.length}):`);
          for (const l of crossLinks) {
            console.log(
              `  ${l.from.repo} -> ${l.to.repo}  [${l.matchType}, conf=${l.confidence}]  ${l.contractId}`,
            );
          }
        }
      } finally {
        await backend.dispose().catch(() => {});
      }
      break;
    }

    default: {
      console.error(`Unknown group subcommand: ${subcommand}`);
      console.error('Run "arc group --help" for detailed option information.');
      process.exitCode = 1;
    }
  }
}
