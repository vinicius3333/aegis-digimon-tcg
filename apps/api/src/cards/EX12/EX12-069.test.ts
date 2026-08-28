import { compiledEffects, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-069.js";
import "../index.js";

const CARD_ID = "EX12-069";

describe("EX12-069 Virus Busters", () => {
  it("maps the KB-backed security trigger, main self-placement, and security play", () => {
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
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: { filter: { playCostLte: 5 } },
        },
      ],
    });
    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  it("adds itself face up to the bottom of security after returning the bottom card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-017", as: "vb" }],
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

  it("enforces Use Requirement when no VB card is present", async () => {
    const s = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "option" }] } });
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual(
      expect.objectContaining({ ok: false }),
    );
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("option").instanceId)).toBe(true);
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

  it("does not play a different-level VB Digimon from the face-up security watcher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-013", as: "attacker" }],
          hand: [{ card: "EX12-017", as: "differentLevel" }],
          security: [{ card: CARD_ID, as: "security", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("differentLevel").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("plays a cost-5-or-lower VB card from hand when its security skill resolves", async () => {
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

  it("plays an eligible VB card from trash but rejects a cost-6-or-higher VB card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-017", as: "tooExpensive" }],
          trash: [{ card: "EX12-013", as: "valid" }],
          security: [{ card: CARD_ID, as: "security", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX12-013"));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("tooExpensive").instanceId);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("valid").instanceId)).toBe(false);
  });

  it("matches the complete catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Virus Busters",
      colors: ["Yellow"],
      kinds: ["Option"],
      playCost: 2,
      dp: 0,
      evoCosts: [],
      types: ["VB"],
    });
  });
});
