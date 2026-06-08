// ============================================================================
// MSA Monitor — Recent Logs API Route
// Returns recent PM2 and application logs
// ============================================================================
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function GET() {
  try {
    const lines = 30;

    // PM2 out logs
    let outLogs: string[] = [];
    try {
      const out = execSync(
        `pm2 logs msa-eks --lines ${lines} --nostream 2>/dev/null | tail -${lines}`,
        { encoding: 'utf-8', timeout: 10000 }
      );
      outLogs = out.split('\n').filter((l: string) => l.trim());
    } catch { /* ignore */ }

    // PM2 error logs
    let errLogs: string[] = [];
    try {
      const err = execSync(
        `tail -${lines} /home/ubuntu/.pm2/logs/msa-eks-error.log 2>/dev/null`,
        { encoding: 'utf-8', timeout: 5000 }
      );
      errLogs = err.split('\n').filter((l: string) => l.trim());
    } catch { /* ignore */ }

    // Recent HTTP requests from out logs
    const httpRequests = outLogs
      .filter((l: string) => l.match(/\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\]\s+(GET|POST|PUT|DELETE|PATCH)\s+/))
      .map((l: string) => {
        const match = l.match(/\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\]\s+(GET|POST|PUT|DELETE|PATCH)\s+(\S+)\s+(\d+)\s+(\d+)ms/);
        if (match) {
          return {
            time: match[1],
            method: match[2],
            path: match[3],
            status: parseInt(match[4]),
            duration: parseInt(match[5]),
          };
        }
        return null;
      })
      .filter(Boolean)
      .slice(-20);

    return NextResponse.json({
      success: true,
      data: {
        outLogs: outLogs.slice(-lines),
        errLogs: errLogs.slice(-lines),
        httpRequests,
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
