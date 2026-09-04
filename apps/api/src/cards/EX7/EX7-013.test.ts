import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-013.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-013 MagnaKidmon", () => {
  it("pays its own Option source to grant Security Attack and attack at turn end", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-013", as: "magna", under: [{ card: "BT1-104", as: "cost" }] }] },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("magna"));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.perm("magna").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not attack or pay from another stack when its own stack lacks an Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-013", as: "magna" },
            { card: "BT1-009", as: "other", under: ["BT1-104"] },
          ],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("magna"));
    expect(s.perm("other").stack).toHaveLength(1);
    expect(s.perm("magna").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });
  it("uses a Three Musketeers Option from hand without cost and draws until six on play/digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const)
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([
        { kind: "UseOptionWithoutCost", from: ["hand"], payCost: false, optional: true },
        { kind: "Draw", amount: 1, untilHandSize: 6 },
      ]);
  });
  it("can gain Security Attack +1 by trashing an Option stack card then attacks once per turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SelectBind",
          target: { bindAs: "magnaAttackTarget", filter: { controller: "mine", kind: ["Digimon"] } },
          cost: {
            kind: "trash",
            target: { filter: { zone: "digivolutionCards", kind: ["Option"], hostFilter: { isSelfRef: true } } },
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: { fromSelectionRef: "magnaAttackTarget" },
          keyword: { keyword: "SecurityAttack", amount: 1 },
        },
        { kind: "Attack", target: { fromSelectionRef: "magnaAttackTarget" }, optional: false },
      ],
    }));

  it("draws to six after declining the optional Option use on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          battleArea: [{ card: "EX7-013", as: "magna" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magna"));
    await settle(() => s.state.players[0]!.hand.length === 6);
    expect(s.state.players[0]!.hand).toHaveLength(6);
  });

  it("uses a Three Musketeers Option for free before drawing to six", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["EX7-066", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
          battleArea: [{ card: "EX7-013", as: "magna" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magna"));
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.hand.length === 6);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("EX7-066");
  });
});
