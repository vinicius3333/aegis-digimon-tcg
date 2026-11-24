import type { PoolConfig } from "pg";

export function getSealedTestPoolConfig(connectionString: string | undefined): PoolConfig {
  const allowed = "postgres://postgres@127.0.0.1:55439/aegis_sealed_test";
  if (connectionString !== allowed || new URL(connectionString).pathname !== "/aegis_sealed_test") {
    throw new Error("Use isolated sealed Postgres 55439 with database aegis_sealed_test and no overrides");
  }
  return {
    host: "127.0.0.1",
    port: 55439,
    user: "postgres",
    database: "aegis_sealed_test",
    options: "-c search_path=pg_catalog",
    ssl: false,
    sslnegotiation: "postgres",
    connectionTimeoutMillis: 5000,
  };
}
