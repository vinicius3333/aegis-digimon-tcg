import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-029.js";

describe("EX4-029 Antylamon", () => {
  it("provides Alliance as a printed keyword", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      actions: [],
      keywords: [{ keyword: "Alliance" }],
    });
  });
  it("places the top deck card into security at three or fewer security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")?.actions?.[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeFromDeck",
      toTop: true,
      condition: { kind: "youHave", count: 3, comparison: "lte" },
    });
  });

  it("recovers the deck top after a real attack at three security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-029", as: "antylamon" }],
        security: 3,
        deck: [{ card: "BT1-090", as: "recovery" }],
      },
      1: { security: ["BT1-090", "BT1-090"] },
    });
    const recoveryId = s.inst("recovery").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === recoveryId));

    expect(s.state.players[0]!.security).toHaveLength(4);
  });

  it("adds another Digimon's DP and Security Attack through a real Alliance attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-029", as: "attacker", dp: 12000 },
          { card: "BT1-064", as: "ally", dp: 3000 },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-021", as: "target", dp: 15000, suspended: true },
          { card: "ST18-07", as: "blocker", dp: 7000 },
        ],
      },
    });
    await s.ready();
    const baseDP = s.perm("attacker").currentDP;
    expect(s.perm("attacker").keywords).toContain("Alliance");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => {
      const activeCombat = (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean } }).combat;
      return s.perm("ally").isSuspended && activeCombat.hasOpenBlockWindow;
    });
    expect(s.perm("attacker").currentDP).toBe(baseDP + s.perm("ally").currentDP);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
  });

  it("digivolves from a level-4 two-color Digimon with green for the alternate cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-036", as: "mikemon" }],
        hand: [{ card: "EX4-029", as: "antylamon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mikemon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mikemon").topCard.cardId === "EX4-029");
    expect(s.perm("mikemon").topCard.cardId).toBe("EX4-029");
    expect(s.state.memory).toBe(0);
  });

  it("applies the inherited End of Attack DP loss only when another ally is suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-029", as: "host", under: ["EX4-029"] },
          { card: "BT1-064", as: "suspendedAlly", dp: 3000, suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT1-019", as: "target", dp: 6000 }] },
    });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("host"));
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("limits the inherited End of Attack reduction to once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "host", under: ["EX4-029"] },
            { card: "BT1-064", as: "suspendedAlly", suspended: true },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "first", dp: 6000 },
            { card: "BT1-019", as: "second", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("host"));
    await settle(() => s.perm("first").currentDP === 4000 || s.perm("second").currentDP === 4000);
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("host"));

    expect([s.perm("first").currentDP, s.perm("second").currentDP].sort()).toEqual([4000, 6000]);
  });
});
