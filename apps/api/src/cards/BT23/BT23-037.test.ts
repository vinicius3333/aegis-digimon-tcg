import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-037.js";

describe("BT23-037 Tentomon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-037")).toMatchObject({
      cardId: "BT23-037",
      nameEn: "Tentomon",
      colors: ["Green", "Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Green", level: 2, memoryCost: 1 },
        { color: "Yellow", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Insectoid", "Hudie", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["battleArea", 2],
    ["breeding", 3],
  ] as const)("charges the correct CS evolution cost from %s", async (zone, expectedCost) => {
    const s = setupEngine({
      0: {
        ...(zone === "battleArea"
          ? { battleArea: [{ card: "BT23-037", as: "tentomon" }] }
          : { breeding: { card: "BT23-037", as: "tentomon" } }),
        hand: [{ card: "BT23-041", as: "kabuterimon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tentomon").permanentId,
        instanceId: s.inst("kabuterimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tentomon").topCard.instanceId === s.inst("kabuterimon").instanceId);
    expect(s.state.memory).toBe(5 - expectedCost);
  });

  it("plays, permanently locks and deletes the bound Hudie only at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-041", as: "host", under: ["BT23-037"] }],
          hand: [
            { card: "BT23-050", as: "eligible" },
            { card: "BT23-055", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    const played = s.state.players[0]!.battleArea.find(
      (card) => card.permanentId !== s.perm("host").permanentId && card.topCard?.cardId === "BT23-050",
    );
    expect(played).toBeDefined();
    expect(observe(s.engine).isRestricted(played!, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-055")).toBe(true);

    s.state.turnSeat = 0;
    await advance(s.engine).fireSubTrigger("endOfTurn");
    expect(s.state.players[0]!.battleArea.some((card) => card.permanentId === played!.permanentId)).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("endOfTurn");
    expect(s.state.players[0]!.battleArea.some((card) => card.permanentId === played!.permanentId)).toBe(false);
  });

  it("reduces this Digimon's CS digivolution cost by 1 during your turn", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    const replacement = effect.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
      into: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
      },
      actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
    });
  });

  it("inherits the bound Hudie play, evolution lock and opponent-turn-end deletion", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited) as any;
    expect(effect).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" });
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      abortOnDecline: true,
      bindResultAs: "playedHudie",
      target: { filter: { playCostLte: 5, nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }] } },
    });
    expect(effect.actions[1]).toMatchObject({
      kind: "Restrict",
      target: { filter: { boundRef: "playedHudie" } },
      restriction: "digivolve",
      duration: "permanent",
    });
    expect(effect.actions[2]).toMatchObject({ kind: "DelayedDelete", timing: "endOfOpponentTurn" });
  });

  it("digivolves for 0 from an off-color level-2 CS card and rejects a non-CS peer", () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-002", as: "base" }], hand: [{ card: "BT23-037", as: "tentomon" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("tentomon").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "base" }], hand: [{ card: "BT23-037", as: "tentomon" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("tentomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
