import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-08", () => {
  it("requires three total Adventure Tamer colors for free warp", () => {
    expect(getCardDefinition("ST21-08")?.effectText).toContain("3 or more total colors");
    const a = runtimeCompiledCard("ST21-08")?.effects.find(x => x.trigger === "OnPlay")?.actions[0];
    expect(a).toMatchObject({ kind: "Digivolve", payCost: false, optional: true, condition: { kind: "zoneColorCount", op: "gte", value: 3 } });
  });
  it("keeps the inherited permanent DP increase", () => expect(runtimeCompiledCard("ST21-08")?.effects.find(x => x.isInherited)).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] }));

  it("free-digivolves into an Adventure Digimon when Tamers have three total colors", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST21-08", as: "togemon" }, "ST21-09"], battleArea: [{ card: "ST21-13", as: "mattTk" }, { card: "ST21-12", as: "joeMimi" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("togemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST21-09"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST21-09")).toBe(true);
  });

  it("does not free-digivolve when Adventure Tamers have fewer than three colors", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST21-08", as: "togemon" }, "ST21-09"], battleArea: [{ card: "ST21-13", as: "mattTk" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("togemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST21-08"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST21-08")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST21-09")).toBe(true);
  });
});
