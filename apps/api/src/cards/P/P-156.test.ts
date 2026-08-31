import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-156.js";

describe("P-156 Future Potential!", () => {
  it("binds a Tamer and plays only a low-cost Digimon sharing one of its colors", () => {
    const main = runtimeCompiledCard("P-156")!.effects.find((effect) => effect.trigger === "Main")!;

    expect(main.actions).toMatchObject([
      { kind: "SelectBind", bindAs: "chosenTamer", target: { filter: { kind: ["Tamer"] } } },
      {
        kind: "PlayWithoutCost",
        from: ["hand", "trash"],
        payCost: false,
        optional: true,
        target: {
          filter: {
            kind: ["Digimon"],
            playCostLte: 3,
            sameColorAsSelectionRef: "chosenTamer",
          },
        },
      },
    ]);
  });

  it("waives color with a Tamer and preserves the complete Security sequence", () => {
    const compiled = runtimeCompiledCard("P-156")!;
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave", filter: { kind: ["Tamer"] } },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Security")?.actions).toMatchObject([
      { kind: "PlayWithoutCost", from: ["hand"], optional: true },
      { kind: "AddToHandSelf" },
    ]);
  });

  it("plays a Tamer from hand without cost and returns itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "P-156", as: "option" }], hand: [{ card: "BT1-085", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
