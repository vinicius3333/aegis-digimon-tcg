import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-020.js";

describe("BT22-020 KausGammamon", () => {
  it("draws only after optionally placing a Gammamon-named Digimon from hand", () => {
    const whenAttacking = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(whenAttacking).toMatchObject({ frequency: "OncePerTurn" });
    expect(whenAttacking?.actions[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        target: {
          filter: {
            zone: "hand",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }],
          },
          count: 1,
          from: ["hand"],
        },
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
      },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
      }),
    );
  });

  it("places a chosen Gammamon, draws once, and does not fire the placed card per Q4874", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-020", as: "kaus" }],
          hand: [
            { card: "BT21-019", as: "placed" },
            { card: "BT8-086", as: "hiro" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("kaus"));
    expect(s.perm("kaus").stack.at(-1)?.instanceId).toBe(s.inst("placed").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("hiro").instanceId, s.inst("drawn").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT8-086")).toBe(false);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("kaus"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("hiro").instanceId, s.inst("drawn").instanceId]),
    );
  });

  it("grants inherited Jamming from a realistic evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-033", under: ["BT22-020"], as: "host" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
