import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-044.js";

describe("BT23-044 Lilamon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-044")).toMatchObject({
      cardId: "BT23-044",
      nameEn: "Lilamon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Fairy", "CS"],
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, trash their top security card.",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["Yuuko Kamishiro", { battleArea: [{ card: "BT22-083", as: "condition" }] }],
    ["a CS Digimon", { battleArea: [{ card: "BT23-041", as: "condition" }] }],
    ["neither", {}],
  ])("charges 4 memory with %s in the battle area, otherwise 7", async (label, conditionBoard) => {
    const s = setupEngine({
      0: { ...conditionBoard, hand: [{ card: "BT23-044", as: "lilamon" }] },
    });
    s.state.memory = 10;
    const lilamonId = s.inst("lilamon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: lilamonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === lilamonId));

    expect(s.state.memory).toBe(label === "neither" ? 3 : 6);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  // Comprehensive rules 3-4-5-8: information on cards in breeding areas can't be referenced.
  // The generated IR left the `youHave` filter zone-less, and the zone-less scan also walks the
  // breeding area, so a hatched CS Digimon wrongly paid for the reduction.
  it("ignores a CS Digimon in the breeding area when checking the cost-reduction condition", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT23-041", as: "hatched" }, hand: [{ card: "BT23-044", as: "lilamon" }] },
    });
    s.state.memory = 10;
    const lilamonId = s.inst("lilamon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: lilamonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === lilamonId));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("hatched").instanceId);
  });

  // Q5305: the suspend cost accepts either player's Digimon.
  it("pays the entry cost by suspending an opponent's Digimon and offers no Tamer as a candidate", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-083", as: "yuuko" }],
          hand: [{ card: "BT23-044", as: "lilamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "theirDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("theirDigimon").topCard!.instanceId, s.perm("theirDigimon").permanentId);
    const lilamonId = s.inst("lilamon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: lilamonId })).toEqual({ ok: true });
    await settle(() => s.perm("theirDigimon").isSuspended);

    expect(s.perm("theirDigimon").isSuspended).toBe(true);
    expect(s.perm("yuuko").isSuspended).toBe(false);
    // The suspend cost offers either player's Digimon, and no Tamer. Lilamon is the only
    // eligible protection target ("1 of your Digimon"), so that choice needs no decision:
    // the [CS] trait Tamer is not a candidate.
    const targetDecisions = s.decisions.filter((entry) => entry.req.kind === "chooseTargets");
    expect(targetDecisions).toHaveLength(1);
    expect(targetDecisions[0]!.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("theirDigimon").permanentId, s.perm("lilamon").permanentId]),
    );
    expect(targetDecisions[0]!.req.options?.candidateInstanceIds).not.toContain(s.perm("yuuko").permanentId);
    expect(observe(s.engine).isRestricted(s.perm("lilamon"), "beReturned")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("yuuko"), "beReturned")).toBe(false);
    // Yuuko is on the board, so the play still costs 4.
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
  });

  it("leaves every Digimon unsuspended and unprotected when the entry effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-041", as: "ally" }],
          hand: [{ card: "BT23-044", as: "lilamon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const lilamonId = s.inst("lilamon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: lilamonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === lilamonId));

    expect(s.perm("ally").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("ally"), "beReturned")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("lilamon"), "beReturned")).toBe(false);
    assertNoLoudGap(s);
  });

  it("digivolves for 3 on the Green route, draws 1 and protects itself from an opponent's return effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-041", as: "base" }],
          hand: [{ card: "BT23-044", as: "lilamon" }],
          deck: ["BT1-011", "BT1-011"],
        },
        1: {
          // Full Moon Meteor Impact is Blue; the Blue Digimon meets its colour requirement.
          battleArea: [{ card: "BT1-027", as: "blueAlly" }],
          hand: [{ card: "BT13-105", as: "bounce" }],
          deck: ["BT1-011", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const lilamonId = s.inst("lilamon").instanceId;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    const handBeforeDigivolve = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: lilamonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "beReturned"));

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard?.instanceId).toBe(lilamonId);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT23-041"]);
    // Bonus draw for digivolving: the Lilamon card left the hand and one card replaced it.
    expect(s.state.players[0]!.hand).toHaveLength(handBeforeDigivolve);
    expect(s.perm("base").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("base"), "beReturned")).toBe(true);

    // The opponent's [Main] "return 1 of your opponent's Digimon to the hand" cannot move it.
    const lilamonPermanentId = s.perm("base").permanentId;
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT13-105"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([lilamonPermanentId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === lilamonId)).toBe(false);
    assertNoLoudGap(s);

    // The protection lapses when that opponent turn ends.
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
    expect(observe(s.engine).isRestricted(s.perm("base"), "beReturned")).toBe(false);
  });

  it("lets an opponent's return effect move the same Digimon when the entry effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-041", as: "base" }],
          hand: [{ card: "BT23-044", as: "lilamon" }],
          deck: ["BT1-011", "BT1-011"],
        },
        1: {
          // Full Moon Meteor Impact is Blue; the Blue Digimon meets its colour requirement.
          battleArea: [{ card: "BT1-027", as: "blueAlly" }],
          hand: [{ card: "BT13-105", as: "bounce" }],
          deck: ["BT1-011", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lilamonId = s.inst("lilamon").instanceId;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: lilamonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === lilamonId);
    expect(observe(s.engine).isRestricted(s.perm("base"), "beReturned")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === lilamonId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  // "their effects can't return" — only the OPPONENT's effects are prohibited.
  it("still lets its own controller return the protected Digimon with their own effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-041", as: "base" },
            // Aqua Viper is Blue; a Blue Digimon in play meets its colour requirement. It has
            // none of the protected traits, so it is never the Restrict target.
            { card: "BT1-027", as: "blueAlly" },
          ],
          hand: [
            { card: "BT23-044", as: "lilamon" },
            { card: "BT4-102", as: "selfBounce" },
          ],
          deck: ["BT1-011", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "theirDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 8;
    await s.ready();
    const lilamonId = s.inst("lilamon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: lilamonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "beReturned"));
    expect(observe(s.engine).isRestricted(s.perm("base"), "beReturned")).toBe(true);
    preferred.push(s.perm("base").permanentId, s.perm("base").topCard!.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("selfBounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === lilamonId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === lilamonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("blueAlly").permanentId,
    ]);
    assertNoLoudGap(s);
  });

  it("digivolves from an off-color CS level 4 for 3 on the alternate route, with or without the flag", async () => {
    for (const useAlternateCost of [true, false]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT22-022", as: "base" }],
            hand: [{ card: "BT23-044", as: "lilamon" }],
            deck: ["BT1-011", "BT1-011"],
          },
        },
        { autoDeclineOptional: true },
      );
      s.state.memory = 6;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("lilamon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT23-044");
      expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT22-022"]);
      expect(s.state.memory).toBe(3);
    }
  });

  it("rejects a level 3 non-CS source", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT23-044", as: "lilamon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lilamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("trashes the opponent's top security after its carrier deletes a Digimon in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-080", as: "host", under: ["BT23-044"] }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "target", suspended: true }],
        security: [
          { card: "BT1-010", as: "topSecurity" },
          { card: "BT1-011", as: "bottomSecurity" },
        ],
      },
    });
    await s.ready();
    const targetId = s.perm("target").permanentId;
    const topSecurityId = s.inst("topSecurity").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((card) => card.permanentId === targetId));

    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("bottomSecurity").instanceId]);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === topSecurityId)).toBe(true);
  });

  // Q5306: no activation when this Digimon and the opponent's Digimon are deleted together.
  it("does not trash security when both battling Digimon are deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-080", as: "host", under: ["BT23-044"] }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "target", dp: 12000, suspended: true }],
        security: [
          { card: "BT1-010", as: "topSecurity" },
          { card: "BT1-011", as: "bottomSecurity" },
        ],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((card) => card.permanentId === targetId) &&
        !s.state.players[0]!.battleArea.some((card) => card.permanentId === hostId),
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("topSecurity").instanceId)).toBe(false);
  });

  it("trashes security once per turn and again on the next turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-080", as: "host", under: ["BT23-044"], suspended: true }],
        deck: ["BT1-011", "BT1-011", "BT1-011", "BT1-011"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "firstAttacker" },
          { card: "BT1-010", as: "secondAttacker" },
        ],
        security: [{ card: "BT1-011", as: "sec1" }, { card: "BT1-011", as: "sec2" }, "BT1-011"],
        deck: ["BT1-011", "BT1-011", "BT1-011", "BT1-011"],
      },
    });
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    const hostPermanentId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "permanent", permanentId: hostPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.security.map((card) => card.instanceId)).not.toContain(s.inst("sec1").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(2);

    // Second battle-deletion in the same turn: the [Once Per Turn] gate refuses it.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "permanent", permanentId: hostPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);

    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    // The next turn resets the gate: the same host deletes again and trashes security.
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const victim = s.putOnBoard(1, { card: "BT1-009", as: "victim", suspended: true });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostPermanentId,
        target: { kind: "permanent", permanentId: victim.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).not.toContain(s.inst("sec2").instanceId);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await ownTurn;
  });

  it("does not trash security after its carrier wins against a Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-080", as: "host", under: ["BT23-044"] }] },
      1: {
        security: [
          { card: "BT23-041", as: "securityDigimon" },
          { card: "BT1-010", as: "remaining" },
        ],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security[0]!.instanceId).toBe(s.inst("remaining").instanceId);
  });

  it("reduces its play cost when the required Yuuko or CS condition is present", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 3,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "battleArea",
              or: [
                {
                  kind: ["Tamer"],
                  // Printed [Yuuko Kamishiro] is a bracket name: exact, not substring.
                  nameOrTrait: [{ tokens: ["Yuuko Kamishiro"], match: "nameExact" }],
                },
                {
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                },
              ],
            },
          },
        },
      ],
    });
  });

  it("restricts one of your eligible Digimon from returning to hand or deck after paying the suspend cost", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Restrict",
        target: {
          filter: {
            controller: "mine",
            // "1 of your Digimon": a [CS] trait Tamer is not an eligible protection target.
            kind: ["Digimon"],
            or: [{ trait: "Vegetation" }, { trait: "Plant" }, { trait: "Fairy" }, { trait: "CS" }],
          },
          count: 1,
        },
        restriction: "cannotReturnToHandOrDeck",
        byOpponentEffectsOnly: true,
        duration: "untilOpponentTurnEnd",
        cost: { kind: "suspend", target: { filter: { controller: "any", kind: ["Digimon"] }, count: 1 } },
        optional: true,
        abortOnDecline: true,
      });
    }
  });

  it("inherits the once-per-turn battle deletion security trash", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });
});
