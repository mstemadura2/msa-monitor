'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Server, Cpu, HardDrive, MemoryStick, Activity,
  Cloud, Shield, Clock, RefreshCw, ExternalLink,
  ArrowUpRight, AlertTriangle, CheckCircle2,
  XCircle, FileText, Gauge, Globe, Lock, Terminal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

// Types
interface ServerData {
  cpu: { usage: string; cores: string; loadAvg: string[] };
  memory: { total: number; used: number; available: number; percent: string };
  disk: { total: string; used: string; available: string; percent: number };
  uptime: string;
  systemTime: string;
}

interface PM2Process {
  name: string; pid: number; pmId: number; status: string;
  cpu: string; memory: string; uptime: string;
  restarts: number; nodeVersion: string;
}

interface PM2Data {
  version: string; processes: PM2Process[];
  totalProcesses: number; online: number; stopped: number;
}

interface S3Data {
  bucket: string; region: string; bucketExists: boolean;
  fileCount: number; totalSize: { bytes: number; kb: string; mb: string; gb: string };
  freeTier: { gb: number; usagePercent: string };
  folders: Record<string, { count: number; size: number }>;
  recentFiles: { key: string; size: number; lastModified: string }[];
}

interface NginxData {
  status: string; active: boolean; version: string;
  ports: { http: boolean; https: boolean };
  ssl: { expiry: string; daysLeft: number };
}

interface LogData {
  outLogs: string[];
  errLogs: string[];
  httpRequests: { time: string; method: string; path: string; status: number; duration: number }[];
}

