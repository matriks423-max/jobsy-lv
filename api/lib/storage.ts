/**
 * Storage abstraction — uses Cloudflare R2 when env vars are set, local disk otherwise.
 * R2 is S3-compatible; we use @aws-sdk/client-s3.
 *
 * Required Railway env vars for R2:
 *   R2_ACCOUNT_ID      — Cloudflare account ID
 *   R2_ACCESS_KEY_ID   — R2 API token access key ID
 *   R2_SECRET_ACCESS_KEY — R2 API token secret
 *   R2_BUCKET          — bucket name
 *   R2_PUBLIC_URL      — public base URL (e.g. https://pub-xxx.r2.dev)
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "./env";

function getR2Client(): S3Client | null {
  if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey || !env.r2Bucket) {
    return null;
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  });
}

export function isR2Configured(): boolean {
  return !!(env.r2AccountId && env.r2AccessKeyId && env.r2SecretAccessKey && env.r2Bucket && env.r2PublicUrl);
}

/**
 * Upload a file buffer to R2. Returns the public URL.
 * Throws if R2 is not configured.
 */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const client = getR2Client();
  if (!client || !env.r2Bucket || !env.r2PublicUrl) {
    throw new Error("R2 not configured");
  }

  await client.send(
    new PutObjectCommand({
      Bucket: env.r2Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const publicUrl = env.r2PublicUrl.replace(/\/$/, "");
  return `${publicUrl}/${key}`;
}
