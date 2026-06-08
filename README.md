# MSA-EKS Monitor

Server Monitoring Dashboard untuk MSA-EKS System.

## Fitur
- **Server Status**: CPU, Memory, Disk usage, Uptime
- **PM2 Processes**: Status, CPU, Memory, Restart count
- **AWS S3 Storage**: File count, total size, free tier usage
- **Nginx & SSL**: Status, port, SSL certificate expiry
- **Recent Logs**: HTTP requests, error logs
- **Auto-refresh**: Update setiap 30 detik

## Deploy ke EC2

```bash
# 1. Clone repository
cd /home/ubuntu
git clone https://github.com/mstemadura2/msa-monitor.git
cd msa-monitor

# 2. Install dependencies
bun install

# 3. Create .env file
cat > .env.local << 'EOF'
AWS_S3_BUCKET=msa-eks-uploads
AWS_S3_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
SERVER_NAME=MSA-EKS Production
SERVER_DOMAIN=msa-idn.com
EOF

# 4. Build
bun run build

# 5. Start with PM2 on port 3001
pm2 start "bun run start -- -p 3001" --name msa-monitor
pm2 save

# 6. Add Nginx config for monitor.msa-idn.com (optional)
```

## Akses
- Local: http://127.0.0.1:3001
- Jika domain di-setup: https://monitor.msa-idn.com

## Environment Variables
| Variable | Description | Required |
|---|---|---|
| `AWS_S3_BUCKET` | S3 bucket name | Yes |
| `AWS_S3_REGION` | S3 region | Yes |
| `AWS_ACCESS_KEY_ID` | AWS access key | Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Yes |
| `SERVER_NAME` | Display name | No |
| `SERVER_DOMAIN` | Domain name | No |
