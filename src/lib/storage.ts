import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const globalForS3 = globalThis as unknown as {
  s3Client: S3Client | undefined;
};

function createS3Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

const s3Client = globalForS3.s3Client ?? createS3Client();

if (process.env.NODE_ENV !== "production") globalForS3.s3Client = s3Client;

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${filename}`;
}

export async function deleteFile(url: string): Promise<void> {
  const publicUrl = process.env.R2_PUBLIC_URL!;
  if (!url.startsWith(publicUrl)) return;

  const key = url.replace(`${publicUrl}/`, "");

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  );
}

// ============================================
// 非公開ファイル（出店申込パックの書類）
//
// 既定のバケットは R2_PUBLIC_URL で公開されているため、書類をそこに置くと
// URL を知っている人なら誰でも取得できてしまう。書類は別バケット
// (R2_PRIVATE_BUCKET_NAME) に置き、公開URLを一切発行せず、
// 認証済みAPIからのストリーミングでのみ配信する。
//
// 別バケットが未設定の環境では既定バケットの private/ 配下に、
// 推測不能なキーで保存する（公開URLは同様に発行しない）。
// ============================================

function privateBucket(): string {
  return process.env.R2_PRIVATE_BUCKET_NAME || process.env.R2_BUCKET_NAME!;
}

export function isPrivateBucketConfigured(): boolean {
  return !!process.env.R2_PRIVATE_BUCKET_NAME;
}

export async function uploadPrivateFile(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: privateBucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

export async function getPrivateFile(
  key: string
): Promise<{ body: Uint8Array; contentType?: string } | null> {
  try {
    const res = await s3Client.send(
      new GetObjectCommand({ Bucket: privateBucket(), Key: key })
    );
    if (!res.Body) return null;
    return {
      body: await res.Body.transformToByteArray(),
      contentType: res.ContentType,
    };
  } catch {
    return null;
  }
}

export async function deletePrivateFile(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({ Bucket: privateBucket(), Key: key })
  );
}