interface MonitorState {
  server: ServerData | null;
  pm2: PM2Data | null;
  s3: S3Data | null;
  nginx: NginxData | null;
  logs: LogData | null;
  loading: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

export default function MonitorDashboard() {
  const [state, setState] = useState<MonitorState>({
    server: null, pm2: null, s3: null, nginx: null, logs: null,
    loading: true, lastUpdate: null, error: null,
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(30);

  const fetchAllData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [serverRes, pm2Res, s3Res, nginxRes, logsRes] = await Promise.allSettled([
        fetch('/api/server-status').then(r => r.json()),
        fetch('/api/pm2-status').then(r => r.json()),
        fetch('/api/s3-status').then(r => r.json()),
        fetch('/api/nginx-status').then(r => r.json()),
        fetch('/api/recent-logs').then(r => r.json()),
      ]);

      setState({
        server: serverRes.status === 'fulfilled' ? serverRes.value.data : null,
        pm2: pm2Res.status === 'fulfilled' ? pm2Res.value.data : null,
        s3: s3Res.status === 'fulfilled' ? s3Res.value.data : null,
        nginx: nginxRes.status === 'fulfilled' ? nginxRes.value.data : null,
        logs: logsRes.status === 'fulfilled' ? logsRes.value.data : null,
        loading: false,
        lastUpdate: new Date(),
        error: null,
      });
    } catch {
      setState(prev => ({ ...prev, loading: false, error: 'Failed to fetch data' }));
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    void fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          fetchAllData();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAllData]);

  const getStatusColor = (percent: number) => {
    if (percent < 60) return 'text-emerald-400';
    if (percent < 80) return 'text-amber-400';
    return 'text-red-400';
  };



  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-emerald-500/20 text-emerald-400';
      case 'POST': return 'bg-blue-500/20 text-blue-400';
      case 'PUT': return 'bg-amber-500/20 text-amber-400';
      case 'DELETE': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getHttpStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-emerald-400';
    if (status >= 300 && status < 400) return 'text-blue-400';
    if (status >= 400 && status < 500) return 'text-amber-400';
    return 'text-red-400';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">MSA-EKS Monitor</h1>
              <p className="text-xs text-muted-foreground">Server Monitoring Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 live-pulse" />
              <span className="text-xs text-muted-foreground">
                {state.loading ? 'Updating...' : 'Live'}
              </span>
            </div>
            {state.lastUpdate && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Updated: {state.lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchAllData}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              title="Refresh now"
            >
              <RefreshCw className={`w-4 h-4 ${state.loading ? 'animate-spin' : ''}`} />
            </button>
            <a
              href="https://msa-idn.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              title="Open MSA-EKS"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* CPU */}
          <Card className="border-border/50 bg-card/60 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">CPU</span>
                </div>
                <span className={`text-lg font-bold ${getStatusColor(parseFloat(state.server?.cpu.usage || '0'))}`}>
                  {state.server?.cpu.usage || '—'}%
                </span>
              </div>
              <Progress value={parseFloat(state.server?.cpu.usage || '0')} className="h-1.5" />
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>{state.server?.cpu.cores || '—'} cores</span>
                <span>Load: {state.server?.cpu.loadAvg?.[0] || '—'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Memory */}
          <Card className="border-border/50 bg-card/60 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MemoryStick className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">Memory</span>
                </div>
                <span className={`text-lg font-bold ${getStatusColor(parseFloat(state.server?.memory.percent || '0'))}`}>
                  {state.server?.memory.percent || '—'}%
                </span>
              </div>
              <Progress value={parseFloat(state.server?.memory.percent || '0')} className="h-1.5" />
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>{state.server?.memory.used || '—'} MB</span>
                <span>{state.server?.memory.total || '—'} MB</span>
              </div>
            </CardContent>
          </Card>

          {/* Disk */}
          <Card className="border-border/50 bg-card/60 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">Disk</span>
                </div>
                <span className={`text-lg font-bold ${getStatusColor(state.server?.disk.percent || 0)}`}>
                  {state.server?.disk.percent || '—'}%
                </span>
              </div>
              <Progress value={state.server?.disk.percent || 0} className="h-1.5" />
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>{state.server?.disk.used || '—'} used</span>
                <span>{state.server?.disk.total || '—'} total</span>
              </div>
            </CardContent>
          </Card>

          {/* Uptime */}
          <Card className="border-border/50 bg-card/60 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">Uptime</span>
                </div>
              </div>
              <p className="text-lg font-bold text-emerald-400">{state.server?.uptime || '—'}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {state.server?.systemTime ? new Date(state.server.systemTime).toLocaleString() : '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row: PM2 + S3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PM2 Status */}
          <Card className="border-border/50 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">PM2 Processes</CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  v{state.pm2?.version || '—'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* PM2 Summary */}
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{state.pm2?.online || 0} Online</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-3 h-3 text-red-400" />
                  <span>{state.pm2?.stopped || 0} Stopped</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3 h-3 text-muted-foreground" />
                  <span>{state.pm2?.totalProcesses || 0} Total</span>
                </div>
              </div>
              <Separator className="bg-border/50" />
              {/* Process List */}
              <div className="space-y-2">
                {state.pm2?.processes.map((p) => (
                  <div key={p.pmId} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${p.status === 'online' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <div>
                        <p className="text-xs font-medium">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">PID: {p.pid} | Up: {p.uptime} | Restarts: {p.restarts}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="text-amber-400">{p.cpu}% CPU</span>
                      <span className="text-blue-400">{p.memory} MB</span>
                      <Badge variant={p.status === 'online' ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0">
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {!state.pm2?.processes.length && (
                  <p className="text-xs text-muted-foreground text-center py-4">No processes found</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* S3 Storage */}
          <Card className="border-border/50 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">AWS S3 Storage</CardTitle>
                </div>
                <Badge variant={state.s3?.bucketExists ? 'default' : 'destructive'} className="text-[10px]">
                  {state.s3?.bucketExists ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* S3 Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Bucket</p>
                  <p className="text-xs font-medium truncate">{state.s3?.bucket || '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Region</p>
                  <p className="text-xs font-medium">{state.s3?.region || '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Total Files</p>
                  <p className="text-sm font-bold">{state.s3?.fileCount || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Total Size</p>
                  <p className="text-sm font-bold">{state.s3?.totalSize?.mb || '0'} MB</p>
                </div>
              </div>

              {/* Free Tier Usage */}
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground">Free Tier Usage (5 GB)</span>
                  <span className="text-[10px] font-medium">{state.s3?.freeTier?.usagePercent || '0'}%</span>
                </div>
                <Progress value={Math.min(parseFloat(state.s3?.freeTier?.usagePercent || '0'), 100)} className="h-1.5" />
              </div>

              {/* Folders */}
              {state.s3?.folders && Object.keys(state.s3.folders).length > 0 && (
                <>
                  <Separator className="bg-border/50" />
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-medium">Folders</p>
                    {Object.entries(state.s3.folders).map(([folder, data]) => (
                      <div key={folder} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs">{folder}/</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>{data.count} files</span>
                          <span>{formatFileSize(data.size)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Recent Files */}
              {state.s3?.recentFiles && state.s3.recentFiles.length > 0 && (
                <>
                  <Separator className="bg-border/50" />
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground font-medium">Recent Files</p>
                    {state.s3.recentFiles.slice(0, 5).map((f) => (
                      <div key={f.key} className="flex items-center justify-between py-1">
                        <span className="text-[10px] truncate max-w-[200px]">{f.key}</span>
                        <span className="text-[10px] text-muted-foreground">{formatFileSize(f.size)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row: Nginx + Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Nginx / SSL */}
          <Card className="border-border/50 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Nginx & SSL</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Nginx Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Nginx</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {state.nginx?.active ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-xs font-medium capitalize">{state.nginx?.status || 'Unknown'}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Server className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Version</span>
                  </div>
                  <p className="text-xs font-medium">{state.nginx?.version || '—'}</p>
                </div>
              </div>

              {/* Ports */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Port 80 (HTTP)</span>
                    {state.nginx?.ports.http ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Port 443 (HTTPS)</span>
                    {state.nginx?.ports.https ? (
                      <Lock className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* SSL Certificate */}
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">SSL Certificate</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Expires: {state.nginx?.ssl.expiry || '—'}</span>
                  <Badge
                    variant={(state.nginx?.ssl.daysLeft ?? 0) > 30 ? 'default' : 'destructive'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {(state.nginx?.ssl.daysLeft ?? 0) > 0
                      ? `${state.nginx?.ssl.daysLeft} days left`
                      : 'EXPIRED'}
                  </Badge>
                </div>
              </div>

              {/* Domain Info */}
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Domain</span>
                  <a href="https://msa-idn.com" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    msa-idn.com
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Logs */}
          <Card className="border-border/50 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Recent Logs</CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  Last {state.logs?.httpRequests?.length || 0} requests
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* HTTP Requests Table */}
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto monitor-scroll">
                {state.logs?.httpRequests && state.logs.httpRequests.length > 0 ? (
                  state.logs.httpRequests.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/20 hover:bg-muted/40 transition-colors text-[10px]">
                      <Badge className={`text-[9px] px-1.5 py-0 font-mono ${getMethodColor(req.method)}`}>
                        {req.method}
                      </Badge>
                      <span className="truncate flex-1 font-mono">{req.path}</span>
                      <span className={`font-mono ${getHttpStatusColor(req.status)}`}>{req.status}</span>
                      <span className="text-muted-foreground font-mono">{req.duration}ms</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No recent requests</p>
                )}
              </div>

              {/* Error Logs Preview */}
              {state.logs?.errLogs && state.logs.errLogs.length > 0 && (
                <>
                  <Separator className="bg-border/50 my-3" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] text-muted-foreground font-medium">Recent Errors</span>
                    </div>
                    <div className="max-h-[100px] overflow-y-auto monitor-scroll">
                      {state.logs.errLogs.slice(-3).map((log, i) => (
                        <p key={i} className="text-[10px] text-red-400/80 font-mono truncate">{log}</p>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground py-3 border-t border-border/30">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 live-pulse' : 'bg-muted-foreground/30'}`} />
            <span>
              {autoRefresh ? `Auto-refresh in ${refreshCountdown}s` : 'Auto-refresh paused'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="hover:text-foreground transition-colors"
            >
              {autoRefresh ? 'Pause' : 'Resume'}
            </button>
            <span>MSA-EKS Monitor v1.0</span>
          </div>
        </div>
      </main>
    </div>
  );
}
