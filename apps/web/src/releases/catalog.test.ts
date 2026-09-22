import { describe, expect, it } from "vitest";
import { allReleases, currentRelease, displayVersion, issueUrl, parseCatalog, releaseUrl } from "./catalog";

describe("release catalog", () => {
  it("exposes the first official beta as the current release", () => {
    expect(currentRelease().version).toBe("1.0.0-beta");
    expect(displayVersion(currentRelease().version)).toBe("v1.0.0-BETA");
    expect(allReleases()).toHaveLength(1);
  });

  it("builds public GitHub links", () => {
    expect(releaseUrl("1.0.0-beta")).toMatch(/releases\/tag\/v1\.0\.0-BETA$/);
    expect(issueUrl(4894)).toMatch(/issues\/4894$/);
  });

  it("rejects malformed bundled release data", () => {
    expect(() =>
      parseCatalog([
        {
          version: "wrong",
          releasedAt: "2026-09-21",
          summaryKey: "releases.invalid.summary",
          features: [],
          fixes: [],
        },
      ]),
    ).toThrow("Invalid release version");
  });

  it("rejects malformed items and release ordering", () => {
    const release = {
      version: "1.0.1-beta",
      releasedAt: "2026-09-21",
      summaryKey: "releases.test.summary",
      features: [],
      fixes: [{ textKey: "releases.test.fix", issue: 0 }],
    };
    expect(() => parseCatalog([release])).toThrow("Invalid release issue");
    expect(() =>
      parseCatalog([
        { ...release, fixes: [] },
        { ...release, version: "1.1.0-beta", fixes: [] },
      ]),
    ).toThrow("Releases must be newest first");
  });
});
