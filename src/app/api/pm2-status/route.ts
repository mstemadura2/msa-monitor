// ============================================================================
// MSA Monitor — PM2 Status API Route
// Returns PM2 process list and status
// ============================================================================
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function GET() {
  try {
    // Get PM2 process list in JSON format
    const pm2Output = execSync("pm2 jlist", { encoding: 'utf-8', timeout: 10000 });
    const processes = JSON.parse(pm2Output);

    const processList = processes.map((p: {
      name: string;
      pid: number;
      pm_id: number;
      monit: { memory: number; cpu: number };
      pm2_env: { status: string; pm_uptime: number; restart_time: number; node_version: string };
    }) => ({
      name: p.name,
      pid: p.pid,
      pmId: p.pm_id,
      status: p.pm2_env.status,
      cpu: p.monit.cpu.toFixed(1),
      memory: (p.monit.memory / 1024 / 1024).toFixed(1),
      uptime: formatUptime(p.pm2_env.pm_uptime),
      restarts: p.pm2_env.restart_time,
      nodeVersion: p.pm2_env.node_version,
    }));

    // PM2 version
    let pm2Version = 'unknown';
    try {
      pm2Version = execSync("pm2 -v", { encoding: 'utf-8', timeout: 5000 }).trim();
    } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      data: {
        version: pm2Version,
        processes: processList,
        totalProcesses: processList.length,
        online: processList.filter((p: { status: string }) => p.status === 'online').length,
        stopped: processList.filter((p: { status: string }) => p.status === 'stopped').length,
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function formatUptime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
