import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-081.js";
describe("BT9-081 DexDorugoramon", () => {
  it("does not prompt for an ineligible DeathXmon below the five-name threshold", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-081", as: "dexDorugoramon" }],
        trash: [{ card: "BT9-112", as: "deathXmon" }],
      },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("dexDorugoramon").permanentId]);

    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("deathXmon").instanceId)).toBe(true);
  });

  it("plays DeathXmon once five Dex or DeathX names are in trash, including itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-081", as: "dexDorugoramon" }],
          trash: [
            { card: "BT9-112", as: "deathXmon" },
            "BT9-075",
            "BT9-078",
            "BT9-106",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("dexDorugoramon").permanentId]);

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("deathXmon").instanceId)).toBe(true);
  });

  it("deletes all opposing Digimon tied for the lowest level", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-065", as: "base" }], hand: [{ card: "BT9-081", as: "evolving" }] }, 1: { battleArea: ["BT1-010", "BT1-011", "BT2-047"] } }, { autoSelectCards: true });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]?.topCard?.cardId).toBe("BT2-047");
  });

  it("does not treat DexDorugoramon as the exact Dorugoramon source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-081", as: "dex", under: ["BT9-081"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dex"));

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("target").permanentId)).toBe(true);
  });
});
