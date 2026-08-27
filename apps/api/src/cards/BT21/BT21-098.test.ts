import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-098.js";
import "../index.js";

describe("BT21-098 Ragnarok Cannon", () => {
  it("deletes exactly one lowest-play-cost opposing Digimon and places itself in the battle area", async () => {
    const s = setup(
      {
        0: { battleArea: [{ card: "BT21-062", as: "galacticmon" }], hand: [{ card: "BT21-098", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT1-010", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== lowId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highId)).toBe(true);
    expect(s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "BT21-098")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT21-098")).toBe(false);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("keeps Main deletion, Galacticmon Delay payload, and Security Vemmon play separate", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "lowestPlayCost" } },
    });
    expect(main?.actions[1]).toEqual({ kind: "PlaceInBattleAreaSelf" });

    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Galacticmon"], match: "name" }] },
    });
    const subTrigger = yourTurn?.actions[0];
    expect(subTrigger?.kind).toBe("SubTrigger");
    if (subTrigger?.kind !== "SubTrigger") throw new Error("expected attack subtrigger");
    const nested = subTrigger.actions;
    expect(nested).toHaveLength(2);
    expect(nested[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { superlative: "lowestPlayCost" } },
    });
    expect(nested[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "trashTop",
      leaveCount: 1,
      condition: { kind: "ifThisEffectDidNotDelete" },
    });

    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      from: ["hand", "trash"],
      target: { filter: { playCostLte: 6 } },
    });
    expect(security?.actions[1]).toEqual({ kind: "AddToHandSelf" });
  });

  /**
   * FAILS-WHEN-REVERTED: the Security filter named no card kind, so the "play 1 card with
   * [Vemmon] in its text" prompt also offered Option cards. Only Digimon and Tamers are
   * ever PLAYED — Options are used — so an Option-only candidate must leave the pool empty.
   */
  it("never offers an Option card to the Security play", async () => {
    const s = setup(
      {
        0: {
          security: [{ card: "BT21-098", as: "option" }],
          trash: [{ card: "BT11-105", as: "vemmonOption" }], // Fusionize — Option, cost 1, [Vemmon] in text
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));

    const offered = s.decisions.flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offered).not.toContain(s.inst("vemmonOption").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT11-105")).toBe(true);
  });

  it("Security plays a cost-6-or-less Vemmon-text card from trash and adds itself to hand", async () => {
    const s = setup(
      {
        0: {
          security: [{ card: "BT21-098", as: "option" }],
          trash: [{ card: "BT11-065", as: "vemmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("vemmon").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
