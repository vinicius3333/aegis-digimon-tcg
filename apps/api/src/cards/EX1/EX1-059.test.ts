import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-059.js";

describe("EX1-059 Ogremon", () => {
  it("may trash a card when attacking to gain Security Attack +1 for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-059", as: "ogremon" }],
          hand: [{ card: "BT1-009", as: "cost" }, "BT1-009"],
        },
        1: {
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-009", "BT1-010", "BT1-011"],
          battleArea: [{ card: "ST1-06", as: "blocker" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ogremon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(observe(s.engine).keywordAmount(s.perm("ogremon"), "SecurityAttack")).toBe(1);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(s.perm("ogremon"), "SecurityAttack")).toBe(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).keywordAmount(s.perm("ogremon"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("inherited may trash a card when attacking to give its host +2000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-060", as: "host", under: ["EX1-059"] }],
          hand: [{ card: "BT1-009", as: "cost" }, "BT1-009"],
        },
        1: {
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-009", "BT1-010", "BT1-011"],
          battleArea: [{ card: "ST1-06", as: "blocker" }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.perm("host").currentDP).toBe(9000);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("host").currentDP).toBe(9000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may refuse the Security Attack cost without changing security or trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-059", as: "ogremon" }], hand: [{ card: "BT1-009", as: "cost" }] },
        1: { hand: ["BT1-009"], deck: ["BT1-010", "BT1-011"], security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ogremon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.security.length === 2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(observe(s.engine).keywordAmount(s.perm("ogremon"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may refuse the inherited DP cost without changing battle results", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-060", as: "host", under: ["EX1-059"] }],
          hand: [{ card: "BT1-009", as: "cost" }],
        },
        1: {
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011"],
          battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 8000 }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(8000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("resolves independent optional effects across two legal attackers in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-059", as: "ogremon" },
            { card: "EX1-060", as: "host", under: ["EX1-059"] },
          ],
          hand: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-009", "BT1-010"],
          battleArea: [{ card: "ST1-06", as: "blocker" }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ogremon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const ownOptional = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({ kind: "optional", sourceCardId: "EX1-059" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ownOptional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(observe(s.engine).keywordAmount(s.perm("ogremon"), "SecurityAttack")).toBe(1);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.security.length === 2);
    expect(s.state.players[0]!.trash).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const inheritedOptional = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({ kind: "optional", sourceCardId: "EX1-059" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: inheritedOptional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "blockWindowOpened").length >= 2);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.perm("host").currentDP).toBe(7000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
