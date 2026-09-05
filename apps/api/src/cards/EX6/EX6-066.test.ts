import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-066.js";

describe("EX6-066 Sea of Destruction", () => {
  it("places an Aqua/Sea Animal Digimon from hand under a blue Digimon and returns all opponents at its level", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { count: "all" },
      cost: { kind: "place", destination: "digivolutionStack", position: "bottom", underFilter: { colors: ["Blue"] } },
    }));
  it("returns all opposing Digimon with the lowest level from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { count: "all", filter: { superlative: "lowestLevel" } },
    }));
  it("allows the place cost to resolve before comparing the placed card's level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-014", as: "host" }],
          hand: [
            { card: "EX6-066", as: "option" },
            { card: "BT1-033", as: "placed" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-033", as: "sameOne" },
            { card: "BT1-033", as: "sameTwo" },
            { card: "BT1-009", as: "different" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.instanceId)).toEqual([
      s.inst("different").instanceId,
    ]);
  });
  it("publicly returns every opposing Digimon at the lowest level from Security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "EX6-066", as: "option", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowOne" },
            { card: "BT1-009", as: "lowTwo" },
            { card: "BT1-053", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.instanceId)).toEqual([s.inst("high").instanceId]);
  });
});
