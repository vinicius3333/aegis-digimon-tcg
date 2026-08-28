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
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
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
