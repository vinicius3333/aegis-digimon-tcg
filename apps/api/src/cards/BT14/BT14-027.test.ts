import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-027.js";

describe("BT14-027", () => it("returns all opposing level 3 Digimon to hand on play and digivolution", () => {
  for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Return", to: "hand", target: { count: "all", filter: { levels: [3] } } });
}));

it("returns every opposing level 3 Digimon on play", async () => {
  const s = setupEngine({
    0: { hand: [{ card: "BT14-027", as: "marine" }] },
    1: { battleArea: [{ card: "BT14-020", as: "level3a" }, { card: "BT14-020", as: "level3b" }, { card: "BT14-022", as: "level4" }] },
  }, { autoSelectCards: true });
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.hand.filter((card) => card.cardId === "BT14-020").length === 2);
  expect(s.state.players[1]!.battleArea.some((p) => p.cardId === "BT14-022")).toBe(true);
  expect(s.state.players[1]!.battleArea.filter((p) => p.cardId === "BT14-020")).toHaveLength(0);
});
