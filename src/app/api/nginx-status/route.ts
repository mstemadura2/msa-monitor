// ============================================================================
// MSA Monitor — Nginx Status API Route
// ============================================================================
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function GET() {
  try {
    // Nginx status
    let nginxStatus = 'unknown';
    let nginxActive = false;
    try {
      const status = execSync("systemctl is-active nginx", { encoding: 'utf-8', timeout: 5000 }).trim();
      nginxStatus = status;
      nginxActive = status === 'active';
    } catch { /* ignore */ }

    // Nginx version
    let nginxVersion = 'unknown';
    try {
      const ver = execSync("nginx -v 2>&1", { encoding: 'utf-8', timeout: 5000 }).trim();
      nginxVersion = ver.replace('nginx version: ', '');
    } catch { /* ignore */ }

    // SSL certificate expiry
    let sslExpiry = 'unknown';
    let sslDaysLeft = -1;
    try {
      const certInfo = execSync(
        "echo | openssl s_client -connect 127.0.0.1:443 -servername msa-idn.com 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null",
        { encoding: 'utf-8', timeout: 10000 }
      ).trim();
      if (certInfo.includes('notAfter=')) {
        const dateStr = certInfo.replace('notAfter=', '');
        const expiryDate = new Date(dateStr);
        sslExpiry = expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        sslDaysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      }
    } catch { /* ignore */ }

    // Check if port 80 and 443 are listening
    let port80 = false;
    let port443 = false;
    try {
      execSync("ss -tlnp | grep ':80 '", { encoding: 'utf-8', timeout: 5000 });
      port80 = true;
    } catch { /* ignore */ }
    try {
      execSync("ss -tlnp | grep ':443 '", { encoding: 'utf-8', timeout: 5000 });
      port443 = true;
    } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      data: {
        status: nginxStatus,
        active: nginxActive,
        version: nginxVersion,
        ports: { http: port80, https: port443 },
        ssl: {
          expiry: sslExpiry,
          daysLeft: sslDaysLeft,
        }
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
