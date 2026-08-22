import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-069.js";
import "../index.js";

const CARD_ID = "EX12-069";

describe("EX12-069 Virus Busters", () => {
  it("maps the KB-backed security trigger, main self-placement, and security play", () => {
    const compiled = registeredCompiledCards.get(CARD_ID)!;
    const securityTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn" && effect.isSecurity)!;
    const main = compiled.effects.find((effect) => effect.trigger === "Main")!;
    const securitySkill = compiled.effects.find((effect) => effect.trigger === "Security" && effect.isSecurity)!;

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(securityTurn.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        levelComparison: { op: "gte", value: 4 },
        nameOrTrait: [{ tokens: ["VB"], match: "trait" }],
      },
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: true,
          reduceCostBy: 3,
          optional: true,
          target: { filter: { sameLevelAsAttacker: true } },
        },
      ],
    });
    expect(main.actions).toEqual([
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: false },
      { kind: "SecurityManipulation", op: "placeAsSecurity", controller: "mine", toTop: false, faceUp: true },
    ]);
    expect(main.actions[1]).not.toHaveProperty("source");
    expect(securitySkill).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true }],
    });
  });

  it("adds itself face up to the bottom of security after returning the bottom card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-013", as: "vb" }],
          hand: [{ card: CARD_ID, as: "option" }],
          security: [
            { card: "BT1-101", as: "top" },
            { card: "BT1-101", as: "bottom" },
          ],
        },
        1: { security: ["BT1-101"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.at(-1)?.cardId === CARD_ID, 160);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-101")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: CARD_ID, faceUp: true });
  });

  it("still places itself when the controller has no security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-013", as: "vb" }],
          hand: [{ card: CARD_ID, as: "option" }],
        },
        1: { security: ["BT1-101"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.at(-1)?.cardId === CARD_ID, 160);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: CARD_ID, faceUp: true });
  });

  it("plays a same-level VB Digimon from hand from its face-up security effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-013", as: "attacker" }],
          hand: [{ card: "EX12-013", as: "target" }],
          security: [{ card: CARD_ID, as: "security", faceUp: true }],
        },
        1: { security: ["BT1-101"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2, 160);

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("target").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("plays a level-5-or-lower VB card from hand when its security skill resolves", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-013", as: "target" }],
          security: [{ card: CARD_ID, as: "security", faceUp: true }],
        },
        1: { security: ["BT1-101"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("target").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("target").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(true);
  });
});
