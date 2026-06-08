// ============================================================================
// MSA Monitor — Server Status API Route
// Returns CPU, Memory, Disk, and Uptime info
// ============================================================================
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function GET() {
  try {
    // CPU Info
    const cpuInfo = execSync("top -bn1 | head -3", { encoding: 'utf-8', timeout: 5000 });
    const cpuLine = cpuInfo.split('\n').find((l: string) => l.includes('%Cpu')) || '';
    const cpuMatch = cpuLine.match(/(\d+\.\d+)\s+id/);
    const cpuIdle = cpuMatch ? parseFloat(cpuMatch[1]) : 0;
    const cpuUsage = 100 - cpuIdle;

    // CPU Core count
    const cpuCores = execSync("nproc", { encoding: 'utf-8', timeout: 3000 }).trim();

    // Memory Info
    const memInfo = execSync("free -m", { encoding: 'utf-8', timeout: 5000 });
    const memLines = memInfo.split('\n');
    const memLine = memLines[1] || '';
    const memParts = memLine.split(/\s+/);
    const memTotal = parseInt(memParts[1]) || 0;
    const memUsed = parseInt(memParts[2]) || 0;
    const memAvailable = parseInt(memParts[6]) || 0;
    const memPercent = memTotal > 0 ? ((memUsed / memTotal) * 100).toFixed(1) : '0';

    // Disk Info
    const diskInfo = execSync("df -h /", { encoding: 'utf-8', timeout: 5000 });
    const diskLine = diskInfo.split('\n')[1] || '';
    const diskParts = diskLine.split(/\s+/);
    const diskTotal = diskParts[1] || '0';
    const diskUsed = diskParts[2] || '0';
    const diskAvail = diskParts[3] || '0';
    const diskPercent = parseInt(diskParts[4]) || 0;

    // Uptime
    const uptime = execSync("uptime -p", { encoding: 'utf-8', timeout: 3000 }).trim();
    
    // Load Average
    const loadAvg = execSync("cat /proc/loadavg", { encoding: 'utf-8', timeout: 3000 }).trim().split(' ').slice(0, 3);

    // System time
    const systemTime = new Date().toISOString();

    return NextResponse.json({
      success: true,
      data: {
        cpu: {
          usage: cpuUsage.toFixed(1),
          cores: cpuCores,
          loadAvg: loadAvg,
        },
        memory: {
          total: memTotal,
          used: memUsed,
          available: memAvailable,
          percent: memPercent,
        },
        disk: {
          total: diskTotal,
          used: diskUsed,
          available: diskAvail,
          percent: diskPercent,
        },
        uptime: uptime.replace('up ', ''),
        loadAvg: loadAvg,
        systemTime,
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
