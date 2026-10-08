import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { MAX_SAVED_REPLAY_BYTES } from "@aegis/shared";

export interface ReplayStorage {
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

/** Only the API has S3 credentials. Objects are never public or uploaded by the browser. */
export class S3ReplayStorage implements ReplayStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  static fromEnvironment(env: NodeJS.ProcessEnv = process.env): S3ReplayStorage | undefined {
    const names = [
      "AEGIS_REPLAY_S3_ENDPOINT",
      "AEGIS_REPLAY_S3_BUCKET",
      "AEGIS_REPLAY_S3_ACCESS_KEY",
      "AEGIS_REPLAY_S3_SECRET_KEY",
    ] as const;
    if (names.every((name) => !env[name])) return undefined;
    if (names.some((name) => !env[name])) throw new Error("Incomplete replay S3 configuration");
    const endpoint = new URL(env.AEGIS_REPLAY_S3_ENDPOINT!);
    if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password)
      throw new Error("Invalid replay S3 endpoint");
    return new S3ReplayStorage(
      new S3Client({
        endpoint: endpoint.toString(),
        region: env.AEGIS_REPLAY_S3_REGION || "garage",
        forcePathStyle: true,
        credentials: { accessKeyId: env.AEGIS_REPLAY_S3_ACCESS_KEY!, secretAccessKey: env.AEGIS_REPLAY_S3_SECRET_KEY! },
        maxAttempts: 2,
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
        requestHandler: { connectionTimeout: 3000, requestTimeout: 10000 },
      }),
      env.AEGIS_REPLAY_S3_BUCKET!,
    );
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    if (!bytes.length || bytes.length > MAX_SAVED_REPLAY_BYTES) throw new Error("Replay storage size limit");
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: "application/gzip" }),
      { abortSignal: AbortSignal.timeout(15000) },
    );
  }

  async get(key: string): Promise<Buffer> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      abortSignal: AbortSignal.timeout(15000),
    });
    const body = result.Body;
    if (!body || (result.ContentLength ?? 0) > MAX_SAVED_REPLAY_BYTES) {
      if (body && "destroy" in body && typeof body.destroy === "function") body.destroy();
      throw new Error("Invalid stored replay size");
    }
    const chunks: Buffer[] = [];
    let size = 0;
    // Node SDK responses stream; bound reads even when Content-Length is absent or incorrect.
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      if (size > MAX_SAVED_REPLAY_BYTES) throw new Error("Stored replay exceeds size limit");
      chunks.push(bytes);
    }
    return Buffer.concat(chunks, size);
  }

  async remove(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }), {
      abortSignal: AbortSignal.timeout(15000),
    });
  }
}
