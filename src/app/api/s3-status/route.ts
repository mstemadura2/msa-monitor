// ============================================================================
// MSA Monitor — S3 Storage Status API Route
// Returns S3 bucket file count, total size, and file listing
// ============================================================================
import { NextResponse } from 'next/server';
import {
  S3Client,
  ListObjectsV2Command,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || 'msa-eks-uploads';

export async function GET() {
  try {
    // Check bucket exists
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET }));

    // List all objects
    let totalSize = 0;
    let fileCount = 0;
    let continuationToken: string | undefined = undefined;
    const folders: Record<string, { count: number; size: number }> = {};
    const recentFiles: { key: string; size: number; lastModified: string }[] = [];

    do {
      const list = await s3Client.send(new ListObjectsV2Command({
        Bucket: BUCKET,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      }));

      if (list.Contents) {
        list.Contents.forEach(f => {
          totalSize += f.Size || 0;
          fileCount++;
          const folder = (f.Key || '').split('/')[0];
          if (!folders[folder]) folders[folder] = { count: 0, size: 0 };
          folders[folder].count++;
          folders[folder].size += f.Size || 0;

          recentFiles.push({
            key: f.Key || '',
            size: f.Size || 0,
            lastModified: f.LastModified?.toISOString() || '',
          });
        });
      }

      continuationToken = list.NextContinuationToken;
    } while (continuationToken);

    // Sort recent files by date, take last 10
    recentFiles.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    const last10Files = recentFiles.slice(0, 10);

    const freeTierGB = 5;
    const usageGB = totalSize / 1024 / 1024 / 1024;
    const usagePercent = ((usageGB / freeTierGB) * 100);

    return NextResponse.json({
      success: true,
      data: {
        bucket: BUCKET,
        region: process.env.AWS_S3_REGION || 'ap-southeast-1',
        bucketExists: true,
        fileCount,
        totalSize: {
          bytes: totalSize,
          kb: (totalSize / 1024).toFixed(2),
          mb: (totalSize / 1024 / 1024).toFixed(4),
          gb: usageGB.toFixed(6),
        },
        freeTier: {
          gb: freeTierGB,
          usagePercent: usagePercent.toFixed(6),
        },
        folders,
        recentFiles: last10Files,
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: message,
      data: {
        bucket: BUCKET,
        bucketExists: false,
        fileCount: 0,
      }
    }, { status: 500 });
  }
}
