import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, settleAcrossTimers, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-029.js";

/**
 * Decline the ＜Alliance＞ prompt an attacking Alliance Digimon opens. The engine has no
 * default answer for it, and an unanswered prompt keeps `CombatController.resolving` true,
 * which makes every later attack in the test reject with `wrong-phase`.
 */
async function declineAlliance(s: ReturnType<typeof setupEngine>): Promise<void> {
  const seen = s.events.filter((event) => event.kind === "alliancePrompt").length;
  await settle(() => s.events.filter((event) => event.kind === "alliancePrompt").length > seen);
  expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
}

/**
 * Hand the turn to seat 1 through the production turn loop instead of writing `turnSeat`.
 * Returns the loop promise; end it with a `surrender` intent.
 */
async function handTurnToOpponent(s: ReturnType<typeof setupEngine>): Promise<{ loop: Promise<void> }> {
  // Seat 0 needs at least one legal Main action, or the entry finalizer auto-passes its turn
  // and the open-and-idle window `waitForMainPhase` looks for never appears.
  s.state.memory = 3;
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  advance(s.engine).endMainPhaseIfOpen(0);
  await advance(s.engine).waitForMainPhase(1);
  expect(s.state.turnSeat).toBe(1);
  // Wrapped: returning the promise itself would make `await` here wait for the whole turn loop.
  return { loop };
}

