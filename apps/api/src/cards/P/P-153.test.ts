import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-153.js";

describe("P-153 MagnaGarurumon", () => {
  it("encodes Armor Purge and a singular level 3/4/5 return", () => {
    const compiled = runtimeCompiledCard("P-153")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }] }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [
            { kind: "Return", to: "hand", target: { filter: { controller: "opponent", levels: [3, 4, 5] }, count: 1 } },
          ],
        }),
      ]),
    );
  });

  it("encodes End of Attack top-security payment and the Digimon/Tamer unsuspend choice", () => {
    const end = runtimeCompiledCard("P-153")!.effects.find((effect) => effect.trigger === "EndOfAttack")!;
    expect(end.actions[0]).toMatchObject({
      kind: "Modal",
      choose: 1,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        destination: "security",
        position: "top",
        target: { from: ["digivolutionCards"], count: 1 },
      },
      options: [
        [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, isSelf: true } }],
        [{ kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Tamer"] } } }],
      ],
    });
    expect(runtimeCompiledCard("P-153")!.digivolutionRequirement).toEqual([
      { names: ["MagnaGarurumon"], minColors: 3, cost: 2, isAlternate: true },
    ]);
  });

  it("places its top digivolution card on security and unsuspends itself at End of Attack", async () => {
    const s = setupEngine(
      {
        0: { security: 1, battleArea: [{ card: "P-153", as: "magna", suspended: true, under: ["BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("magna"));
    await settle();
    expect(s.perm("magna").isSuspended).toBe(false);
    expect(s.perm("magna").stack).toHaveLength(0);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
