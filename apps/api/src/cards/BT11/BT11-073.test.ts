import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT10/BT10-067.js";
import { compiled } from "./BT11-073.js";
describe("BT11-073 Justimon: Accel Arm", () => {
  it("maps catalog facts and both printed effects to IR", () => {
    expect(getCardDefinition("BT11-073")).toMatchObject({
      cardId: "BT11-073",
      colors: ["Black"],
      level: 6,
      playCost: 12,
      dp: 12000,
      types: ["Cyborg"],
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [
          { kind: "GainKeyword", keyword: { keyword: "SecurityAttack" } },
          { kind: "GainKeyword", keyword: { keyword: "Piercing" }, condition: { kind: "ifThisEffectActed" } },
        ],
      },
      {
        trigger: "WhenAttacking",
        actions: [{ kind: "Digivolve", costOverride: 2, ignoreRequirements: true, optional: true }],
      },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Justimon"], cost: 1, isAlternate: true }]);
  });

  it("returns a level 6 source when its digivolving effect is accepted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT11-073", as: "justimon", under: ["BT2-030"] }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("justimon"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT2-030")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("justimon"))).toBe(true);
  });

  it("does not grant Piercing when no level 6 source can be returned", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-073", as: "justimon" }] } }, { autoAcceptOptional: true });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("justimon"));

    expect(observe(s.engine).hasPierce(s.perm("justimon"))).toBe(false);
  });

  it("digivolves into a Justimon from hand for 2 when attacking with a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-073", as: "justimon" },
            { card: "BT1-087", as: "tamer" },
          ],
          hand: [{ card: "BT10-067", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("justimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("justimon").topCard.cardId === "BT10-067");

    expect(s.perm("justimon").topCard.cardId).toBe("BT10-067");
    expect(s.state.memory).toBe(0);
  });

  it("does not digivolve from the attack effect without a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-073", as: "justimon" }],
          hand: [{ card: "BT10-067", as: "evolution" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("justimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);

    expect(s.perm("justimon").topCard.cardId).toBe("BT11-073");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-067")).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("may decline the optional attack digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-073", as: "justimon" },
            { card: "BT1-087", as: "tamer" },
          ],
          hand: [{ card: "BT10-067", as: "evolution" }],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("justimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);

    expect(s.perm("justimon").topCard.cardId).toBe("BT11-073");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-067")).toBe(true);
    expect(s.state.memory).toBe(2);
  });
});
