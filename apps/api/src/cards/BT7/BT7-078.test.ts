import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-078.js";

describe("BT7-078 AncientSphinxmon", () => {
  it("deletes your Hybrid to delete an opposing Digimon of no greater level", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-012", as: "base" },
            { card: "BT7-073", as: "cost" },
          ],
          hand: [{ card: "BT7-078", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT2-045", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const costPermanentId = s.perm("cost").permanentId;
    preferred.push(costPermanentId);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costPermanentId)).toBe(false);
  });
});

describe("BT7-078 AncientSphinxmon — KB Q&A rulings", () => {
  it("can delete itself with its [When Digivolving] effect to delete an opponent's level 6 or lower Digimon (Q1642)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "base" }],
          hand: [{ card: "BT7-078", as: "sphinxmon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "levelSix" },
            { card: "BT1-084", as: "levelSeven" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const sphinxmonInstanceId = s.inst("sphinxmon").instanceId;
    const levelSixInstanceId = s.perm("levelSix").topCard!.instanceId;
    const levelSevenPermanentId = s.perm("levelSeven").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sphinxmonInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === levelSixInstanceId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === sphinxmonInstanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === levelSixInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([levelSevenPermanentId]);
  });
});
