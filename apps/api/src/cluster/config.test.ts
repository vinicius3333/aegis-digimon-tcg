import { describe, expect, it } from "vitest";
import { readClusterConfig } from "./config.js";

describe("readClusterConfig", () => {
  it("stays single-process when no Redis is configured", () => {
    const config = readClusterConfig({});
    expect(config.redisUrl).toBeUndefined();
    expect(config.publicAddress).toBeUndefined();
  });

  it("namespaces matchmaking state per deployment slot", () => {
    expect(readClusterConfig({ AEGIS_DEPLOYMENT_SLOT: "green" }).keyPrefix).toBe("aegis:green:");
    expect(readClusterConfig({}).keyPrefix).toBe("aegis:legacy:");
  });

  it("builds a scheme-less public address from the host and this process's path", () => {
    const config = readClusterConfig({
      AEGIS_REDIS_URL: "redis://redis:6379",
      AEGIS_PROCESS_PATH: "p2",
      AEGIS_API_URL: "https://aegis-digi.online/",
    });
    expect(config.publicAddress).toBe("aegis-digi.online/p2");
  });

  it("refuses a clustered process that has no unique path to advertise", () => {
    expect(() => readClusterConfig({ AEGIS_REDIS_URL: "redis://redis:6379" })).toThrow(/AEGIS_PROCESS_PATH/);
  });

  it("refuses a process path with no host to attach it to", () => {
    expect(() => readClusterConfig({ AEGIS_PROCESS_PATH: "p1" })).toThrow(/AEGIS_PUBLIC_HOST/);
  });
});
