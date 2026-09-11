import { getCardDefinition, Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-075.js";

describe("BT23-075 Eater EDEN", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-075")).toMatchObject({
      cardId: "BT23-075",
      nameEn: "Eater EDEN",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 10,
      dp: 12000,
      evoCosts: [],
      forms: ["Eater"],
      attributes: ["-"],
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("models the printed [Eater Legion] route as an exact name, not a substring", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Eater Legion"], cost: 3, isAlternate: true }]);
  });

  it("raises the return ceiling for the digivolution cards of a breeding [Mother Eater]", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0];
      expect(action).toMatchObject({
        kind: "Return",
        to: "deckBottom",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLte: 6 }, count: 1 },
        playCostCeiling: {
          base: 6,
          raise: 1,
          per: 1,
          unit: "digivolutionCardsOfFiltered",
          filter: {
            controller: "mine",
            zone: "breeding",
            nameOrTrait: [{ tokens: ["Mother Eater"], match: "nameExact" }],
          },
        },
      });
    }
  });

  it("limits the leave replacement and the end-of-opponent-turn deletion correctly", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Eater"], match: "trait" }],
            },
          },
        },
      ],
    });
    const end = compiled.effects.find((entry) => entry.trigger === "EndOfOpponentsTurn");
    expect(end?.frequency).toBe("OncePerTurn");
    expect(end?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" }, count: 1 },
    });
  });

  it("publicly digivolves from [Eater Legion] for 3, draws, and returns an opposing cost-6 Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-074", as: "legion" }],
          hand: [{ card: "BT23-075", as: "eden" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT23-081", as: "tamer" },
            { card: "BT23-074", as: "costEight" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoDeclineOptional: false },
    );
    s.state.memory = 5;
    await s.ready();
    const drawnInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    const legionInstanceId = s.perm("legion").topCard!.instanceId;
    const edenInstanceId = s.inst("eden").instanceId;
    const tamerPermanentId = s.perm("tamer").permanentId;
    const tamerInstanceId = s.perm("tamer").topCard!.instanceId;
    const costEightPermanentId = s.perm("costEight").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("legion").permanentId,
        instanceId: edenInstanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("legion").topCard?.cardId === "BT23-075" &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === tamerPermanentId),
    );

    expect(s.state.memory).toBe(2);
    expect(s.perm("legion").topCard?.instanceId).toBe(edenInstanceId);
    expect(s.perm("legion").stack.map((card) => card.instanceId)).toContain(legionInstanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawnInstanceId);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === tamerPermanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === costEightPermanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(tamerInstanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  // Eater EDEN prints no normal digivolve cost, so the name-gated route is the only route.
  // Both intent branches must therefore charge the same printed 3 memory.
  it("charges the printed 3 whether or not the intent asks for the alternate cost", async () => {
    for (const useAlternateCost of [true, false]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT23-074", as: "legion" }],
          hand: [{ card: "BT23-075", as: "eden" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      });
      s.state.memory = 5;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("legion").permanentId,
          instanceId: s.inst("eden").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("legion").topCard?.cardId === "BT23-075");
      expect(s.state.memory).toBe(2);
    }
  });

  it("refuses a near-name [Eater] source that is not [Eater Legion]", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-082", as: "adam" }],
        hand: [{ card: "BT23-075", as: "eden" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-011", "BT1-012"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("adam").permanentId,
        instanceId: s.inst("eden").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    expect(s.perm("adam").topCard?.cardId).toBe("BT22-082");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eden").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10);
  });

  it("cannot reach a play cost 8 Digimon with no [Mother Eater] in breeding", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-075", as: "eden" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT23-074", as: "costEight" }],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const edenInstanceId = s.inst("eden").instanceId;
    const costEightPermanentId = s.perm("costEight").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: edenInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === edenInstanceId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === costEightPermanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.deck.at(-1)?.cardId).not.toBe("BT23-074");
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("raises the ceiling by each digivolution card of a breeding [Mother Eater]", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT22-007", as: "mother", under: ["BT22-007", "BT22-007"] },
          hand: [{ card: "BT23-075", as: "eden" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT23-074", as: "costEight" }],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const edenInstanceId = s.inst("eden").instanceId;
    const costEightPermanentId = s.perm("costEight").permanentId;
    const costEightInstanceId = s.perm("costEight").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: edenInstanceId })).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === costEightPermanentId),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === costEightPermanentId)).toBe(
      false,
    );
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(costEightInstanceId);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === edenInstanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays a free [Eater] from hand when battle deletion takes it off the board", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-075", as: "eden", dp: 3000 }],
          hand: [{ card: "BT23-073", as: "bit" }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-027", "BT1-028", "BT1-045"],
        },
        1: {
          battleArea: [
            { card: "BT23-074", as: "attacker", dp: 8000 },
            { card: "BT1-009", as: "dummy", dp: 1000, suspended: true },
          ],
          hand: [{ card: "ST1-02", as: "neutral" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-027", "BT1-028", "BT1-045"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Suspend Eater EDEN publicly: it attacks on its own turn, so it is a legal target when
    // the opponent's turn comes around.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("eden").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dummy").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("eden").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const edenPermanentId = s.perm("eden").permanentId;
    const edenInstanceId = s.perm("eden").topCard!.instanceId;
    const bitInstanceId = s.inst("bit").instanceId;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: edenPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === bitInstanceId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === edenPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === edenInstanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === bitInstanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bitInstanceId)).toBe(false);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may decline the free [Eater] play and still leaves the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-075", as: "eden", dp: 3000 }],
          hand: [{ card: "BT23-073", as: "bit" }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-027", "BT1-028", "BT1-045"],
        },
        1: {
          battleArea: [
            { card: "BT23-074", as: "attacker", dp: 8000 },
            { card: "BT1-009", as: "dummy", dp: 1000, suspended: true },
          ],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-027", "BT1-028", "BT1-045"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Suspend Eater EDEN publicly: it attacks on its own turn, so it is a legal target when
    // the opponent's turn comes around.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("eden").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dummy").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("eden").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const edenPermanentId = s.perm("eden").permanentId;
    const edenInstanceId = s.perm("eden").topCard!.instanceId;
    const bitInstanceId = s.inst("bit").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: edenPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === edenInstanceId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === edenPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === edenInstanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bitInstanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === bitInstanceId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger the free [Eater] play when your own effect removes it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-075", as: "eden" }],
          hand: [{ card: "BT23-073", as: "bit" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const edenPermanentId = s.perm("eden").permanentId;
    const bitInstanceId = s.inst("bit").instanceId;

    // No printed card in this pool deletes your own Eater EDEN, so the owner-effect cause is
    // driven through the production removal verb inside seat 0's own effect resolution.
    advance(s.engine).verb.enterEffectResolution(0 as Seat, ["Digimon"]);
    try {
      await advance(s.engine).verb.deletePermanent([edenPermanentId], "byEffect");
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === edenPermanentId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bitInstanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === bitInstanceId)).toBe(false);
  });

  it("deletes the opponent's lowest play cost Digimon once per opponent turn and resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-075", as: "eden" }],
          hand: [{ card: "ST1-02", as: "neutral" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-027", "BT1-028", "BT1-045"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT23-074", as: "higher" },
          ],
          hand: [{ card: "ST1-02", as: "opponentNeutral" }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-027", "BT1-028", "BT1-045"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    const lowestPermanentId = s.perm("lowest").permanentId;
    const lowestInstanceId = s.perm("lowest").topCard!.instanceId;
    const higherPermanentId = s.perm("higher").permanentId;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestPermanentId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestPermanentId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestPermanentId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === lowestInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === higherPermanentId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    const higherInstanceId = s.perm("higher").topCard!.instanceId;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === higherPermanentId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === higherPermanentId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === higherInstanceId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Q5352: with BT22-007 [Mother Eater] in a breeding Digimon's digivolution cards, its
  // inherited "place them as this Digimon's bottom digivolution cards" replacement and Eater
  // EDEN's own [All Turns] replacement answer the same leave event. The ruling says you may
  // not chain them: EDEN cannot be placed under the breeding host AND then play a free
  // [Eater]. The leave event here is a public battle deletion on the opponent's turn.
  // Exactly one of the two replacements applies, and WHICH one is the affected player's
  // choice — Q5352 answers only "may I do both?" with "No". `orderReplacements` asks the
  // controller, and `preferTriggerKeys` answers that prompt with BT22-007's placement; the
  // other branch (EDEN's own clause) is equally legal and is covered by the tests above.
  it("does not stack the breeding [Mother Eater] placement with its own leave effect (Q5352)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT22-079", as: "breeder", under: ["BT22-007"] },
          battleArea: [{ card: "BT23-075", as: "eden", dp: 3000 }],
          hand: [{ card: "BT23-073", as: "bit" }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-027", "BT1-028", "BT1-045"],
        },
        1: {
          battleArea: [
            { card: "BT23-074", as: "attacker", dp: 8000 },
            { card: "BT1-009", as: "dummy", dp: 1000, suspended: true },
          ],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-027", "BT1-028", "BT1-045"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferTriggerKeys: ["BT22-007"] },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    // The breeding area holds a legal move, so the Breeding window waits for an answer.
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const edenPermanentId = s.perm("eden").permanentId;
    const edenInstanceId = s.perm("eden").topCard!.instanceId;
    const bitInstanceId = s.inst("bit").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: edenPermanentId,
        target: { kind: "permanent", permanentId: s.perm("dummy").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: edenPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === edenPermanentId)).toBe(false);
    expect(s.perm("breeder").stack.some((card) => card.instanceId === edenInstanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === bitInstanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bitInstanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Coordinator probe for BT23-074's Q6706/Q6707. Erika Mishima (BT23-084) is a Tamer whose
  // LOWER text grants ＜Alliance＞ while the Digimon is [Hudiemon], [Eater Legion] or
  // [Eater EDEN]. Eater EDEN prints no ＜Alliance＞, so a stack that reaches EDEN through
  // Erika discriminates the inherited-effect ruling (Q6707: yes) from the security-effect
  // ruling (Q6706: no). Route: play Erika, digivolve BT23-074 off the Tamer, then BT23-075.
  it("gains inherited ＜Alliance＞ on Eater EDEN through an Erika Mishima source (Q6707)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-084", as: "stack" }],
          hand: [
            { card: "BT23-074", as: "legion" },
            { card: "BT23-075", as: "eden" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-013", "BT1-014"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();
    const erikaInstanceId = s.perm("stack").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stack").permanentId,
        instanceId: s.inst("legion").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard?.cardId === "BT23-074");
    expect(observe(s.engine).hasKeyword(s.perm("stack"), "Alliance")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stack").permanentId,
        instanceId: s.inst("eden").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard?.cardId === "BT23-075");

    expect(s.perm("stack").stack.map((card) => card.cardId)).toEqual(["BT23-084", "BT23-074"]);
    expect(s.perm("stack").stack.map((card) => card.instanceId)).toContain(erikaInstanceId);
    expect(observe(s.engine).hasKeyword(s.perm("stack"), "Alliance")).toBe(true);
  });

  it("has no ＜Alliance＞ on an Eater EDEN stack without Erika Mishima", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-074", as: "stack" }],
          hand: [{ card: "BT23-075", as: "eden" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-013", "BT1-014"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("stack"), "Alliance")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stack").permanentId,
        instanceId: s.inst("eden").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard?.cardId === "BT23-075");

    expect(s.perm("stack").stack.map((card) => card.cardId)).toEqual(["BT23-074"]);
    expect(observe(s.engine).hasKeyword(s.perm("stack"), "Alliance")).toBe(false);
  });
});
