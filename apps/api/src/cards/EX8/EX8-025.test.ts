import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-025.js";

describe("EX8-025", () => {
  it("places a DS Digimon from trash underneath itself on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "PlaceUnder", optional: true, target: { count: 1 } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlaceUnder" });
  });
  it("plays a level 5 or lower DS Digimon from its digivolution cards at end of attack and inherits fixed attack targeting", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true }] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "attackTargetChange", duration: "permanent" });
  });
  it("places a DS card from trash under Whamon on live On Play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX8-025", as: "whamon" }], trash: [{ card: "EX8-027", as: "ds" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("whamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX8-025" && p.stack.length === 1));
    const whamon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "EX8-025");
    expect(whamon?.stack).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-027")).toBe(false);
  });
});
