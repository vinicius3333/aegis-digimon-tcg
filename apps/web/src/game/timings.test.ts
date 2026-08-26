import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ATTACK_ANNOUNCE_MS, SIDE_PANEL_LIFETIME_MS, SIDE_PANEL_MERGE_WINDOW_MS } from "./sidePanels";
import { NOTICE_CROWDED_LIFETIME_MS, NOTICE_LIFETIME_MS } from "./notices";
import { SECURITY_CLASH_TIMINGS, SECURITY_CLASH_TOTAL_MS } from "./securityClash";
import { BATTLE_TIMING_STYLE, BATTLE_TIMING_VARIABLES, CLASH_OUTCOME_AT_MS, CLASH_TOTAL_MS, TIMINGS } from "./timings";

const gameCss = readFileSync(new URL("./game.css", import.meta.url), "utf8");

/** The keyframe offsets of one `@keyframes` block, which CSS can only express as percentages. */
function keyframePercents(name: string): readonly number[] {
  const start = gameCss.indexOf(`@keyframes ${name} {`);
  expect(start, `${name} is missing from game.css`).toBeGreaterThan(-1);
  const block = gameCss.slice(start, gameCss.indexOf("\n}", start));
  return [...block.matchAll(/(\d+)%/g)].map((match) => Number(match[1]));
}

/** Where a moment lands inside an animation, as the percentage the keyframe has to carry. */
function percentOf(momentMs: number, totalMs: number): number {
  return Math.round((momentMs / totalMs) * 100);
}

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

  // The break phase is the one window in the check with nothing else on screen: the
  // shield has already shattered and no card has been revealed yet, so every millisecond
  // it runs past its own last moving frame reads as the attack arrow hanging.
  it("ends the shield break on its last moving frame", () => {
    expect(TIMINGS.shieldBreak + TIMINGS.securityBreakHold).toBe(
      Math.max(TIMINGS.shieldBreak, TIMINGS.securityHit, TIMINGS.shieldFlash),
    );
  });

  it("derives the security clash timeline from the table", () => {
    expect(SECURITY_CLASH_TIMINGS.attackerEnterMs).toBe(TIMINGS.clashAttackerEnter);
    expect(SECURITY_CLASH_TOTAL_MS).toBe(CLASH_TOTAL_MS);
    expect(CLASH_TOTAL_MS).toBe(150 + 233 + 900 + 350 + 160);
  });

  // A percentage cannot read a custom property, so these keyframes are the one place a
  // retimed table does not reach. Left stale, the blow lands early and the scene fades
  // over the outcome instead of after it.
  it("lands the clash impact on the beat the table gives it", () => {
    // The loser is shaken for the reference client's 0.25s and settles over the rest.
    expect(keyframePercents("battle-clash-hit")).toContain(percentOf(TIMINGS.cardShake, TIMINGS.clashOutcome));
  });

  it("holds the clash scene up from the entrance until the exit begins", () => {
    const percents = keyframePercents("battle-clash-scene");
    expect(percents).toContain(percentOf(TIMINGS.clashAttackerEnter, CLASH_TOTAL_MS));
    expect(percents).toContain(percentOf(CLASH_OUTCOME_AT_MS + TIMINGS.clashOutcome, CLASH_TOTAL_MS));
  });

  it("derives the side panel timings from the table", () => {
    expect(SIDE_PANEL_LIFETIME_MS).toBe(TIMINGS.sidePanelLifetime);
    expect(SIDE_PANEL_MERGE_WINDOW_MS).toBe(TIMINGS.sidePanelMergeWindow);
    expect(ATTACK_ANNOUNCE_MS).toBe(TIMINGS.attackAnnounce);
  });

  it("gives a crowded notice stack less time than a lone notice", () => {
    expect(NOTICE_LIFETIME_MS).toBe(TIMINGS.noticeLifetime);
    expect(NOTICE_CROWDED_LIFETIME_MS).toBeLessThan(NOTICE_LIFETIME_MS);
  });
});
