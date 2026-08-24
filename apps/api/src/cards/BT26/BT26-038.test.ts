import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { compiled } from "./BT26-038.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
describe("BT26-038 Kuwagamon", () => {
  it("compiles the three suspend-and-buff windows", () => {
    expect(digivolutionRequirementsFor("BT26-038")).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.slice(0, 3).map((e) => e.trigger)).toEqual(["OnPlay", "WhenDigivolving", "WhenMoving"]);
    expect(compiled.effects[0]?.actions).toMatchObject([
      { kind: "Suspend", optional: true },
      { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" },
    ]);
    expect(compiled.effects[3]?.actions).toMatchObject([
      { kind: "SubTrigger", event: "whenBattleWon", sourceFilter: { isSelfRef: true } },
    ]);
  });
  it("gives an eligible Insectoid its temporary DP increase on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT26-038", as: "kuwagamon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDP = s.perm("kuwagamon").currentDP;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("kuwagamon"));

    expect(s.perm("kuwagamon").currentDP).toBe(baseDP + 3000);
  });

  it("digivolves the battle winner with the inherited one-memory reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-008", as: "winner", under: ["BT26-038"] },
            { card: "BT1-066", as: "evolutionTarget" },
          ],
          hand: [{ card: "BT26-038", as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenBattleWon", {
      attackerPermanentId: s.perm("winner").permanentId,
    });

    expect(s.perm("evolutionTarget").topCard.instanceId).toBe(s.inst("candidate").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("does not trigger the inherited evolution when a different Digimon wins", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-008", as: "host", under: ["BT26-038"] },
            { card: "BT1-066", as: "ally" },
          ],
          hand: [{ card: "BT26-038", as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenBattleWon", {
      attackerPermanentId: s.perm("ally").permanentId,
    });

    expect(s.perm("host").topCard.cardId).toBe("BT26-008");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
