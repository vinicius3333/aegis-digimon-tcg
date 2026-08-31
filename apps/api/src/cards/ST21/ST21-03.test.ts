import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-03", () => {
  it("matches the catalog and executable security clause", () => {
    expect(getCardDefinition("ST21-03")?.effectText).toContain("At the end of the battle");
    const effect = runtimeCompiledCard("ST21-03")?.effects.find((x) => x.trigger === "Security");
    expect(effect?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } });
  });
  it("restricts only opponent Digimon without evolution cards after removing two sources", () => {
    const effect = runtimeCompiledCard("ST21-03")?.effects.find((x) => x.trigger === "OnPlay");
    expect(effect?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "TrashDigivolution", amount: 2, fromTop: true }),
        expect.objectContaining({ kind: "Restrict", restriction: "attackOrBlock", duration: "untilOpponentTurnEnd" }),
      ]),
    );
  });

  it("plays through the public intent, trashes exactly two sources, and leaves the target source-less", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST21-03", as: "ikkakumon" }] },
        1: { battleArea: [{ card: "BT1-021", as: "target", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ikkakumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010"]),
    );
  });
});
