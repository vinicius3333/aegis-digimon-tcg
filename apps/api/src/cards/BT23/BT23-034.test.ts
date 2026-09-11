import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-034.js";

describe("BT23-034 Sakuyamon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-034")).toMatchObject({
      cardId: "BT23-034",
      nameEn: "Sakuyamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Shaman", "Zaxon", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("pays 5 less with a Zaxon Tamer and applies both riders to one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-086", as: "yuugo" }],
          hand: [{ card: "BT23-034", as: "sakuyamon" }],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const sakuyamonId = s.inst("sakuyamon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sakuyamonId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === sakuyamonId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === sakuyamonId)).toBe(
      true,
    );
    expect(s.perm("target").currentDP).toBe(4000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not reduce the play cost without a Zaxon Tamer", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT23-034", as: "sakuyamon" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sakuyamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("sakuyamon").instanceId,
      ),
    );
    expect(s.state.memory).toBe(-1);
  });

  it("reduces its play cost by 5 when you have a Zaxon Tamer", () => {
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
          amount: 5,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Zaxon"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("once per turn restricts and weakens one opposing Digimon across all three timings", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger) as any;
      expect(effect.frequency).toBe("OncePerTurn");
      expect(effect.sharedUseKey).toBe("ir-shared-0");
      expect(effect.actions).toMatchObject([
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
          amount: -6000,
          duration: "untilOpponentTurnEnd",
        },
      ]);
    }
  });

  it("places itself face up at the bottom of security on deletion", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "OnDeletion") as any).actions[0];
    expect(action).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      controller: "mine",
      toTop: false,
      faceUp: true,
    });
  });

  it("accepts off-color level-5 CS evolution and rejects an off-color non-CS peer", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT23-023", as: "base" }],
        hand: [{ card: "BT23-034", as: "sakuyamon" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 3;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("sakuyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.instanceId === legal.inst("sakuyamon").instanceId);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "base" }], hand: [{ card: "BT23-034", as: "sakuyamon" }] },
    });
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("sakuyamon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });

  it("spends its own shared once-per-turn use on the first timing and re-arms next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-086", as: "yuugo" },
            { card: "BT23-023", as: "base" },
          ],
          hand: [
            { card: "BT23-034", as: "sakuyamon" },
            { card: "BT1-011", as: "ownNeutral" },
          ],
          security: ["BT1-009", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-045", "BT1-047"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "target" }],
          hand: [{ card: "BT1-011", as: "opponentNeutral" }],
          security: ["BT1-009", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-045", "BT1-047"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    // [When Digivolving] spends the shared use. The base was already in play, so the new
    // Sakuyamon can attack in the same turn and reach the [When Attacking] timing.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sakuyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    // Same turn, second timing: the once-per-turn use is already spent, so no second -6000.
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.players[1]!.security).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle();

    // The duration expired with the opponent's turn and the use re-armed.
    expect(s.perm("target").currentDP).toBe(10000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Q5282, Q5283, Q5286: the restriction stops the [When Digivolving] half of a shared
  // [When Digivolving] [When Attacking] [Once Per Turn] effect from activating, without
  // consuming the once-per-turn use, so the [When Attacking] half still activates.
  it("suppresses the opponent's When Digivolving half but leaves the shared When Attacking use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-086", as: "yuugo" }],
          hand: [
            { card: "BT23-034", as: "sakuyamon" },
            { card: "BT1-009", as: "ownNeutral" },
          ],
          security: ["BT1-009", "BT1-011", "BT1-012"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT2-037", as: "base" }],
          hand: [
            { card: "ST24-07", as: "shine" },
            { card: "ST3-12", as: "tamer" },
            { card: "BT1-009", as: "opponentNeutral" },
          ],
          security: ["BT1-009", "BT1-011", "BT1-012"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sakuyamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving"));
    expect(s.state.memory).toBe(4);
    const sakuyamonPermanentId = s.perm("sakuyamon").permanentId;
    expect(s.perm("base").currentDP).toBe(4000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving")).toBe(true);
    s.state.memory = 10;

    const tamerId = s.inst("tamer").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shine").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "ST24-07");
    await settle();

    // Q5282/Q5285: nothing from the [When Digivolving] half happened.
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === tamerId)).toBe(true);
    expect(s.perm("sakuyamon").permanentId).toBe(sakuyamonPermanentId);
    expect(s.perm("sakuyamon").currentDP).toBe(11000);
    expect(s.state.pendingDecision).toBeUndefined();

    // Q5283/Q5286: the same effect still activates on the [When Attacking] timing.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === tamerId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === tamerId)).toBe(true);
    expect(s.perm("sakuyamon").currentDP).toBe(2000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Q5284: an external "activate that card's [When Digivolving] effect" effect cannot
  // activate a restricted card's [When Digivolving] effect either.
  it.each([true, false])(
    "blocks an external activation of a restricted When Digivolving effect (restricted=%s)",
    async (restricted) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT23-086", as: "yuugo" }],
            hand: [
              ...(restricted ? [{ card: "BT23-034", as: "sakuyamon" }] : []),
              { card: "BT1-009", as: "firstNeutral" },
              { card: "BT1-011", as: "secondNeutral" },
            ],
            deck: ["BT1-012", "BT1-013"],
          },
          1: { battleArea: [{ card: "EX6-043", as: "diaboromon" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 12;
      await s.ready();

      if (restricted) {
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sakuyamon").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => observe(s.engine).isRestricted(s.perm("diaboromon"), "cannotActivateWhenDigivolving"));
        expect(observe(s.engine).isRestricted(s.perm("diaboromon"), "cannotActivateWhenDigivolving")).toBe(true);
      }

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstNeutral").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondNeutral").instanceId })).toEqual({
        ok: true,
      });
      await settle();

      const tokens = s.state.players[1]!.battleArea.filter(
        (permanent) => permanent.permanentId !== s.perm("diaboromon").permanentId,
      );
      expect(tokens.length === 0).toBe(restricted);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  // Q5285: a suppressed [When Digivolving] effect does not even process its "by" cost.
  it.each([true, false])("does not process the By cost of a suppressed effect (restricted=%s)", async (restricted) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "returnTarget" }],
          hand: [...(restricted ? [{ card: "BT23-034", as: "sakuyamon" }] : []), { card: "BT1-011", as: "ownNeutral" }],
          security: ["BT1-009", "BT1-011", "BT1-012"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT23-044", as: "base" }],
          hand: [
            { card: "BT23-045", as: "tiger" },
            { card: "BT18-044", as: "royalSource" },
            { card: "BT1-011", as: "opponentNeutral" },
          ],
          security: ["BT1-009", "BT1-011", "BT1-012"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    if (restricted) {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sakuyamon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving"));
    }
    expect(observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving")).toBe(restricted);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;

    const royalSourceId = s.inst("royalSource").instanceId;
    const returnTargetId = s.perm("returnTarget").topCard!.instanceId;
    const securityBefore = s.state.players[1]!.security.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tiger").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-045");
    await settle();

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === royalSourceId)).toBe(restricted);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual(
      restricted ? securityBefore : [...securityBefore, royalSourceId],
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === returnTargetId)).toBe(
      restricted,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === returnTargetId)).toBe(!restricted);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Q5289: the placed card is a face-up security card that stays revealed, behind the
  // security cards already in the stack.
  it("places the deleted card face up behind the existing security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-034", as: "sakuyamon" }],
          security: [{ card: "BT1-009", as: "existing" }],
          hand: [{ card: "BT1-011", as: "ownNeutral" }],
          deck: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "attacker", dp: 18000 }],
          hand: [{ card: "BT1-011", as: "opponentNeutral" }],
          security: ["BT1-009", "BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sakuyamonId = s.perm("sakuyamon").topCard!.instanceId;
    const existingId = s.inst("existing").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // Attacking suspends Sakuyamon so the opponent can attack it next turn, and its own
    // [When Attacking] half weakens the future attacker to 12000 — still above its 11000 DP.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();
    expect(s.perm("sakuyamon").isSuspended).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(12000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("sakuyamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([existingId, sakuyamonId]);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.security[1]!.faceUp).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === sakuyamonId)).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Q5290: a security check of that face-up card runs like any other security check.
  // The fixture holds the exact state the previous test produces: BT23-034 face up in
  // its owner's security stack.
  it("checks the face-up placed card as a normal security card", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT23-034", as: "placed", faceUp: true }],
          hand: [{ card: "BT1-011", as: "ownNeutral" }],
          deck: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }],
          hand: [{ card: "BT1-011", as: "opponentNeutral" }],
          security: ["BT1-009", "BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const placedId = s.inst("placed").instanceId;
    const attackerId = s.perm("attacker").permanentId;
    const attackerCardId = s.perm("attacker").topCard!.instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    // The face-up card is checked exactly like a face-down one: it battles the attacker
    // as a Security Digimon (11000 DP beats 3000) and then leaves the security stack.
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerCardId);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === placedId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(placedId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.security).toHaveLength(0);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Q5291: a [Security] effect still triggers when the checked card was already face up.
  // The fixture's face-up security card is the state BT23-034's [On Deletion] produces.
  it("triggers the Security effect of a face-up security card", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT21-041", as: "calendamon", faceUp: true }],
          hand: [{ card: "BT1-011", as: "ownNeutral" }],
          deck: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }],
          hand: [{ card: "BT1-011", as: "opponentNeutral" }],
          security: ["BT1-009", "BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const calendamonId = s.inst("calendamon").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === calendamonId)).toBe(
      true,
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Q5292: shuffling a security stack that holds face-up cards leaves every card face down.
  it("re-hides every face-up security card on a shuffle", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-029", as: "airdramon" }],
          security: [
            { card: "BT1-009", as: "firstFaceUp", faceUp: true },
            { card: "BT1-011", as: "secondFaceUp", faceUp: true },
            { card: "BT1-012", as: "faceDown" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("airdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length < 3);
    await settle();

    expect(s.state.players[0]!.security.length).toBeGreaterThan(0);
    expect(s.state.players[0]!.security.every((card) => card.faceUp === false)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("expires the restriction and the -6000 at opponent turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-086", as: "yuugo" }],
          hand: [
            { card: "BT23-034", as: "sakuyamon" },
            { card: "BT1-011", as: "ownNeutral" },
          ],
          security: ["BT1-009", "BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "target" }],
          hand: [{ card: "BT1-011", as: "opponentNeutral" }],
          security: ["BT1-009", "BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sakuyamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(s.perm("target").currentDP).toBe(4000);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(false);
    expect(s.perm("target").currentDP).toBe(10000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
