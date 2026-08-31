import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-08", () => {
  it("requires three total Adventure Tamer colors for free warp", () => {
    expect(getCardDefinition("ST21-08")?.effectText).toContain("3 or more total colors");
    const a = runtimeCompiledCard("ST21-08")?.effects.find((x) => x.trigger === "OnPlay")?.actions[0];
    expect(a).toMatchObject({
      kind: "Digivolve",
      payCost: false,
      optional: true,
      condition: { kind: "zoneColorCount", op: "gte", value: 3 },
    });
  });
  it("keeps the inherited permanent DP increase", () =>
    expect(runtimeCompiledCard("ST21-08")?.effects.find((x) => x.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    }));

  it("free-digivolves itself when ADVENTURE Tamers provide at least three colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST21-12", "ST21-13"],
          hand: [
            { card: "ST21-08", as: "togemon" },
            { card: "ST21-09", as: "lillymon" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const togemonId = s.inst("togemon").instanceId;
    await s.ready();
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("togemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "ST21-09"));

    const evolved = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "ST21-09");
    expect(evolved?.stack.some(({ instanceId }) => instanceId === togemonId)).toBe(true);
    // Both ready ADVENTURE Tamers reduce the initial play by 1; the follow-up evolution is free.
    expect(s.state.memory).toBe(2);
  });
});