describe("BT23-029 Antylamon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-029")).toMatchObject({
      cardId: "BT23-029",
      nameEn: "Antylamon",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Green", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Holy Beast", "Deva", "CS"],
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When any of your other Digimon suspend, 1 of your opponent's Digimon gets -4000 DP for the turn.",
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Turuiemon", "Wendigomon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["CS"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
  it("reacts when this card itself is played and restricts one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-029", as: "antylamon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: Array(12).fill("BT1-010"),
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("antylamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));

    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("self-play restricts Chaosmon after a legal BT20 evolution", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-029", as: "antylamon" }], deck: Array(12).fill("BT1-010") },
        1: {
          battleArea: [{ card: "BT20-035", as: "base" }],
          hand: [{ card: "BT20-037", as: "valdur" }],
          deck: Array(12).fill("BT1-011"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const { loop } = await handTurnToOpponent(s);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("valdur").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-037");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT20-035"]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("antylamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("antylamon").topCard.cardId).toBe("BT23-029");
    expect(observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly reacts only when another own Digimon suspends, not the carrier itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-035", as: "carrier", under: ["BT23-029"] },
            { card: "BT1-035", as: "other" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: Array(10).fill("BT1-010"),
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "target" }],
          security: ["BT1-009", "BT1-011", "BT1-012", "BT1-013"],
          deck: Array(10).fill("BT1-012"),
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("carrier").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("carrier").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(10000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("other").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(6000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("masked Antylamon still reacts to a later public CS play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-029", as: "antylamon" }],
          hand: [
            { card: "BT23-078", as: "peer" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: Array(12).fill("BT1-010"),
        },
        1: {
          battleArea: [{ card: "BT20-035", as: "base" }],
          hand: [{ card: "BT20-037", as: "valdur" }],
          deck: Array(12).fill("BT1-011"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const { loop } = await handTurnToOpponent(s);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("valdur").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).timingEffectDisabled(s.perm("antylamon"), "onPlay"));
    expect(observe(s.engine).timingEffectDisabled(s.perm("antylamon"), "onPlay")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.phase).toBe("Main");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("peer").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving"));
    expect(observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving")).toBe(true);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("restricts exactly one opponent when an own CS Tamer is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-029", as: "antylamon" }], hand: [{ card: "BT23-078", as: "tamer" }] },
        1: {
          battleArea: [
            { card: "BT1-024", as: "first" },
            { card: "BT1-024", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("first"), "cannotActivateWhenDigivolving"));
    expect(observe(s.engine).isRestricted(s.perm("first"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("second"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("does not react to an opponent CS Tamer play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-029", as: "antylamon" },
            { card: "BT1-024", as: "target" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: Array(12).fill("BT1-010"),
        },
        1: { hand: [{ card: "BT23-078", as: "tamer" }], deck: Array(12).fill("BT1-011") },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const { loop } = await handTurnToOpponent(s);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle();
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declares Alliance", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static")!;
    expect(staticEffect.keywords).toEqual([{ keyword: "Alliance", raw: "＜Alliance＞" }]);
  });

  it("once per turn reacts to any played Beast, Beastkin, or CS card", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns")!;
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        nameOrTrait: [{ tokens: ["Beast", "Beastkin", "CS"], match: "trait" }],
      },
      actions: [
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
  });

  it("inherits the other-Digimon suspension DP reaction", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
          actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
        },
      ],
    });
  });

  // The printed clause says "any of your cards", so the pool mixes both trait families and
  // both card kinds: Beast Digimon (vanilla and keyword-only), Beastkin Digimon, CS Digimon,
  // and a CS Tamer. Each play must restrict exactly one of the two opposing Digimon.
  const traitPool: Array<[string, string]> = [
    ["Beast Digimon AD1-010", "AD1-010"],
    ["Beast Digimon BT1-049", "BT1-049"],
    ["Beast Digimon BT1-031", "BT1-031"],
    ["Beastkin Digimon BT1-035", "BT1-035"],
    ["CS Digimon BT23-017", "BT23-017"],
    ["CS Tamer BT23-078", "BT23-078"],
  ];

  it.each(traitPool)("reacts to an own played %s and restricts exactly one opposing Digimon", async (_label, peer) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-029", as: "antylamon" }], hand: [{ card: peer, as: "peer" }] },
        1: {
          battleArea: [
            { card: "BT1-024", as: "target" },
            { card: "BT1-035", as: "bystander" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("peer").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("bystander"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it.each(traitPool)("ignores the same %s when the opponent controls and plays it", async (_label, peer) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-029", as: "antylamon" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: Array(12).fill("BT1-010"),
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "first" },
            { card: "BT1-024", as: "second" },
          ],
          hand: [{ card: peer, as: "peer" }],
          deck: Array(12).fill("BT1-011"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const { loop } = await handTurnToOpponent(s);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("peer").instanceId })).toEqual({ ok: true });
    await settle();
    expect(observe(s.engine).isRestricted(s.perm("first"), "cannotActivateWhenDigivolving")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("second"), "cannotActivateWhenDigivolving")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores a played card with no Beast, Beastkin, or CS trait", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-029", as: "antylamon" }], hand: [{ card: "BT1-009", as: "peer" }] },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("peer").instanceId })).toEqual({ ok: true });
    await settle();
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("publicly applies inherited -4000 when another Digimon attacks, then resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-035", as: "carrier", under: ["BT23-029"] },
            { card: "BT1-035", as: "other" },
            { card: "BT23-041", as: "otherAgain" },
          ],
          deck: Array(8).fill("BT1-010"),
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "target" }],
          security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          deck: Array(8).fill("BT1-012"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const base = s.perm("target").currentDP;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("other").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(base - 4000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherAgain").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // BT23-041 carries ＜Alliance＞. Nothing answers that prompt automatically, and an
    // unanswered one leaves the attack resolving forever, so decline it explicitly: this
    // test is about Antylamon's inherited -4000, not about using Alliance.
    await declineAlliance(s);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(base - 4000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    expect(s.perm("target").currentDP).toBe(base);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherAgain").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await declineAlliance(s);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("otherAgain").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(base - 4000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps a 5000-DP opponent alive at 1000 and ignores an enemy suspension", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-035", as: "carrier", under: ["BT23-029"] },
          { card: "BT1-035", as: "other" },
        ],
        deck: Array(8).fill("BT1-010"),
      },
      1: {
        battleArea: [{ card: "BT23-041", as: "target", dp: 5000 }],
        security: ["BT1-009"],
        deck: Array(8).fill("BT1-011"),
      },
    });
    const base = s.perm("target").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("other").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(base - 4000);
    expect(s.perm("target").currentDP).toBe(1000);

    const s2 = setupEngine({
      0: {
        battleArea: [{ card: "BT23-035", as: "carrier", under: ["BT23-029"] }],
        hand: [{ card: "BT1-009", as: "spare" }],
        security: ["BT1-009", "BT1-010"],
        deck: Array(12).fill("BT1-010"),
      },
      1: {
        battleArea: [
          { card: "BT1-035", as: "enemy" },
          { card: "BT23-041", as: "target", dp: 5000 },
        ],
        deck: Array(12).fill("BT1-011"),
      },
    });
    await s2.ready();
    const { loop: loop2 } = await handTurnToOpponent(s2);
    expect(
      s2.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s2.perm("enemy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s2.engine).isAttacking());
    expect(s2.perm("target").currentDP).toBe(5000);
    expect(s2.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop2;
  });

  it("excludes the inherited carrier itself when it is the only suspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-035", as: "carrier", under: ["BT23-029"] }], deck: Array(8).fill("BT1-010") },
      1: {
        battleArea: [{ card: "BT23-041", as: "target", dp: 5000 }],
        security: ["BT1-009"],
        deck: Array(8).fill("BT1-011"),
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("carrier").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("carrier").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("does not treat a near Appmon-only card as Beast, Beastkin, or CS", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-029", as: "antylamon" }], hand: [{ card: "BT23-079", as: "near" }] },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("near").instanceId })).toEqual({ ok: true });
    await settle();
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("projects the inherited boundary to 0 DP and trashes the exact target", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-035", as: "carrier", under: ["BT23-029"] },
          { card: "BT1-035", as: "other" },
        ],
        deck: Array(8).fill("BT1-010"),
      },
      1: {
        battleArea: [{ card: "BT23-041", as: "target", dp: 4000 }],
        security: ["BT1-009"],
        deck: Array(8).fill("BT1-011"),
      },
    });
    const targetId = s.inst("target").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === targetId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetId)).toBe(true);
  });

  it("limits the play watcher once per turn and resets after the opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-029", as: "antylamon" }],
          hand: [
            { card: "BT23-078", as: "first" },
            { card: "BT23-078", as: "second" },
            { card: "BT23-078", as: "third" },
          ],
          deck: Array(10).fill("BT1-010"),
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "one" },
            { card: "BT1-024", as: "two" },
          ],
          deck: Array(10).fill("BT1-011"),
        },
      },
      { autoSelectCards: false },
    );
    await s.ready();
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const firstChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("one").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("one"), "cannotActivateWhenDigivolving"));
    expect(observe(s.engine).isRestricted(s.perm("one"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(observe(s.engine).isRestricted(s.perm("two"), "cannotActivateWhenDigivolving")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("one"), "cannotActivateWhenDigivolving")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("one"), "cannotActivateWhenDigivolving")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const secondChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("two").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("two"), "cannotActivateWhenDigivolving"));
    expect(observe(s.engine).isRestricted(s.perm("two"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the restriction through every opponent phase and drops it at the opponent turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-029", as: "antylamon" }],
          hand: [
            { card: "BT23-078", as: "tamer" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: Array(12).fill("BT1-010"),
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "target" }],
          hand: [{ card: "BT1-011", as: "opponentSpare" }],
          deck: Array(12).fill("BT1-012"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);

    // The duration is "until the end of your opponent's turn", so the restriction must survive
    // this player's own turn end and the whole opponent turn, and must be gone before the next
    // own turn opens.
    const phaseLog = () =>
      s.events
        .filter((event) => event.kind === "phaseChanged")
        .map((event) => `${(event as { turnSeat: number }).turnSeat}:${(event as { phase: string }).phase}`);
    const restricted = () => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving");
    const beforeOpponentTurn = phaseLog().length;

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(phaseLog().slice(beforeOpponentTurn)).toContain("0:End");
    expect(restricted()).toBe(true);

    // Nothing has cleared it yet: it survived this player's own end-of-turn sweep and the
    // opponent's Active, Draw and Breeding phases.
    const beforeOpponentEnd = phaseLog().length;
    advance(s.engine).endMainPhaseIfOpen(1);
    let flipAfter: string[] | undefined;
    await settleAcrossTimers(() => {
      if (flipAfter === undefined && !restricted()) flipAfter = phaseLog().slice(beforeOpponentEnd);
      return flipAfter !== undefined;
    });
    expect(flipAfter).toBeDefined();
    // The clear lands on the opponent's End phase: the first phase observed after their Main
    // is their End, and no second opponent turn has begun.
    expect(flipAfter![0]).toBe("1:End");
    expect(flipAfter!.filter((entry) => entry.startsWith("1:"))).toEqual(["1:End"]);

    await advance(s.engine).waitForMainPhase(0);
    expect(restricted()).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("actually suppresses the restricted opponent's When Digivolving effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-029", as: "antylamon" },
            { card: "BT1-024", as: "dpWitness" },
          ],
          hand: [
            { card: "BT23-078", as: "tamer" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: Array(12).fill("BT1-010"),
        },
        1: {
          battleArea: [{ card: "BT1-047", as: "base" }],
          hand: [{ card: "BT23-028", as: "evo" }],
          deck: Array(12).fill("BT1-012"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const witnessDp = s.perm("dpWitness").currentDP;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving"));
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT23-028");
    await settle();
    // Coordemon's [When Digivolving] "-3000 DP" never activated (Q5266, Q5268).
    expect(s.perm("dpWitness").currentDP).toBe(witnessDp);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-047"]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly accepts Alliance and suspends the chosen supporter", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-029", as: "antylamon" },
          { card: "BT23-017", as: "ally" },
        ],
        deck: Array(8).fill("BT1-010"),
      },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"], deck: Array(8).fill("BT1-011") },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "allianceResolved") && !observe(s.engine).isAttacking());
    expect(s.perm("antylamon").isSuspended).toBe(true);
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("publicly refuses Alliance without suspending the supporter", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-029", as: "antylamon" },
          { card: "BT23-017", as: "ally" },
        ],
        deck: Array(8).fill("BT1-010"),
      },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"], deck: Array(8).fill("BT1-011") },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "allianceResolved") && !observe(s.engine).isAttacking());
    expect(s.perm("antylamon").isSuspended).toBe(true);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it.each([
    ["normal yellow", "BT23-041", undefined, 4],
    ["normal green", "BT22-047", undefined, 4],
    ["named Turuiemon", "BT3-037", 0, 3],
    ["named Wendigomon", "BT7-070", 0, 3],
    ["level-4 CS alternate", "BT23-041", 1, 3],
  ])("publicly evolves Antylamon from %s", async (_label, sourceCard, alternateRequirementIndex, cost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: sourceCard, as: "source" }],
        hand: [{ card: "BT23-029", as: "antylamon" }],
        deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
      },
    });
    s.state.memory = cost;
    const sourceId = s.inst("source").instanceId;
    const antylamonId = s.inst("antylamon").instanceId;
    const intent = {
      type: "digivolve" as const,
      permanentId: s.perm("source").permanentId,
      instanceId: antylamonId,
      ...(alternateRequirementIndex === undefined ? {} : { useAlternateCost: true, alternateRequirementIndex }),
    };
    expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.instanceId === antylamonId);
    expect(s.perm("source").topCard.instanceId).toBe(antylamonId);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it.each([
    ["wrong level despite CS", "BT23-017"],
    ["wrong name and trait", "BT1-035"],
  ])("rejects an ineligible alternate source: %s", async (_label, sourceCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: sourceCard, as: "source" }],
        hand: [{ card: "BT23-029", as: "antylamon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;
    const sourceId = s.inst("source").instanceId;
    const antylamonId = s.inst("antylamon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: antylamonId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("source").topCard.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(antylamonId);
    expect(s.state.memory).toBe(3);
  });
});
