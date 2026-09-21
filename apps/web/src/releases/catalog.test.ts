import { describe, expect, it } from "vitest";
import { allReleases, currentRelease, displayVersion, issueUrl, releaseUrl } from "./catalog";

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
});
