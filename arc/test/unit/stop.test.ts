import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stopCommand } from '../../src/cli/stop.js';
import * as childProcess from 'node:child_process';

vi.mock('node:child_process', () => {
  return {
    exec: vi.fn(),
  };
});

describe('stopCommand', () => {
  let exitCodeBefore: typeof process.exitCode;
  let originalPlatform: string;

  beforeEach(() => {
    exitCodeBefore = process.exitCode;
    process.exitCode = 0;
    originalPlatform = process.platform;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.exitCode = exitCodeBefore;
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  it('validates invalid port numbers', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await stopCommand({ port: 'invalid' });
    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error: Invalid port number'),
    );
    consoleErrorSpy.mockRestore();
  });

  it('works on win32 platform when process is found and killed successfully', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'win32',
    });

    const netstatOutput = `
  Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    [::1]:4747             [::]:0                 LISTENING       9876
`;

    const execMock = vi.spyOn(childProcess, 'exec').mockImplementation((cmd, callback: any) => {
      if (cmd === 'netstat -ano') {
        callback(null, { stdout: netstatOutput, stderr: '' });
      } else if (cmd.includes('taskkill')) {
        callback(null, { stdout: 'SUCCESS: Sent termination signal', stderr: '' });
      }
      return {} as any;
    });

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await stopCommand({ port: '4747' });

    expect(execMock).toHaveBeenCalledWith('netstat -ano', expect.any(Function));
    expect(execMock).toHaveBeenCalledWith('taskkill /F /PID 9876', expect.any(Function));
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Successfully stopped process(es) on port 4747 (PID: 9876)'),
    );

    consoleLogSpy.mockRestore();
    execMock.mockRestore();
  });

  it('works on win32 platform when no process is found', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'win32',
    });

    const execMock = vi.spyOn(childProcess, 'exec').mockImplementation((cmd, callback: any) => {
      if (cmd === 'netstat -ano') {
        callback(null, { stdout: 'Active Connections\n', stderr: '' });
      }
      return {} as any;
    });

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await stopCommand({ port: '4747' });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('No active process found using port 4747'),
    );

    consoleLogSpy.mockRestore();
    execMock.mockRestore();
  });

  it('works on non-win32 platform using lsof', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
    });

    const execMock = vi.spyOn(childProcess, 'exec').mockImplementation((cmd, callback: any) => {
      if (cmd === 'lsof -t -i :4747') {
        callback(null, { stdout: '12345\n', stderr: '' });
      } else if (cmd === 'kill -9 12345') {
        callback(null, { stdout: '', stderr: '' });
      }
      return {} as any;
    });

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await stopCommand({ port: '4747' });

    expect(execMock).toHaveBeenCalledWith('lsof -t -i :4747', expect.any(Function));
    expect(execMock).toHaveBeenCalledWith('kill -9 12345', expect.any(Function));
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Successfully stopped process(es) on port 4747 (PID: 12345)'),
    );

    consoleLogSpy.mockRestore();
    execMock.mockRestore();
  });
});
