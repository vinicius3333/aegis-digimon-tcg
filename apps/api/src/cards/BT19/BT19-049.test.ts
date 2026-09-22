import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const DECK = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

describe("BT19-049 Gargomon", () => {
  it("matches the catalog print", () => {
    expect(getCardDefinition("BT19-049")).toMatchObject({
      cardId: "BT19-049",
      nameEn: "Gargomon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beastkin"],
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      effectText:
        "[When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Henry Wong] from your hand without paying the cost.",
      inheritedEffectText: "[When Attacking] [Once Per Turn] Suspend 1 of your opponent's Digimon.",
    });
  });

  it("compiles the bracketed name as an EXACT gate and the inherited clause as Once Per Turn", () => {
    const compiled = runtimeCompiledCard("BT19-049");
    expect(compiled?.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          payCost: false,
          optional: true,
          target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Henry Wong"], match: "nameExact" }] } },
          from: ["hand"],
          condition: { kind: "permanentCount", op: "lte", value: 1, filter: { controller: "mine", kind: ["Tamer"] } },
        },
      ],
    });
    expect(compiled?.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }],
    });
  });

  it.each([
    ["no Tamer", [] as string[]],
    ["exactly 1 Tamer (the boundary)", ["BT19-081"]],
  ])("digivolves for 2 memory with %s and plays [Henry Wong] free", async (_label, tamers) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "base" }, ...tamers.map((card) => ({ card }))],
          hand: [
            { card: "BT19-049", as: "gargo" },
            { card: "BT19-085", as: "henry" },
          ],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: SECURITY,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gargo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-085"));
    await drainMicrotasks(80);

    expect(s.perm("base").topCard?.cardId).toBe("BT19-049");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    const henry = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-085");
    expect(henry?.topCard!.instanceId).toBe(s.inst("henry").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("does not play Henry Wong when you already control 2 Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "base" }, { card: "BT19-081" }, { card: "BT19-083" }],
          hand: [
            { card: "BT19-049", as: "gargo" },
            { card: "BT19-085", as: "henry" },
          ],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: SECURITY,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gargo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-049");
    await drainMicrotasks(120);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("henry").instanceId,
      s.inst("evoDraw").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT19-085")).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it("cannot play [Henry Wong & Shu-Chong Wong] as [Henry Wong] (Q3104)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "base" }],
          hand: [
            { card: "BT19-049", as: "gargo" },
            { card: "EX4-063", as: "pair" },
          ],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: SECURITY,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gargo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-049");
    await drainMicrotasks(120);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("pair").instanceId,
      s.inst("evoDraw").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "EX4-063")).toHaveLength(0);
  });

  it("leaves Henry Wong in hand when the optional play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "base" }],
          hand: [
            { card: "BT19-049", as: "gargo" },
            { card: "BT19-085", as: "henry" },
          ],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: SECURITY,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gargo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-049");
    await drainMicrotasks(120);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("henry").instanceId,
      s.inst("evoDraw").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it.each([
    ["a Green Lv.4 (level too high)", "BT1-071"],
    ["a Red Lv.3 (wrong colour)", "BT1-012"],
  ])("refuses %s as a digivolution source", async (_label, sourceCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: sourceCard, as: "base" }],
          hand: [
            { card: "BT19-049", as: "gargo" },
            { card: "BT19-085", as: "henry" },
          ],
          deck: DECK,
          security: SECURITY,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gargo").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard?.cardId).toBe(sourceCard);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT19-085")).toHaveLength(0);
  });

  it("suspends exactly one opponent Digimon per turn from a real host and resets on the next own turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-050", as: "host", under: ["BT19-049"], dp: 20_000 }],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT1-011", as: "first" },
            { card: "BT1-012", as: "second" },
            { card: "BT19-081", as: "tamer" },
          ],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("first").topCard!.instanceId);
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(false);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    preferred.length = 0;
    preferred.push(s.perm("second").permanentId, s.perm("second").topCard!.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("second").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("second").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may choose an ALREADY suspended opponent Digimon (comprehensive 15-15-5-1/-3, Q845, Q1219)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-050", as: "host", under: ["BT19-049"] }],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT1-011", as: "already", suspended: true },
            { card: "BT1-012", as: "fresh" },
          ],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("already").permanentId, s.perm("already").topCard!.instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const offered = s.decisions.filter(
      (entry) =>
        entry.req.kind === "chooseTargets" &&
        entry.req.options?.candidateInstanceIds?.includes(s.perm("already").permanentId) === true,
    );
    expect(offered).toHaveLength(1);
    expect(offered[0]!.req.options?.candidateInstanceIds).toEqual([
      s.perm("already").permanentId,
      s.perm("fresh").permanentId,
    ]);
    expect(s.perm("already").isSuspended).toBe(true);
    expect(s.perm("fresh").isSuspended).toBe(false);
  });

  it("does not suspend anything when BT19-049 is not among the host's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-050", as: "host", under: ["BT1-064"] }],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-011", as: "peer" }],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("peer").isSuspended).toBe(false);
  });
});
