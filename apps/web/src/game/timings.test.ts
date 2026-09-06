import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ATTACK_ANNOUNCE_MS, SIDE_PANEL_LIFETIME_MS, SIDE_PANEL_MERGE_WINDOW_MS } from "./sidePanels";
import { NOTICE_CROWDED_LIFETIME_MS, NOTICE_LIFETIME_MS } from "./notices";
import {
  SECURITY_CHECK_NARRATION_MS,
  SECURITY_DESTRUCTION_NARRATION_MS,
  SECURITY_EFFECT_NARRATION_MS,
} from "@aegis/shared";
import { SECURITY_CLASH_TIMINGS, SECURITY_CLASH_TOTAL_MS } from "./securityClash";
import { CARD_SHARD_SPREAD_MS } from "./cardShatter";
import {
  BATTLE_TIMING_STYLE,
  BATTLE_TIMING_VARIABLES,
  CLASH_DOCK_AT_MS,
  CLASH_DOCK_LEAVE_MS,
  CLASH_OUTCOME_AT_MS,
  CLASH_SHATTER_MS,
  CLASH_TOTAL_MS,
  CLASH_REVEAL_SHOWN_AT_MS,
  SECURITY_BRANCH_IN_MS,
  SECURITY_BRANCH_TOTAL_MS,
  SECURITY_BREAK_TOTAL_MS,
  SECURITY_DOCK_CLOSE_MS,
  SECURITY_DESTROY_TOTAL_MS,
  TIMINGS,
} from "./timings";

const gameCss = readFileSync(new URL("./game.css", import.meta.url), "utf8");

/** The keyframe offsets of one `@keyframes` block, which CSS can only express as percentages. */
function keyframePercents(name: string): readonly number[] {
  const start = gameCss.indexOf(`@keyframes ${name} {`);
  expect(start, `${name} is missing from game.css`).toBeGreaterThan(-1);
  const block = gameCss.slice(start, gameCss.indexOf("\n}", start));
  return [...block.matchAll(/(\d+)%/g)].map((match) => Number(match[1]));
}

/** The declaration block of one CSS rule, so a delay expression can be read back. */
function clashRule(selector: string): string {
  const start = gameCss.indexOf(`${selector} {`);
  expect(start, `${selector} is missing from game.css`).toBeGreaterThan(-1);
  return gameCss.slice(start, gameCss.indexOf("\n}", start));
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

  // Cut off mid-flight, the shards read as the card blinking out rather than breaking.
  it("finishes the clash shatter inside the outcome beat that shows it", () => {
    expect(CLASH_SHATTER_MS + CARD_SHARD_SPREAD_MS).toBeLessThanOrEqual(TIMINGS.clashOutcome);
    expect(CLASH_SHATTER_MS).toBeGreaterThan(0);
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

  // The scene fades in and out as two animations rather than one long keyframe, because a
  // check the server has not closed yet holds on stage for as long as it takes: the exit
  // is delayed off the outcome, which a scene settled late zeroes for itself.
  it("starts the clash exit where the outcome beat ends", () => {
    const rule = clashRule('.battle-clash:not([data-resolution="pending"])');
    expect(rule).toContain(`battle-clash-in var(--t-clash-enter, ${TIMINGS.clashAttackerEnter}ms)`);
    expect(rule).toContain(`battle-clash-out var(--t-clash-exit, ${TIMINGS.clashExit}ms)`);
    expect(rule).toContain(
      `calc(var(--t-clash-outcome-at, ${CLASH_OUTCOME_AT_MS}ms) + var(--t-clash-outcome, ${TIMINGS.clashOutcome}ms))`,
    );
  });

  // The server paces an automated seat behind this budget, so a check that outgrew it
  // would let the bot play its next card over a clash still on screen.
  it("keeps the security check inside the narration budget the server paces bots behind", () => {
    expect(SECURITY_BREAK_TOTAL_MS + CLASH_TOTAL_MS).toBeLessThanOrEqual(SECURITY_CHECK_NARRATION_MS);
    expect(SECURITY_BREAK_TOTAL_MS + CLASH_TOTAL_MS + SECURITY_BRANCH_TOTAL_MS).toBeLessThanOrEqual(
      SECURITY_EFFECT_NARRATION_MS,
    );
  });

  // A check the server resolves over several batches docks its card and holds it for as
  // long as that takes, so the budget the bot waits out is the fixed part — the break, the
  // reveal and the slide to the dock — plus what is still owed AFTER `securityChecked`.
  // A card bound for the dock is held centre stage exactly as long as any other reveal, and
  // then fades before the dock slides in, so the two are never on screen at once.
  it("holds a docking reveal for the common hold and fades it before the dock", () => {
    expect(CLASH_DOCK_AT_MS).toBe(CLASH_OUTCOME_AT_MS);
    expect(CLASH_DOCK_LEAVE_MS).toBe(CLASH_DOCK_AT_MS + TIMINGS.clashExit);
    expect(clashRule('.battle-clash[data-departing="true"]')).toContain(
      `battle-clash-out var(--t-clash-exit, ${TIMINGS.clashExit}ms) linear both`,
    );
  });

  it("keeps the docked check's fixed and post-close beats inside the same budget", () => {
    expect(
      SECURITY_BREAK_TOTAL_MS + CLASH_DOCK_LEAVE_MS + SECURITY_BRANCH_IN_MS + SECURITY_DOCK_CLOSE_MS,
    ).toBeLessThanOrEqual(SECURITY_EFFECT_NARRATION_MS);
    expect(SECURITY_DOCK_CLOSE_MS).toBe(TIMINGS.securityDockHold + TIMINGS.securityBranchOut);
  });

  // A destruction plays the whole sequence once per card, so the budget the server holds a
  // bot behind is per card too: it multiplies this by however many the stack lost.
  it("cracks a destroyed security card inside its hold, before the break", () => {
    expect(TIMINGS.securityDestroyCrack).toBeLessThanOrEqual(TIMINGS.securityDestroyHold);
    expect(clashRule(".game-card-cracks path")).toContain(
      "var(--t-clash-outcome-at, 1283ms) - var(--t-clash-crack, 180ms)",
    );
  });

  it("keeps one destroyed security card inside the per-card narration budget", () => {
    expect(SECURITY_BREAK_TOTAL_MS + SECURITY_DESTROY_TOTAL_MS).toBeLessThanOrEqual(SECURITY_DESTRUCTION_NARRATION_MS);
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
