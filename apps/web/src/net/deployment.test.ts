import { describe, expect, it, vi } from "vitest";
import {
  deploymentEndpoint,
  DeploymentRefreshScheduledError,
  loadCurrentDeploymentManifest,
  loadDeploymentManifest,
  parseDeploymentManifest,
  synchronizeDeploymentRevision,
  usesSlotDeploymentRouter,
} from "./deployment";

describe("deployment manifest", () => {
  it("uses direct same-origin routing for direct production builds", () => {
    expect(usesSlotDeploymentRouter({ production: true, deploymentMode: "direct" })).toBe(false);
    expect(usesSlotDeploymentRouter({ production: true, deploymentMode: "slots" })).toBe(true);
    expect(usesSlotDeploymentRouter({ production: false, deploymentMode: undefined })).toBe(false);
  });

  it("parses an active slot and a distinct draining slot", () => {
    expect(parseDeploymentManifest({
      version: 1,
      active: { slot: "green", revision: "new-sha" },
      draining: [{ slot: "blue", revision: "old-sha" }],
    })).toEqual({
      version: 1,
      active: { slot: "green", revision: "new-sha" },
      draining: [{ slot: "blue", revision: "old-sha" }],
    });
  });

  it("rejects malformed, duplicated, and unknown slots", () => {
    for (const input of [
      undefined,
      { version: 2, active: { slot: "blue", revision: "x" }, draining: [] },
      { version: 1, active: { slot: "purple", revision: "x" }, draining: [] },
      { version: 1, active: { slot: "blue", revision: "x" }, draining: [{ slot: "blue", revision: "y" }] },
    ]) {
      expect(() => parseDeploymentManifest(input)).toThrow("Invalid deployment manifest");
    }
  });

  it("fetches the manifest without allowing a cached rollout decision", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      version: 1,
      active: { slot: "blue", revision: "sha" },
      draining: [],
    }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(loadDeploymentManifest(fetcher)).resolves.toMatchObject({ active: { slot: "blue" } });
    expect(fetcher).toHaveBeenCalledWith("/deployment/manifest.json", {
      cache: "no-store",
      signal: expect.any(AbortSignal),
      headers: { accept: "application/json" },
    });
  });

  it("aborts a new-room manifest load after scheduling a stale-bundle refresh", async () => {
    const replace = vi.fn();
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      version: 1,
      active: { slot: "green", revision: "new-sha" },
      draining: [],
    }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(loadCurrentDeploymentManifest({
      bundleRevision: "old-sha",
      fetcher,
      navigation: { href: "https://aegis-digi.online/lobby", replace },
    })).rejects.toBeInstanceOf(DeploymentRefreshScheduledError);
    expect(replace).toHaveBeenCalledOnce();
  });

  it("does not loop when the requested revision was already cache-busted", async () => {
    const replace = vi.fn();
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      version: 1,
      active: { slot: "green", revision: "new-sha" },
      draining: [],
    }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(synchronizeDeploymentRevision({
      bundleRevision: "old-sha",
      fetcher,
      navigation: { href: "https://aegis-digi.online/?aegis-revision=new-sha", replace },
    })).rejects.toThrow("does not match");
    expect(replace).not.toHaveBeenCalled();
  });

  it("builds same-origin HTTP and WebSocket endpoints for a slot", () => {
    const location = { protocol: "https:", host: "aegis-digi.online" };
    expect(deploymentEndpoint(location, "green")).toEqual({
      http: "https://aegis-digi.online/api/green",
      websocket: "wss://aegis-digi.online/api/green",
    });
  });

  it("replaces a stale bundle navigation with the active revision", async () => {
    const replace = vi.fn();
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      version: 1,
      active: { slot: "green", revision: "new-sha" },
      draining: [{ slot: "blue", revision: "old-sha" }],
    }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(synchronizeDeploymentRevision({
      bundleRevision: "old-sha",
      fetcher,
      navigation: { href: "https://aegis-digi.online/lobby", replace },
    })).resolves.toBe(false);

    expect(replace).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith(
      "https://aegis-digi.online/lobby?aegis-revision=new-sha",
    );
    expect(fetcher).toHaveBeenCalledWith("/deployment/manifest.json", {
      cache: "no-store",
      signal: expect.any(AbortSignal),
      headers: {
        accept: "application/json",
        "x-aegis-web-revision": "old-sha",
      },
    });
  });

  it("keeps rendering when the bundle already matches the active revision", async () => {
    const replace = vi.fn();
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      version: 1,
      active: { slot: "green", revision: "same-sha" },
      draining: [],
    }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(synchronizeDeploymentRevision({
      bundleRevision: "same-sha",
      fetcher,
      navigation: { href: "https://aegis-digi.online/", replace },
    })).resolves.toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });
});
