import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../core/logger.js';

const execAsync = promisify(exec);

export const stopCommand = async (options?: { port?: string }) => {
  const port = Number(options?.port ?? 4747);
  if (isNaN(port) || port <= 0 || port > 65535) {
    console.error(`Error: Invalid port number: ${options?.port}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Stopping process on port ${port}...`);

  try {
    const pids = await findPidsOnPort(port);
    if (pids.size === 0) {
      console.log(`No active process found using port ${port}.`);
      return;
    }

    const killedPids: number[] = [];
    const failedPids: number[] = [];

    for (const pid of pids) {
      if (pid === process.pid) {
        // Don't kill ourselves
        continue;
      }
      try {
        await killPid(pid);
        killedPids.push(pid);
      } catch (err) {
        logger.error({ err, pid }, 'Failed to kill process');
        failedPids.push(pid);
      }
    }

    if (killedPids.length > 0) {
      console.log(`Successfully stopped process(es) on port ${port} (PID: ${killedPids.join(', ')}).`);
    }
    if (failedPids.length > 0) {
      console.error(`Failed to stop process(es) on port ${port} (PID: ${failedPids.join(', ')}).`);
      process.exitCode = 1;
    }
  } catch (err: any) {
    console.error(`Error while scanning port ${port}:`, err.message || err);
    process.exitCode = 1;
  }
};

async function findPidsOnPort(port: number): Promise<Set<number>> {
  const pids = new Set<number>();

  if (process.platform === 'win32') {
    try {
      const { stdout } = await execAsync('netstat -ano');
      const lines = stdout.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length < 4) continue;

        // Local address is the second column (index 1)
        const localAddress = parts[1];
        if (
          localAddress &&
          (localAddress.endsWith(`:${port}`) || localAddress.endsWith(`]:${port}`))
        ) {
          const pidStr = parts[parts.length - 1];
          const pid = parseInt(pidStr, 10);
          if (!isNaN(pid) && pid > 0) {
            pids.add(pid);
          }
        }
      }
    } catch (err: any) {
      logger.debug({ err }, 'netstat execution failed');
      throw new Error(`Failed to list connections via netstat: ${err.message}`);
    }
  } else {
    // macOS / Linux
    try {
      const { stdout } = await execAsync(`lsof -t -i :${port}`);
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const pid = parseInt(line.trim(), 10);
        if (!isNaN(pid) && pid > 0) {
          pids.add(pid);
        }
      }
    } catch (err: any) {
      // lsof returns exit code 1 if no matches are found, which is not a real failure
      if (err.code !== 1) {
        // Try fallback to fuser
        try {
          const { stdout } = await execAsync(`fuser ${port}/tcp`);
          const lines = stdout.trim().split(/\s+/);
          for (const line of lines) {
            const pid = parseInt(line.trim(), 10);
            if (!isNaN(pid) && pid > 0) {
              pids.add(pid);
            }
          }
        } catch (fuserErr: any) {
          logger.debug({ fuserErr }, 'fuser execution failed');
          if (fuserErr.code !== 1) {
            throw new Error(`Failed to list connections via lsof/fuser: ${err.message}`);
          }
        }
      }
    }
  }

  return pids;
}

async function killPid(pid: number): Promise<void> {
  if (process.platform === 'win32') {
    await execAsync(`taskkill /F /PID ${pid}`);
  } else {
    await execAsync(`kill -9 ${pid}`);
  }
}
