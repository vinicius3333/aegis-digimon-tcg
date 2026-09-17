import { describe, expect, it } from "vitest";
import { corsOriginForRequest } from "./cors.js";

const configuredOrigin = "http://localhost:5173";

describe("corsOriginForRequest", () => {
  it("reflects the configured web origin", () => {
    expect(corsOriginForRequest({ requestOrigin: configuredOrigin, configuredOrigin, production: true })).toBe(
      configuredOrigin,
    );
  });

  it("accepts localhost aliases during local browser development", () => {
    expect(
      corsOriginForRequest({
        requestOrigin: "http://127.0.0.1:5173",
        configuredOrigin,
        production: false,
      }),
    ).toBe("http://127.0.0.1:5173");
  });

  it("does not widen the production allowlist to another loopback spelling", () => {
    expect(
      corsOriginForRequest({
        requestOrigin: "http://127.0.0.1:5173",
        configuredOrigin,
        production: true,
      }),
    ).toBeUndefined();
  });

  it("never reflects an unrelated external origin", () => {
    expect(
      corsOriginForRequest({
        requestOrigin: "https://attacker.example",
        configuredOrigin,
        production: false,
      }),
    ).toBeUndefined();
  });
});

/* A phone on the same Wi-Fi is the second browser this dev server is read in, and it
   arrives by the machine's LAN address rather than by loopback. */
describe("corsOriginForRequest on a development LAN", () => {
  const lanOrigins = [
    "http://192.168.0.10:5173",
    "http://10.0.0.4:5173",
    "http://172.20.1.8:5173",
    "http://169.254.5.6:5173",
    "http://macbook.local:5173",
    "http://[fe80::1]:5173",
  ];

  it("reflects a private address off production", () => {
    for (const requestOrigin of lanOrigins)
      expect(corsOriginForRequest({ requestOrigin, configuredOrigin, production: false })).toBe(requestOrigin);
  });

  it("refuses every one of them in production", () => {
    for (const requestOrigin of lanOrigins)
      expect(corsOriginForRequest({ requestOrigin, configuredOrigin, production: true })).toBeUndefined();
  });

  // 172.32 is outside the private block, and a routable address is never a dev machine.
  it("refuses a public address that only looks private", () => {
    for (const requestOrigin of ["http://172.32.0.1:5173", "http://8.8.8.8:5173", "http://999.1.1.1:5173"])
      expect(corsOriginForRequest({ requestOrigin, configuredOrigin, production: false })).toBeUndefined();
  });
});
