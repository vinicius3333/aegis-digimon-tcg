import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "pg";
import { getSealedTestPoolConfig } from "./getSealedTestPoolConfig.js";

const safe = "postgres://postgres@127.0.0.1:55439/aegis_sealed_test";

for (const connectionString of [
  undefined,
  "",
  `${safe}?host=example.invalid`,
  `${safe}?%68ost=example.invalid`,
  `${safe}?host=%2Fvar%2Frun%2Fpostgresql`,
  `${safe}?port=5432`,
  `${safe}?options=-csearch_path%3Dpublic`,
  `${safe}?%6fptions=-c%20search_path%3Dpublic`,
  `${safe}?search_path=public`,
  `${safe}?user=other&password=secret`,
  `${safe}?database=postgres`,
  `${safe}?sslmode=require`,
  `${safe}?host=127.0.0.1&host=example.invalid`,
  `${safe}?`,
  `${safe}#host=example.invalid`,
  `${safe}#`,
  `${safe}/extra`,
  `${safe}%2Fextra`,
  safe.replace("aegis_sealed_test", "%61egis_sealed_test"),
  safe.replace("aegis_sealed_test", "postgres"),
  safe.replace("aegis_sealed_test", ""),
  safe.replace("postgres@", "postgres:secret@"),
  safe.replace("postgres@", "other@"),
  safe.replace("127.0.0.1", "example.invalid"),
  safe.replace("127.0.0.1", "localhost"),
  safe.replace("55439", "5432"),
  safe.replace("postgres:", "postgresql:"),
  ` ${safe}`,
  `${safe}\n`,
]) {
  test(`rejects unsafe URL ${JSON.stringify(connectionString)} without connecting`, () => {
    assert.throws(() => getSealedTestPoolConfig(connectionString), /isolated sealed Postgres/);
  });
}

test("constructs an explicit isolated configuration without a connection string", () => {
  const config = getSealedTestPoolConfig(safe);
  assert.equal(config.connectionString, undefined);
  const effective = (new Client(config) as Client & { connectionParameters: typeof config }).connectionParameters;
  assert.equal(effective.host, "127.0.0.1");
  assert.equal(effective.port, 55439);
  assert.equal(effective.database, "aegis_sealed_test");
  assert.equal(effective.user, "postgres");
  assert.equal(effective.options, "-c search_path=pg_catalog");
  assert.equal(effective.ssl, false);
});
