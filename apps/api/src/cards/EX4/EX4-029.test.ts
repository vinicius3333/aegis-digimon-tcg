import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-029.js";

describe("EX4-029 Antylamon", () => {
  it("adds the suspended Digimon's DP and Security Attack plus one for the attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "AddDPFromSuspendedCost",
          dpSource: { kind: "suspendedTarget" },
          duration: "forThisAttack",
          alsoGainKeywords: [{ keyword: "SecurityAttack", amount: 1 }],
        },
      ],
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

  it("adds another suspended Digimon's DP and Security Attack on a real attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-029", as: "host", under: ["EX4-029"] },
          { card: "BT1-064", as: "suspendedAlly", dp: 3000 },
        ],
      },
    });
    await s.ready();
    const baseDP = s.perm("host").currentDP;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("host").currentDP).toBe(baseDP + 3000);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
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

  it("does not add DP when no other Digimon is suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-029", as: "host", under: ["EX4-029"] }] } });
    await s.ready();
    const baseDP = s.perm("host").currentDP;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("host").currentDP).toBe(baseDP);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
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
