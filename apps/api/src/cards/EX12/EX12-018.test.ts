import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "../index.js";

describe("EX12-018 Siriusmon", () => {
  it("places up to two matching cards on digivolving and reduces an opposing Digimon by the full stack count", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-014", as: "base" }],
          hand: [
            { card: "EX12-018", as: "source" },
            { card: "EX12-007", as: "handMaterial" },
          ],
          trash: [{ card: "EX12-013", as: "trashMaterial" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 8000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("source").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.length === 3 && s.perm("opponent").currentDP === 2000);

    expect(s.perm("base").topCard?.cardId).toBe("EX12-018");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX12-014", "EX12-007", "EX12-013"]));
    expect(s.perm("opponent").currentDP).toBe(2000);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("handMaterial").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashMaterial").instanceId)).toBe(false);
  });

  it("places a matching card during an attack and scales the temporary reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-018", as: "source", under: ["EX12-007"] }],
          trash: [{ card: "EX12-013", as: "material" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    await settle(() => s.perm("source").stack.length === 2 && s.perm("opponent").currentDP === 3000);

    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX12-007", "EX12-013"]));
    expect(s.perm("opponent").currentDP).toBe(3000);
  });

  it("does not apply the reduction when no matching card can be placed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-018", as: "source" }] },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle();

    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.perm("opponent").currentDP).toBe(7000);
  });

  it("deletes the highest opposing Digimon when used as Planet Punch", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX12-018", as: "option" }], battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "BT1-011", as: "lower", dp: 5000 },
            { card: "BT1-011", as: "highest", dp: 7000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const highestId = s.perm("highest").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== highestId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("encodes Progress, Piercing, Security Attack +1, waive-color, shared timing, and evolution routes", () => {
    const compiled = registeredCompiledCards.get("EX12-018")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, texts: ["Gammamon"], cost: 3, isAlternate: true },
      { traits: ["VB"], cost: 3, isAlternate: true, level: 5 },
    ]);
    const keywords = compiled.effects.filter((effect) => effect.trigger === "Static").flatMap((effect) => effect.keywords ?? []);
    expect(keywords.map((keyword) => keyword.keyword)).toEqual(["Progress", "Piercing", "SecurityAttack"]);
    expect(keywords.find((keyword) => keyword.keyword === "SecurityAttack")).toMatchObject({ amount: 1 });
    const module = getEffectModule("EX12-018")!;
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, { cardId: "EX12-018", ownerSeat: 0 } as never)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnUseAttack, { cardId: "EX12-018", ownerSeat: 0 } as never)).toHaveLength(1);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "PlaceUnder", optional: true, target: { count: 2, upTo: true, from: ["hand", "trash"] } },
          { kind: "ModifyDP", amount: -2000, duration: "untilOpponentTurnEnd", condition: { kind: "ifThisEffectActed" }, scaling: { per: 1, unit: "digivolutionCards" } },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "Static" && effect.actions?.some((action) => action.kind === "WaiveColorRequirement"))).toMatchObject({
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["VB"], match: "trait" }] } } }],
    });
  });
});
