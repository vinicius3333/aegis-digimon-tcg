import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-043.js";

/**
 * Delete `permanentIds` as seat `seat`'s effect, so the "other than by your effects"
 * cause gate sees the real resolving controller instead of falling back to the turn seat.
 */
async function deleteByEffectOf(s: ReturnType<typeof setupEngine>, seat: 0 | 1, permanentIds: string[]) {
  const verbs = advance(s.engine).verb;
  verbs.enterEffectResolution(seat);
  try {
    return await verbs.deletePermanent(permanentIds, "byEffect");
  } finally {
    verbs.leaveEffectResolution();
  }
}

function securityFaces(s: ReturnType<typeof setupEngine>, seat: 0 | 1) {
  return s.state.players[seat]!.security.map((card) => ({ instanceId: card.instanceId, faceUp: card.faceUp }));
}

describe("BT23-043 CannonBeemon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-043")).toMatchObject({
      cardId: "BT23-043",
      nameEn: "CannonBeemon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg", "X Antibody", "Royal Base", "CS", "Insectoid"],
    });
    const inherited = getCardDefinition("BT23-043")?.inheritedEffectText ?? "";
    expect(inherited).toContain("would leave the battle area other than by your effects");
    expect(inherited).toContain("1 of those Digimon doesn't leave.");
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Royal Base", "CS"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // [Security] [Opponent's Turn] All of your Digimon with the [Royal Base] trait
  // gain <Blocker>
  // ---------------------------------------------------------------------------

  it("grants Blocker to all of your Royal Base Digimon in Security", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn") as any;
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: "all",
          },
          keyword: { keyword: "Blocker" },
        },
      ],
    });
  });

  it("grants Blocker live only to friendly Royal Base Digimon on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT23-043", as: "securityCannon", faceUp: true }],
        battleArea: [
          { card: "BT23-045", as: "royalBase" },
          { card: "BT23-041", as: "other" },
        ],
      },
      1: { battleArea: [{ card: "BT23-045", as: "opposingRoyalBase" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("royalBase"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opposingRoyalBase"), "Blocker")).toBe(false);
  });

  it("grants nothing on your own turn or from a face-down security copy", async () => {
    const ownTurn = setupEngine({
      0: {
        security: [{ card: "BT23-043", as: "securityCannon", faceUp: true }],
        battleArea: [{ card: "BT23-045", as: "royalBase" }],
      },
    });
    ownTurn.state.turnSeat = 0;
    await ownTurn.ready();
    expect(observe(ownTurn.engine).hasKeyword(ownTurn.perm("royalBase"), "Blocker")).toBe(false);

    const faceDown = setupEngine({
      0: {
        security: [{ card: "BT23-043", as: "securityCannon", faceUp: false }],
        battleArea: [{ card: "BT23-045", as: "royalBase" }],
      },
    });
    faceDown.state.turnSeat = 1;
    await faceDown.ready();
    expect(observe(faceDown.engine).hasKeyword(faceDown.perm("royalBase"), "Blocker")).toBe(false);
  });

  it("lets the granted Royal Base Digimon actually block an opponent's attack on the player", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT23-043", as: "securityCannon", faceUp: true }, "BT1-009"],
        battleArea: [{ card: "BT23-042", as: "royalBase" }],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 1000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("royalBase"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("royalBase").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    // The block replaced the security check: TigerVespamon survived, the attacker died,
    // and both of the defender's security cards are untouched.
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("royalBase").permanentId)).toBe(true);
  });

  it("does not let a non-Royal-Base Digimon block on the strength of this Security effect", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT23-043", as: "securityCannon", faceUp: true }],
        battleArea: [{ card: "BT23-041", as: "other" }],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 1000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("other").permanentId }).ok).toBe(
      false,
    );
  });

  // ---------------------------------------------------------------------------
  // [All Turns] [Once Per Turn] When this Digimon would leave the battle area
  // other than by your effects, by flipping your top face-up security card face
  // down, it doesn't leave.
  // ---------------------------------------------------------------------------

  it("prevents this Digimon from leaving except by its owner's effects", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    const replacement = effect.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      leaveCause: "otherThanYourEffect",
      actions: [
        {
          kind: "Prevent",
          mode: "leavePlay",
          cost: {
            kind: "flipSecurity",
            target: {
              filter: { zone: "security", controller: "mine", position: "top", faceUp: true },
              count: 1,
            },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect(effect.frequency).toBe("OncePerTurn");
  });

  it("flips the TOP FACE-UP security card, skipping face-down cards above it, and keeps the stack order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-043", as: "cannon" }],
          security: [
            { card: "BT1-009", as: "coverA", faceUp: false },
            { card: "BT1-010", as: "coverB", faceUp: false },
            { card: "BT1-011", as: "topFaceUp", faceUp: true },
            { card: "BT1-012", as: "deeperFaceUp", faceUp: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const before = securityFaces(s, 0);

    expect(await deleteByEffectOf(s, 1, [s.perm("cannon").permanentId])).toBe(0);

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("cannon").permanentId)).toBe(true);
    expect(securityFaces(s, 0)).toEqual([
      { instanceId: before[0]!.instanceId, faceUp: false },
      { instanceId: before[1]!.instanceId, faceUp: false },
      { instanceId: before[2]!.instanceId, faceUp: false },
      { instanceId: before[3]!.instanceId, faceUp: true },
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does not protect itself from its own controller's effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-043", as: "cannon" }],
          security: [{ card: "BT1-009", as: "cost", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const cannonInstanceId = s.inst("cannon").instanceId;

    expect(await deleteByEffectOf(s, 0, [s.perm("cannon").permanentId])).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === cannonInstanceId)).toBe(true);
    expect(securityFaces(s, 0)).toEqual([{ instanceId: s.state.players[0]!.security[0]!.instanceId, faceUp: true }]);
  });

  it("cannot pay without a face-up security card, so the deletion goes through", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-043", as: "cannon" }],
          security: [
            { card: "BT1-009", faceUp: false },
            { card: "BT1-010", faceUp: false },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(await deleteByEffectOf(s, 1, [s.perm("cannon").permanentId])).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(securityFaces(s, 0).every((card) => card.faceUp === false)).toBe(true);
  });

  it("leaves the battle area when its controller declines the optional prevention", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-043", as: "cannon" }],
          security: [{ card: "BT1-009", as: "cost", faceUp: true }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(await deleteByEffectOf(s, 1, [s.perm("cannon").permanentId])).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security[0]).toMatchObject({ faceUp: true });
  });

  it("prevents only once per turn and recovers the ability on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-043", as: "cannon" },
            { card: "BT23-045", as: "spare" },
          ],
          security: [
            { card: "BT1-009", as: "firstCost", faceUp: true },
            { card: "BT1-010", as: "secondCost", faceUp: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const cannonPermanentId = s.perm("cannon").permanentId;

    expect(await deleteByEffectOf(s, 1, [cannonPermanentId])).toBe(0);
    expect(securityFaces(s, 0)).toEqual([
      { instanceId: s.inst("firstCost").instanceId, faceUp: false },
      { instanceId: s.inst("secondCost").instanceId, faceUp: true },
    ]);

    // Same turn, same instance: the once-per-turn clause refuses and the spare
    // face-up security card is not spent.
    expect(await deleteByEffectOf(s, 1, [cannonPermanentId])).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === cannonPermanentId)).toBe(false);
    expect(securityFaces(s, 0)).toEqual([
      { instanceId: s.inst("firstCost").instanceId, faceUp: false },
      { instanceId: s.inst("secondCost").instanceId, faceUp: true },
    ]);
  });

  it("resets the once-per-turn prevention on a later turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-043", as: "cannon" }],
          security: [
            { card: "BT1-009", as: "firstCost", faceUp: true },
            { card: "BT1-010", as: "secondCost", faceUp: true },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"], security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const cannonPermanentId = s.perm("cannon").permanentId;

    // Seat 1's effect on seat 0's own turn is still "other than by your effects".
    expect(await deleteByEffectOf(s, 1, [cannonPermanentId])).toBe(0);
    expect(securityFaces(s, 0)).toEqual([
      { instanceId: s.inst("firstCost").instanceId, faceUp: false },
      { instanceId: s.inst("secondCost").instanceId, faceUp: true },
    ]);

    const turnCountBefore = s.state.turnCount;
    await advance(s.engine).runTurn(s.state.turnSeat);
    expect(s.state.turnCount).toBeGreaterThan(turnCountBefore);

    expect(await deleteByEffectOf(s, 1, [cannonPermanentId])).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === cannonPermanentId)).toBe(true);
    expect(securityFaces(s, 0)).toEqual([
      { instanceId: s.inst("firstCost").instanceId, faceUp: false },
      { instanceId: s.inst("secondCost").instanceId, faceUp: false },
    ]);
  });

  // ---------------------------------------------------------------------------
  // Inherited: [All Turns] [Once Per Turn] When any of your [Royal Base] trait
  // Digimon would leave the battle area other than by your effects, by flipping
  // your top face-up security card face down, 1 of those Digimon doesn't leave.
  // ---------------------------------------------------------------------------

  it("inherits protection for one qualifying Royal Base Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited) as any;
    expect(effect).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
          },
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: 1,
          },
          leaveCause: "otherThanYourEffect",
        },
      ],
    });
    expect((effect.actions[0] as any).affectsAll).toBeUndefined();
  });

  it("uses its inherited effect to flip security and preserve another Royal Base Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-046", as: "carrier", under: ["BT23-043"] },
            { card: "BT23-045", as: "protected" },
          ],
          security: [{ card: "BT1-009", as: "cost", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const protectedId = s.perm("protected").permanentId;

    expect(await deleteByEffectOf(s, 1, [protectedId])).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.security[0]).toMatchObject({ faceUp: false });
  });

  it("saves exactly one of two simultaneously threatened Royal Base Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-046", as: "carrier", under: ["BT23-043"] },
            { card: "BT23-042", as: "firstRoyalBase" },
            { card: "BT23-045", as: "secondRoyalBase" },
          ],
          security: [
            { card: "BT1-009", as: "firstCost", faceUp: true },
            { card: "BT1-010", as: "secondCost", faceUp: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const firstId = s.perm("firstRoyalBase").permanentId;
    const secondId = s.perm("secondRoyalBase").permanentId;

    expect(await deleteByEffectOf(s, 1, [firstId, secondId])).toBe(1);

    const survivors = s.state.players[0]!.battleArea.map((p) => p.permanentId);
    expect(survivors).toContain(s.perm("carrier").permanentId);
    expect([firstId, secondId].filter((id) => survivors.includes(id))).toHaveLength(1);
    // The once-per-turn clause paid exactly one security card.
    expect(securityFaces(s, 0)).toEqual([
      { instanceId: s.inst("firstCost").instanceId, faceUp: false },
      { instanceId: s.inst("secondCost").instanceId, faceUp: true },
    ]);
  });

  it("does not extend inherited protection to a non-Royal-Base Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-046", as: "carrier", under: ["BT23-043"] },
            { card: "BT23-041", as: "outsider" },
          ],
          security: [{ card: "BT1-009", as: "cost", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(await deleteByEffectOf(s, 1, [s.perm("outsider").permanentId])).toBe(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ faceUp: true });
  });

  it("does not extend inherited protection to the opponent's Royal Base Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-046", as: "carrier", under: ["BT23-043"] }],
          security: [{ card: "BT1-009", as: "cost", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT23-045", as: "opposingRoyalBase" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(await deleteByEffectOf(s, 0, [s.perm("opposingRoyalBase").permanentId])).toBe(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ faceUp: true });
  });

  // ---------------------------------------------------------------------------
  // Q5304: All Delete + QueenBeemon. An earlier CannonBeemon prevention must not
  // erase QueenBeemon's later security placement for the other Royal Base Digimon.
  // ---------------------------------------------------------------------------

  it("leaves QueenBeemon's security placement available for the Digimon it did not save (Q5304)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-043", as: "cannon" },
            { card: "BT19-053", as: "queen" },
            { card: "BT23-045", as: "otherRoyalBase" },
          ],
          security: [{ card: "BT1-009", as: "cost", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const cannonId = s.perm("cannon").permanentId;
    const queenId = s.perm("queen").permanentId;
    const otherId = s.perm("otherRoyalBase").permanentId;
    const cannonInstanceId = s.perm("cannon").topCard!.instanceId;
    const queenInstanceId = s.perm("queen").topCard!.instanceId;
    const otherInstanceId = s.perm("otherRoyalBase").topCard!.instanceId;

    // Q5304's scenario: the controller resolves CannonBeemon's prevention FIRST, so the
    // ordering decision must offer both reactions and let the prevention win for this
    // permanent. QueenBeemon's placement must still be available for the rest.
    const answered = new Set<string>();
    const answerOrdering = () => {
      for (const { seat, req } of s.decisions) {
        if (req.kind !== "orderTriggers" || answered.has(req.decisionId)) continue;
        answered.add(req.decisionId);
        const keys = req.options?.triggerKeys ?? [];
        const preferred = keys.find((key) => key.includes(cannonId)) ?? keys[0];
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "orderTriggers", order: preferred === undefined ? [] : [preferred] },
        });
      }
    };

    const deletion = deleteByEffectOf(s, 1, [cannonId, queenId, otherId]);
    await settle(() => {
      answerOrdering();
      return s.state.players[0]!.security.length > 1;
    });
    await deletion;
    await settle(() => {
      answerOrdering();
      return s.state.players[0]!.security.length > 1;
    });

    // No Royal Base Digimon was deleted: CannonBeemon's prevention paid its cost by
    // flipping the only face-up security card face down.
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "BT1-009", faceUp: false });

    // QueenBeemon's placement stayed eligible after the prevention: every Royal Base
    // Digimon affected by the deletion effect reached the bottom of security face up,
    // in battle-area order, and none of them was deleted.
    const placed = s.state.players[0]!.security.slice(1);
    expect(placed.map((card) => ({ instanceId: card.instanceId, faceUp: card.faceUp }))).toEqual([
      { instanceId: cannonInstanceId, faceUp: true },
      { instanceId: queenInstanceId, faceUp: true },
      { instanceId: otherInstanceId, faceUp: true },
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Evolution
  // ---------------------------------------------------------------------------

  it.each(["BT23-042", "BT23-041"])("digivolves for 3 from a level-4 Royal Base/CS card (%s)", async (base) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: base, as: "base" }],
        hand: [{ card: "BT23-043", as: "cannon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard!.instanceId;
    const handSizeBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cannon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-043");

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard!.cardId).toBe("BT23-043");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    // One card left the hand, the digivolution draw put one back.
    expect(s.state.players[0]!.hand.length).toBe(handSizeBefore);
  });

  it("charges the printed Green level-4 cost of 4 when the alternate route is not declared", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-042", as: "base" }],
        hand: [{ card: "BT23-043", as: "cannon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cannon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-043");
    expect(s.state.memory).toBe(1);
  });

  it("rejects a level-4 source without the Royal Base or CS trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-024", as: "base" }], hand: [{ card: "BT23-043", as: "cannon" }] },
    });
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cannon").instanceId,
      }).ok,
    ).toBe(false);
  });
});
