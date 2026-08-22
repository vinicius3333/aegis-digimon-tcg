import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-026.js";

describe("BT14-026", () => {
  it("has Blast Digivolve", () => expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }));
  it("trashes two opposing sources and returns a source-less opponent Digimon on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "TrashDigivolution", amount: 2 }, { kind: "Return", to: "hand", target: { filter: { digivolutionCards: "none" } } }] });
  });

  it("trashes two sources and returns the now source-less opponent Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT14-026", as: "zudomon" }] },
      1: { battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-001", "BT1-002"] }] },
    }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zudomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-015"));
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-015")).toBe(true);
    expect(s.state.players[1]!.trash.filter((card) => ["BT1-001", "BT1-002"].includes(card.cardId))).toHaveLength(2);
  });
});
