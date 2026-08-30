import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT8-051.js";
import "./BT8-051.js";

describe("BT8-051 Digmon", () => {
  it("uses only the catalog's green level-3 evolution requirement", () => {
    expect(compiled).not.toHaveProperty("digivolutionRequirement");
  });

  it("gives an opposing suspended Digimon -3000 DP when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-051", as: "digmon" }] },
        1: { security: ["BT8-034"], battleArea: [{ card: "BT8-017", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    const before = s.perm("target").currentDP;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("digmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP < before);
    expect(s.perm("target").currentDP).toBe(before - 3000);
  });

  it("uses its cost-2 Armor path from Armadillomon and Armor Purges after losing a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-033", as: "armadillomon" }], hand: [{ card: "BT8-051", as: "digmon" }] },
        1: { battleArea: [{ card: "BT2-047", as: "defender", dp: 15000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const armadillomonId = s.perm("armadillomon").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("armadillomon").permanentId,
        instanceId: s.inst("digmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("armadillomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("armadillomon").topCard.instanceId === armadillomonId);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("digmon").instanceId)).toBe(true);
  });
});
