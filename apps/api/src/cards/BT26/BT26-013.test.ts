import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-013.js";
import "../index.js";

describe("BT26-013 Musyamon", () => {
  it("compiles Blocker, both trash-to-delete triggers, and inherited DP", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => [e.trigger, e.isInherited])).toEqual([
      ["Static", undefined], ["OnPlay", undefined], ["OnDeletion", undefined], ["YourTurn", true],
    ]);
  });

  it("uses the exact Shambala/TS evolution requirement", () => {
    expect(digivolutionRequirementsFor("BT26-013")).toContainEqual({ level: 3, traits: ["Shambala", "TS"], cost: 2, isAlternate: true });
  });

  it("trashes one hand card and deletes an opponent Digimon at 6000 DP or less", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT26-013", as: "self" }, { card: "BT1-009", as: "cost" }] },
      1: { battleArea: [{ card: "BT26-012", as: "target", dp: 6000 }, { card: "BT26-014", as: "safe", dp: 7000 }] },
    }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT26-014");
  });

  it("applies inherited +2000 DP only on the owner's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-014", as: "host", under: [{ card: "BT26-013", as: "source" }] }] } });
    await advance(s.engine).fire(EffectTiming.OnAllyAttack, s.perm("host"), { attackerPermanentId: s.perm("host").permanentId });
    expect(s.perm("host").currentDP).toBe(13000);
  });
});
