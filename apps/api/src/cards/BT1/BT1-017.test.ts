import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-017.js";

describe("BT1-017 Birdramon", () => {
  it("grants Security Attack +1 to one of your Digimon for the turn", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-017", as: "birdramon" }], battleArea: [
      { card: "BT1-010", as: "target", dp: 2000 },
    ] } }, { autoSelectCards: true });
    const target = s.perm("target");
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("birdramon").instanceId })).toEqual({ ok: true });
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }).continuous;
    await settle(() => continuous.hasKeyword(target.permanentId, "SecurityAttack"));

    expect(continuous.hasKeyword(target.permanentId, "SecurityAttack")).toBe(true);
  });

  it("keeps the granted Security Attack after Birdramon leaves and the target digivolves", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT1-017", as: "birdramon" }, { card: "BT1-021", as: "evolving" }],
        battleArea: [{ card: "BT1-016", as: "target" }],
      },
    }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("birdramon").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 1);
    await advance(s.engine).verb.deletePermanent([s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT1-017")!.permanentId]);
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("target").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT1-021");
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(1);
  });
});
