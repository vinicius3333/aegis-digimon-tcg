import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ATTACK_ANNOUNCE_MS, INFO_PANEL_LIFETIME_MS, INFO_PANEL_MERGE_WINDOW_MS } from "./infoPanels";
import { SECURITY_CLASH_TIMINGS, SECURITY_CLASH_TOTAL_MS } from "./securityClash";
import { BATTLE_TIMING_STYLE, BATTLE_TIMING_VARIABLES, CLASH_TOTAL_MS, TIMINGS } from "./timings";

const gameCss = readFileSync(new URL("./game.css", import.meta.url), "utf8");

describe("battle timings", () => {
  it("exposes every duration to CSS in milliseconds", () => {
    for (const [name, ms] of Object.entries(BATTLE_TIMING_VARIABLES)) {
      expect(BATTLE_TIMING_STYLE[name as keyof typeof BATTLE_TIMING_STYLE]).toBe(`${ms}ms`);
    }
  });

  it("keeps every CSS fallback equal to the table", () => {
    // A portalled overlay renders outside the battle root, so the fallback is what
    // it actually animates with — it may never drift from the number above it.
    for (const [name, ms] of Object.entries(BATTLE_TIMING_VARIABLES)) {
      const uses = [...gameCss.matchAll(new RegExp(`var\\(${name},\\s*(\\d+)ms\\)`, "g"))];
      expect(uses.length, `${name} is unused in game.css`).toBeGreaterThan(0);
      for (const use of uses) expect(Number(use[1]), `${name} fallback`).toBe(ms);
    }
  });

  it("leaves no bare millisecond duration on the battle keyframes it owns", () => {
    const animations = [...gameCss.matchAll(/animation:\s*(battle-[\w-]+)\s+(\S+)/g)];
    const bare = animations.filter(([, , duration]) => /^\d/.test(duration ?? "")).map(([, name]) => name);
    expect(bare).toEqual([]);
  });

  it("derives the security clash timeline from the table", () => {
    expect(SECURITY_CLASH_TIMINGS.attackerEnterMs).toBe(TIMINGS.clashAttackerEnter);
    expect(SECURITY_CLASH_TOTAL_MS).toBe(CLASH_TOTAL_MS);
    expect(CLASH_TOTAL_MS).toBe(150 + 233 + 1600 + 350 + 200);
  });

  it("derives the info panel timings from the table", () => {
    expect(INFO_PANEL_LIFETIME_MS).toBe(TIMINGS.infoPanelLifetime);
    expect(INFO_PANEL_MERGE_WINDOW_MS).toBe(TIMINGS.infoPanelMergeWindow);
    expect(ATTACK_ANNOUNCE_MS).toBe(TIMINGS.attackAnnounce);
  });
});
