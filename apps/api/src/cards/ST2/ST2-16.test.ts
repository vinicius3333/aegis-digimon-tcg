import { EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST2-16.js";

describe("ST2-16 Cocytus Breath", () => {
  it("matches the printed return-and-source-cleanup contract", () => {
    const definition = getCardDefinition("ST2-16")!;
    const compiled = getCompiledCard("ST2-16")!;

    expect(definition.kinds).toEqual(["Option"]);
    expect(definition.colors).toEqual(["Blue"]);
    expect(definition.playCost).toBe(7);
    expect(definition.effectText).toContain("Trash all of the digivolution cards");
    expect(definition.securityEffectText).toContain("Activate this card's [Main] effect");
    expect(compiled.effects).toEqual([
      {
        trigger: "Main",
        actions: [
          { kind: "Return", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, to: "hand" },
          { kind: "Trash", target: { filter: { controllerDefault: "mine", kind: ["Digimon"] }, count: "all" } },
        ],
      },
      { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("returns an opposing Digimon to hand and trashes all of its sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST2-03"], hand: [{ card: "ST2-16", as: "option" }] },
        1: {
          battleArea: [
            {
              card: "ST2-09",
              as: "target",
              under: [
                { card: "ST2-03", as: "source" },
                { card: "ST1-03", as: "secondSource" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "ST2-09"));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("secondSource").instanceId)).toBe(true);
  });

  it("activates the same return effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST2-16", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "ST2-09", under: ["ST2-03"] }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });
});
