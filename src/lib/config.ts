// ============================================================================
// MSA Monitor — Configuration
// ============================================================================

export const CONFIG = {
  // AWS S3 Configuration
  s3: {
    bucket: process.env.AWS_S3_BUCKET || 'msa-eks-uploads',
    region: process.env.AWS_S3_REGION || 'ap-southeast-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },

  // Server Configuration
  server: {
    name: process.env.SERVER_NAME || 'MSA-EKS Production',
    host: process.env.SERVER_HOST || '54.254.130.137',
    domain: process.env.SERVER_DOMAIN || 'msa-idn.com',
  },

  // Refresh interval in seconds
  refreshInterval: 30,
};
