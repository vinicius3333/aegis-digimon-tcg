import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-011.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-011 Megadramon", () => {
  it("deletes a 6000 DP or lower opposing Digimon by placing a Three Musketeers Option under itself on play/digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const)
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { dp: { op: "lte", value: 6000 } } },
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          position: "bottom",
          host: "self",
          target: { from: ["hand", "trash"] },
        },
      });
  });
  it("inherits Piercing", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Piercing"));

  it("places a Three Musketeers Option from hand and deletes an opposing Digimon at 6000 DP", async () => {
    const s = setupEngine(
      {
        0: { hand: ["EX7-071"], battleArea: [{ card: "EX7-011", as: "megadramon" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 6000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("megadramon"));
    await settle(
      () =>
        s.state.players[0]!.battleArea[0]!.stack.some((card) => card.cardId === "EX7-071") &&
        s.state.players[1]!.battleArea.length === 0,
    );
    expect(s.state.players[0]!.battleArea[0]!.stack.some((card) => card.cardId === "EX7-071")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("also resolves the same replacement on digivolving from an Option in trash", async () => {
    const s = setupEngine(
      {
        0: { trash: ["EX7-071"], battleArea: [{ card: "EX7-011", as: "megadramon" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 5000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("megadramon"));
    await settle(
      () =>
        s.state.players[0]!.battleArea[0]!.stack.some((card) => card.cardId === "EX7-071") &&
        s.state.players[1]!.battleArea.length === 0,
    );

    expect(s.state.players[0]!.battleArea[0]!.stack.some((card) => card.cardId === "EX7-071")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not pay the replacement cost or delete above the 6000 DP ceiling", async () => {
    const s = setupEngine(
      {
        0: { hand: ["EX7-071"], battleArea: [{ card: "EX7-011", as: "megadramon" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 7000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("megadramon"));
    await settle(() => false, 20);

    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX7-071");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("uses inherited Piercing to check security after deleting an opposing battle target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", dp: 7000, as: "attacker", under: ["EX7-011"] }] },
      1: { security: ["BT1-009"], battleArea: [{ card: "BT1-009", dp: 3000, suspended: true, as: "defender" }] },
    });
    await s.ready();
    const securityBefore = s.state.players[1]!.security.length;
    const defender = s.perm("defender");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === defender.permanentId));

    expect(s.state.players[1]!.security).toHaveLength(securityBefore - 1);
  });
});
