import { describe, expect, it } from "vitest";
import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-023.js";
import "../index.js";

describe("BT26-023 Mojyamon", () => {
  it("encodes the printed evolution, Training/Jamming, and face-down hand cost", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["DM"], cost: 2, isAlternate: true }]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Training" }),
        expect.objectContaining({ keyword: "Jamming" }),
      ]),
    );
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [{ kind: "Return", to: "deckBottom", cost: { kind: "place", position: "bottom", faceDown: true } }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking" && !effect.isInherited)).toMatchObject({
      actions: [{ kind: "Return", to: "deckBottom" }],
    });
  });

  it("uses the exact level-3 DM alternate evolution for cost 2", async () => {
    expect(digivolutionRequirementsFor("BT26-023")).toContainEqual({
      level: 3,
      traits: ["DM"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "EX9-007", as: "redDm", under: ["EX9-001"] }],
        hand: [{ card: "BT26-023", as: "mojyamon" }],
        deck: ["AD1-001"],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("redDm").permanentId,
        instanceId: legal.inst("mojyamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("redDm").topCard.cardId === "BT26-023");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("redDm").stack.map(({ cardId }) => cardId)).toEqual(["EX9-001", "EX9-007"]);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "wrongTrait" }],
        hand: [{ card: "BT26-023", as: "mojyamon" }],
      },
    });
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("wrongTrait").permanentId,
        instanceId: illegal.inst("mojyamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("publicly pays with a face-down bottom card before bottom-decking a level-4 opponent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-023", as: "mojyamon" }],
          hand: [{ card: "BT1-001", as: "material" }],
        },
        1: {
          battleArea: [{ card: "BT26-039", as: "target" }],
          deck: ["AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("material").instanceId, s.perm("target").permanentId);
    const materialId = s.inst("material").instanceId;
    const targetId = s.perm("target").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mojyamon"));

    expect(s.perm("mojyamon").stack[0]?.instanceId).toBe(materialId);
    expect(s.perm("mojyamon").stack[0]?.faceUp).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(targetId);
  });

  it("does not pay or return a level-5, a Tamer, or a breeding-area Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-023", as: "mojyamon" }],
        hand: [{ card: "BT1-001", as: "material" }],
      },
      1: {
        battleArea: [
          { card: "BT26-030", as: "level5" },
          { card: "BT1-085", as: "tamer" },
        ],
        breeding: { card: "BT26-039", as: "breeding" },
      },
    });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mojyamon"));

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.perm("mojyamon").stack).toHaveLength(0);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards" || req.kind === "chooseTargets")).toBe(false);
  });

  it("may decline the optional hand placement without returning an eligible target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-023", as: "mojyamon" }],
          hand: [{ card: "BT1-001", as: "material" }],
        },
        1: { battleArea: [{ card: "BT26-039", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mojyamon"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("material").instanceId]);
    expect(s.perm("mojyamon").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("target").instanceId,
    ]);
  });

  it("binds the main When Attacking clause to Mojyamon rather than another ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-023", as: "mojyamon" },
            { card: "BT26-035", as: "ally" },
          ],
          hand: [{ card: "BT1-001", as: "material" }],
        },
        1: { battleArea: [{ card: "BT26-039", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("ally"), {
      attackerPermanentId: s.perm("ally").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mojyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Training suspends Mojyamon and places the deck top face down beneath its top card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-023", as: "mojyamon" }],
          deck: [{ card: "BT1-001", as: "trainingCard" }],
        },
      },
      { autoAcceptOptional: true },
    );
    const trainingId = s.inst("trainingCard").instanceId;

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("mojyamon"));

    expect(s.perm("mojyamon").isSuspended).toBe(true);
    expect(s.perm("mojyamon").stack.at(-1)?.instanceId).toBe(trainingId);
    expect(s.perm("mojyamon").stack.at(-1)?.faceUp).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("Training cannot activate while suspended or with an empty deck", async () => {
    const suspended = setupEngine({
      0: { battleArea: [{ card: "BT26-023", as: "mojyamon", suspended: true }], deck: ["BT1-001"] },
    });
    await advance(suspended.engine).fire(EffectTiming.OnDeclaration, suspended.perm("mojyamon"));
    expect(suspended.state.players[0]!.deck).toHaveLength(1);

    const empty = setupEngine({ 0: { battleArea: [{ card: "BT26-023", as: "mojyamon" }] } });
    await advance(empty.engine).fire(EffectTiming.OnDeclaration, empty.perm("mojyamon"));
    expect(empty.perm("mojyamon").isSuspended).toBe(false);
  });

  it("publishes Jamming while Mojyamon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-023", as: "mojyamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("mojyamon"), "Jamming")).toBe(true);
  });

  it("uses top-card Jamming to survive a losing security battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-023", as: "mojyamon" }] },
      1: { security: [{ card: "BT26-017", as: "securityDigimon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mojyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("securityDigimon").instanceId,
    );
  });

  it("inherited When Attacking draws at 7 cards and not at 8", async () => {
    const eligible = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "host", under: ["BT26-023"] }],
        hand: Array.from({ length: 7 }, () => "BT1-001"),
        deck: ["BT1-002"],
      },
    });
    await advance(eligible.engine).fireForPermanent(EffectTiming.OnUseAttack, eligible.perm("host"), {
      attackerPermanentId: eligible.perm("host").permanentId,
    });
    expect(eligible.state.players[0]!.hand).toHaveLength(8);

    const ineligible = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "host", under: ["BT26-023"] }],
        hand: Array.from({ length: 8 }, () => "BT1-001"),
        deck: ["BT1-002"],
      },
    });
    await advance(ineligible.engine).fireForPermanent(EffectTiming.OnUseAttack, ineligible.perm("host"), {
      attackerPermanentId: ineligible.perm("host").permanentId,
    });
    expect(ineligible.state.players[0]!.hand).toHaveLength(8);
  });
});
