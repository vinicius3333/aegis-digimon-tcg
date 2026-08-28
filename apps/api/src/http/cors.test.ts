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
