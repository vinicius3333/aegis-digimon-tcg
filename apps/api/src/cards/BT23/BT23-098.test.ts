import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-098.js";

const optionPermanent = (s: ReturnType<typeof setupEngine>, seat: 0 | 1, instanceId: string) =>
  s.state.players[seat]!.battleArea.find((permanent) => permanent.topCard?.instanceId === instanceId);

const answerOptional = async (s: ReturnType<typeof setupEngine>, prompt: string, accept: boolean) => {
  await settle(() => s.state.pendingDecision?.kind === "optional");
  const decision = s.state.pendingDecision;
  expect(decision?.kind).toBe("optional");
  expect(decision?.promptText).toContain(prompt);
  expect(
    s.engine.applyIntent(decision!.seat, {
      type: "respondDecision",
      decisionId: decision!.decisionId,
      response: { kind: "optional", accept },
    }),
  ).toEqual({ ok: true });
};

describe("BT23-098 Unique Emblem: Soul Banquet", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-098")).toMatchObject({
      cardId: "BT23-098",
      nameEn: "Unique Emblem: Soul Banquet",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 3,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Activate this card's [Main] effects.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays a [Ghostmon] from hand for free and then places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT11-006", as: "egg" },
          hand: [
            { card: "BT23-098", as: "option" },
            { card: "BT23-061", as: "ghostmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const ghostmonId = s.inst("ghostmon").instanceId;
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => optionPermanent(s, 0, optionId) !== undefined);

    expect(optionPermanent(s, 0, optionId)?.placedByEffect).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ghostmonId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("plays a [Violet Inboots] out of the trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT11-006", as: "egg" },
          hand: [{ card: "BT23-098", as: "option" }],
          trash: [{ card: "BT23-087", as: "violet" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const violetId = s.inst("violet").instanceId;
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => optionPermanent(s, 0, optionId) !== undefined);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === violetId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === violetId)).toBe(false);
    expect(optionPermanent(s, 0, optionId)).toBeDefined();
    expect(s.state.memory).toBe(1);
  });

  it("still places itself when the controller declines the free play", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT11-006", as: "egg" },
          hand: [
            { card: "BT23-098", as: "option" },
            { card: "BT23-061", as: "ghostmon" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const ghostmonId = s.inst("ghostmon").instanceId;
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => optionPermanent(s, 0, optionId) !== undefined);

    expect(optionPermanent(s, 0, optionId)?.placedByEffect).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([ghostmonId]);
    expect(s.state.memory).toBe(1);
  });

  it("does not offer a non-[Ghostmon]/[Violet Inboots] purple card for the free play", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT11-006", as: "egg" },
          hand: [
            { card: "BT23-098", as: "option" },
            { card: "BT11-078", as: "soulmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const soulmonId = s.inst("soulmon").instanceId;
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => optionPermanent(s, 0, optionId) !== undefined);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([soulmonId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(1);
  });

  it("cannot pay its ＜Delay＞ on the turn it was placed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-087", as: "violet" },
            { card: "BT23-061", as: "naturalGhost" },
            { card: "BT23-061", as: "delayGhost" },
          ],
          hand: [
            { card: "BT23-098", as: "option" },
            { card: "BT20-068", as: "naturalEvolver" },
            { card: "BT20-068", as: "delayEvolver" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => optionPermanent(s, 0, optionId) !== undefined);
    expect(optionPermanent(s, 0, optionId)?.enterFieldTurnCount).toBe(s.state.turnCount);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("naturalGhost").permanentId,
        instanceId: s.inst("naturalEvolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("violet").isSuspended);

    expect(s.perm("violet").isSuspended).toBe(true);
    expect(s.perm("delayGhost").topCard?.cardId).toBe("BT23-061");
    expect(optionPermanent(s, 0, optionId)).toBeDefined();
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
  });

  it("trashes itself for ＜Delay＞ and digivolves a Ghost with the cost reduced by exactly 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-098", as: "option" },
            { card: "BT23-087", as: "violet" },
            { card: "BT23-061", as: "naturalGhost" },
            { card: "BT23-065", as: "delayGhost" },
          ],
          hand: [
            { card: "BT20-068", as: "naturalEvolver" },
            { card: "BT20-079", as: "delayEvolver" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    const delayBaseId = s.perm("delayGhost").topCard!.instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("naturalGhost").permanentId,
        instanceId: s.inst("naturalEvolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.perm("violet").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(optionPermanent(s, 0, optionId)).toBeUndefined();
    expect(s.perm("naturalGhost").topCard?.cardId).toBe("BT20-068");
    expect(s.perm("delayGhost").topCard?.cardId).toBe("BT20-079");
    expect(s.perm("delayGhost").stack.map((card) => card.instanceId)).toContain(delayBaseId);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([]);
  });

  it("does not pay ＜Delay＞ when the hand only holds Ghost-without-LIBERATOR or LIBERATOR-without-Ghost cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-098", as: "option" },
            { card: "BT23-087", as: "violet" },
            { card: "BT23-061", as: "naturalGhost" },
            { card: "BT23-061", as: "delayGhost" },
          ],
          hand: [
            { card: "BT20-068", as: "naturalEvolver" },
            { card: "BT11-078", as: "ghostOnly" },
            { card: "BT20-069", as: "liberatorOnly" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("naturalGhost").permanentId,
        instanceId: s.inst("naturalEvolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("violet").isSuspended);

    expect(s.perm("violet").isSuspended).toBe(true);
    expect(optionPermanent(s, 0, optionId)).toBeDefined();
    expect(s.perm("delayGhost").topCard?.cardId).toBe("BT23-061");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("ghostOnly").instanceId,
      s.inst("liberatorOnly").instanceId,
    ]);
    expect(s.state.memory).toBe(3);
  });

  it("keeps itself in the battle area when the controller declines ＜Delay＞", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-098", as: "option" },
            { card: "BT23-087", as: "violet" },
            { card: "BT23-061", as: "naturalGhost" },
            { card: "BT23-061", as: "delayGhost" },
          ],
          hand: [
            { card: "BT20-068", as: "naturalEvolver" },
            { card: "BT20-068", as: "delayEvolver" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("naturalGhost").permanentId,
        instanceId: s.inst("naturalEvolver").instanceId,
      }),
    ).toEqual({ ok: true });

    await answerOptional(s, "by suspending this Tamer", true);
    await settle(() => s.perm("violet").isSuspended);
    expect(s.perm("violet").isSuspended).toBe(true);
    await answerOptional(s, "Trash this card to activate its ＜Delay＞", false);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(optionPermanent(s, 0, optionId)).toBeDefined();
    expect(s.perm("delayGhost").topCard?.cardId).toBe("BT23-061");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("delayEvolver").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("pays its ＜Delay＞ on the next own turn through the real turn loop", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT11-006", as: "egg" },
          battleArea: [
            { card: "BT23-087", as: "violet" },
            { card: "BT23-061", as: "naturalGhost" },
            { card: "BT23-065", as: "delayGhost" },
          ],
          hand: [
            { card: "BT23-098", as: "option" },
            { card: "BT20-068", as: "naturalEvolver" },
            { card: "BT20-079", as: "delayEvolver" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          deck: ["BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    const optionId = s.inst("option").instanceId;
    const delayBaseId = s.perm("delayGhost").topCard!.instanceId;
    prefer.push(delayBaseId, s.perm("delayGhost").permanentId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => optionPermanent(s, 0, optionId) !== undefined);
    const placedTurn = s.state.turnCount;
    expect(optionPermanent(s, 0, optionId)?.enterFieldTurnCount).toBe(placedTurn);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnCount).toBeGreaterThan(placedTurn);

    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("violet").isSuspended).toBe(false);
    expect(optionPermanent(s, 0, optionId)).toBeDefined();

    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("naturalGhost").permanentId,
        instanceId: s.inst("naturalEvolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await answerOptional(s, "by suspending this Tamer", true);
    await answerOptional(s, "Trash this card to activate its ＜Delay＞", true);
    await answerOptional(s, "Digivolve", true);
    await settle(() => s.perm("delayGhost").topCard?.cardId === "BT20-079");

    expect(s.perm("violet").isSuspended).toBe(true);
    expect(optionPermanent(s, 0, optionId)).toBeUndefined();
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.perm("naturalGhost").topCard?.cardId).toBe("BT20-068");
    expect(s.perm("delayGhost").topCard?.cardId).toBe("BT20-079");
    expect(s.perm("delayGhost").stack.map((card) => card.instanceId)).toContain(delayBaseId);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("delayEvolver").instanceId);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores an opponent-controlled Violet Inboots suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-087", as: "violet" },
            { card: "BT23-061", as: "naturalGhost" },
          ],
          hand: [{ card: "BT20-068", as: "naturalEvolver" }],
        },
        1: { battleArea: [{ card: "BT23-098", as: "option" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("naturalGhost").permanentId,
        instanceId: s.inst("naturalEvolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("violet").isSuspended);

    expect(s.perm("violet").isSuspended).toBe(true);
    expect(optionPermanent(s, 1, optionId)).toBeDefined();
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
  });

  it("runs the full [Main] effect from a real security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
        },
        1: {
          security: [{ card: "BT23-098", as: "securityOption" }],
          hand: [{ card: "BT23-061", as: "ghostmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("securityOption").instanceId;
    const ghostmonId = s.inst("ghostmon").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => optionPermanent(s, 1, optionId) !== undefined);

    expect(optionPermanent(s, 1, optionId)?.placedByEffect).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ghostmonId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
  });

  it("compiles the printed clauses into the expected IR", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main")!;
    expect(main.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      payCost: false,
      optional: true,
      target: {
        count: 1,
        filter: {
          controller: "mine",
          nameOrTrait: [{ tokens: ["Ghostmon", "Violet Inboots"], match: "nameExact" }],
        },
      },
    });
    expect((main.actions[0] as { abortOnDecline?: boolean }).abortOnDecline).toBeUndefined();
    expect(main.actions[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });

    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(turn.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    const subTrigger = turn.actions[0] as { kind: string; event: string; sourceFilter: unknown; actions: unknown[] };
    expect(subTrigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: {
        controller: "mine",
        nameOrTrait: [{ tokens: ["Violet Inboots"], match: "nameExact" }],
      },
    });
    expect(subTrigger.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: true,
      reduceCost: 3,
      optional: true,
      target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
      into: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        and: [
          { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
          { nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
        ],
      },
    });

    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });
});
