// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("pile counts preference", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("hides the counters by default", async () => {
    const { arePileCountsShown } = await import("./pileCounts");

    expect(arePileCountsShown()).toBe(false);
  });

  it("persists the player's choice across reloads", async () => {
    const { arePileCountsShown, setPileCountsShown } = await import("./pileCounts");
    setPileCountsShown(true);

    expect(arePileCountsShown()).toBe(true);
    expect(localStorage.getItem("aegis.pile-counts")).toBe("shown");

    vi.resetModules();
    const reloaded = await import("./pileCounts");
    expect(reloaded.arePileCountsShown()).toBe(true);

    reloaded.setPileCountsShown(false);
    expect(localStorage.getItem("aegis.pile-counts")).toBe("hidden");
  });
});
