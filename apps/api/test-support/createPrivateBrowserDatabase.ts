import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { Pool, type PoolClient } from "pg";
import { getSealedTestPoolConfig } from "./getSealedTestPoolConfig.js";

function withDescriptor(fd: number, body: () => void) {
  const errors: unknown[] = [];
  try {
    body();
  } catch (error) {
    errors.push(error);
  }
  try {
    closeSync(fd);
  } catch (error) {
    errors.push(error);
  }
  if (errors.length > 1)
    throw new AggregateError(errors, "Private receipt operation and close failed", {
      cause: errors[0],
    });
  if (errors.length === 1) throw errors[0];
}

export async function createPrivateBrowserDatabase(connectionString: string | undefined) {
  if (process.env.AEGIS_DISPOSABLE_SCHEMA_CATALOG_LOCK !== "true")
    throw new Error("Explicit disposable catalog-lock authorization required");
  const config = getSealedTestPoolConfig(connectionString);
  const schema = `private_browser_${randomUUID().replaceAll("-", "")}`;
  const token = randomUUID();
  const taskNonce = process.env.AEGIS_SOCIAL_SCHEMA_TASK_NONCE ?? randomUUID();
  const source = process.env.AEGIS_SOCIAL_SCHEMA_SOURCE_SHA;
  const out = process.env.AEGIS_SOCIAL_SCHEMA_RECEIPT_OUT;
  const ci = process.env.CI ?? "";
  if (!["", "true", "1", "false", "0"].includes(ci)) throw new Error("Invalid CI boolean");
  if ((ci === "true" || ci === "1") && !out) throw new Error("CI requires AEGIS_SOCIAL_SCHEMA_RECEIPT_OUT");
  if (out) {
    if (!isAbsolute(out) || resolve(out) !== out || realpathSync(out) !== out)
      throw new Error("Schema receipt OUT must be an absolute non-symlink directory");
    for (let path = out; ; path = dirname(path)) {
      if (lstatSync(path).isSymbolicLink()) throw new Error("Schema receipt path contains a symlink");
      if (dirname(path) === path) break;
    }
    const stat = lstatSync(out);
    if (!stat.isDirectory() || stat.uid !== process.getuid?.() || (stat.mode & 0o777) !== 0o700)
      throw new Error("Schema receipt OUT must be owned and private");
    if (!source || !/^[a-f0-9]{40}$/.test(source) || !process.env.AEGIS_SOCIAL_SCHEMA_TASK_NONCE)
      throw new Error("Schema receipts require source SHA and task nonce");
  }
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(taskNonce))
    throw new Error("Invalid schema task nonce");
  const processStat = out ? readFileSync("/proc/self/stat", "utf8") : undefined;
  const startTicks = processStat?.slice(processStat.lastIndexOf(")") + 2).split(" ")[19] ?? null;
  const helperSha256 = createHash("sha256")
    .update(readFileSync(new URL(import.meta.url)))
    .digest("hex");
  const admin = new Pool(config);
  let allocation: PoolClient | undefined;
  let pool: Pool | undefined;
  let marker: string | undefined;
  let schemaOid: number | undefined;
  let schemaOwner: number | undefined;
  let closing: Promise<void> | undefined;
  function close() {
    closing ??= (async () => {
      const errors: unknown[] = [];
      if (pool) {
        try {
          await pool.end();
        } catch (error) {
          errors.push(error);
        }
      }
      if (marker && schemaOid !== undefined) {
        try {
          const cleanup = await admin.connect();
          const cleanupErrors: unknown[] = [];
          try {
            if (process.env.AEGIS_DISPOSABLE_SCHEMA_CATALOG_LOCK !== "true")
              throw new Error("Explicit disposable catalog-lock authorization required");
            const authorization = (
              await cleanup.query(
                "SELECT current_database() AS name, current_user AS account, (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser",
              )
            ).rows[0];
            if (
              authorization.name !== "aegis_sealed_test" ||
              authorization.account !== "postgres" ||
              authorization.superuser !== true
            )
              throw new Error("Authorized disposable superuser required");
            await cleanup.query("BEGIN");
            await cleanup.query("SET LOCAL lock_timeout = '2s'");
            await cleanup.query("LOCK TABLE pg_catalog.pg_namespace IN SHARE ROW EXCLUSIVE MODE");
            const result = await cleanup.query(
              "SELECT oid, nspowner, obj_description(oid, 'pg_namespace') AS marker FROM pg_namespace WHERE nspname=$1",
              [schema],
            );
            const row = result.rows[0];
            if (row) {
              if (row.oid !== schemaOid || row.marker !== marker || row.nspowner !== schemaOwner)
                throw new Error("Schema ownership mismatch");
              await cleanup.query(`DROP SCHEMA ${schema} CASCADE`);
            }
            await cleanup.query("COMMIT");
          } catch (error) {
            cleanupErrors.push(error);
            try {
              await cleanup.query("ROLLBACK");
            } catch (rollbackError) {
              cleanupErrors.push(rollbackError);
            }
          }
          try {
            cleanup.release();
          } catch (releaseError) {
            cleanupErrors.push(releaseError);
          }
          if (cleanupErrors.length > 1)
            throw new AggregateError(cleanupErrors, "Private cleanup transaction failed", { cause: cleanupErrors[0] });
          if (cleanupErrors.length === 1) throw cleanupErrors[0];
        } catch (error) {
          errors.push(error);
        }
      }
      try {
        await admin.end();
      } catch (error) {
        errors.push(error);
      }
      if (errors.length === 1) throw errors[0];
      if (errors.length > 1) throw new AggregateError(errors, "Private database cleanup failed");
    })();
    return closing;
  }
  try {
    allocation = await admin.connect();
    const authorization = (
      await allocation.query(
        "SELECT current_database() AS name, current_user AS account, (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser",
      )
    ).rows[0];
    if (
      authorization.name !== "aegis_sealed_test" ||
      authorization.account !== "postgres" ||
      authorization.superuser !== true
    )
      throw new Error("Authorized disposable superuser required");
    const database = (
      await allocation.query(
        "SELECT current_database() AS name, (SELECT oid FROM pg_database WHERE datname=current_database()) AS oid, inet_server_addr()::text AS host, inet_server_port() AS port, pg_postmaster_start_time()::text AS started, current_user AS account",
      )
    ).rows[0];
    const intent = {
      version: 1,
      schema,
      token,
      taskNonce,
      source: source ?? null,
      helperSha256,
      database,
      pid: process.pid,
      startTicks,
      backendPid: (await allocation.query("SELECT pg_backend_pid() AS pid")).rows[0].pid,
    };
    if (out) {
      const fd = openSync(
        `${out}/${token}.intent.json`,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
        0o600,
      );
      withDescriptor(fd, () => {
        writeFileSync(fd, JSON.stringify(intent));
        fsyncSync(fd);
      });
      const directory = openSync(out, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      withDescriptor(directory, () => {
        fsyncSync(directory);
      });
    }
    await allocation.query("BEGIN");
    await allocation.query(`CREATE SCHEMA ${schema}`);
    const ownership = (await allocation.query("SELECT oid, nspowner FROM pg_namespace WHERE nspname=$1", [schema]))
      .rows[0];
    schemaOid = ownership.oid;
    schemaOwner = ownership.nspowner;
    marker = JSON.stringify({ ...intent, schemaOid, schemaOwner: ownership.nspowner });
    await allocation.query(`COMMENT ON SCHEMA ${schema} IS '${marker.replaceAll("'", "''")}'`);
    await allocation.query("COMMIT");
    allocation.release();
    allocation = undefined;
    pool = new Pool({ ...config, options: `-c search_path=${schema}` });
    return { pool, close };
  } catch (error) {
    const errors: unknown[] = [error];
    if (allocation) {
      try {
        await allocation.query("ROLLBACK");
      } catch (rollbackError) {
        errors.push(rollbackError);
      }
      try {
        allocation.release(true);
      } catch (releaseError) {
        errors.push(releaseError);
      }
    }
    try {
      await close();
    } catch (cleanupError) {
      errors.push(cleanupError);
    }
    if (errors.length > 1)
      throw new AggregateError(errors, "Private database startup and cleanup failed", {
        cause: error,
      });
    throw error;
  }
}
