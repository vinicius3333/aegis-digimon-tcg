import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/BT23/BT23-020.js";
import "../../cards/BT12/BT12-034.js";
import "../../cards/BT12/BT12-092.js";
import "../../cards/AD1/AD1-021.js";

function fixture(card: string, acceptTransformation: boolean) {
  return setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT23-020", as: "attacker" },
          { card, as: "marcus" },
          { card: "BT12-034", as: "agumon" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
    },
    {
      autoSelectCards: true,
      ...(acceptTransformation ? { autoAcceptOptional: true } : { autoDeclineOptional: true }),
    },
  );
}

async function attack(s: ReturnType<typeof fixture>) {
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
  return s.events.find((event) => event.kind === "alliancePrompt")!;
}

describe("Alliance with Marcus treated as a Digimon", () => {
  for (const [card, timing, dp] of [
    ["BT12-092", EffectTiming.OnStartMainPhase, 3000],
    ["AD1-021", EffectTiming.OnEndTurn, 6000],
  ] as const) {
    it(`accepts ${card} transformed by its printed effect and applies its DP and extra check`, async () => {
      const s = fixture(card, card === "BT12-092");
      await s.ready();
      s.state.memory = 5;
      await advance(s.engine).fire(timing, s.perm("marcus"));
      expect(s.perm("marcus").currentDP).toBe(dp);
      expect(s.perm("marcus").isSuspended).toBe(false);
      const prompt = await attack(s);
      expect(prompt.eligibleAllyIds).toContain(s.perm("marcus").permanentId);

      expect(
        s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("marcus").permanentId }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      expect(s.perm("marcus").isSuspended).toBe(true);
      expect(s.perm("agumon").isSuspended).toBe(false);
      const checks = s.events.filter((event) => event.kind === "securityChecked");
      expect(checks).toHaveLength(2);
      expect(checks.map((event) => event.battle?.attackerDP)).toEqual([5000 + dp, 5000 + dp]);
      expect(s.state.players[1]!.security).toHaveLength(1);
      expect(s.perm("attacker").currentDP).toBe(5000);
      expect(s.perm("attacker").securityAttack).toBe(1);
      assertNoLoudGap(s);
    });
  }

  it("excludes an untransformed Tamer and accepts an ordinary Digimon", async () => {
    const s = fixture("BT12-092", false);
    await s.ready();
    const prompt = await attack(s);
    expect(prompt.eligibleAllyIds).not.toContain(s.perm("marcus").permanentId);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("marcus").permanentId })).toEqual(
      { ok: false, reason: "illegal-target" },
    );
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("agumon").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("marcus").isSuspended).toBe(false);
    expect(s.perm("agumon").isSuspended).toBe(true);
  });

  it("rejects an offered Marcus that becomes suspended before the answer and still allows passing", async () => {
    const s = fixture("BT12-092", true);
    await s.ready();
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("marcus"));
    const prompt = await attack(s);
    expect(prompt.eligibleAllyIds).toContain(s.perm("marcus").permanentId);
    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("marcus").permanentId })).toEqual(
      { ok: false, reason: "illegal-target" },
    );
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
