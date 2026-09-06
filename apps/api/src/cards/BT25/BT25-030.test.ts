import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_030 } from "./BT25-030.js";
import "../index.js";

describe("BT25-030 Elecmon", () => {
  it("makes the Start of Your Main Phase memory gain payable by adding top security", () => {
    const effect = BT25_030.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "securityToHand", controller: "mine", count: 1 },
    });
  });

  it("only grants inherited Recovery +1 when the security stack is empty", () => {
    const effect = BT25_030.effects?.find((entry) => entry.isInherited);
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "toHand",
      controller: "mine",
      amount: 1,
      toTop: true,
      optional: true,
    });
    expect(effect?.actions?.[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Recovery", amount: 1 },
      condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "eq", value: 0 },
    });
  });

  it("supports the legal level 2 TS alternate evolution at zero cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-002", as: "tsBase" }],
        hand: [{ card: "BT25-030", as: "elecmon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("elecmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.cardId === "BT25-030");
    expect(s.perm("tsBase").topCard.cardId).toBe("BT25-030");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("rejects the alternate evolution over a level 2 without TS", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "nonTsBase" }], hand: [{ card: "BT25-030", as: "elecmon" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonTsBase").permanentId,
        instanceId: s.inst("elecmon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("elecmon").instanceId }),
    );
  });

  it("naturally pays the start-of-main-phase cost and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-030", as: "elecmon" }],
          security: [{ card: "BT1-001", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.memory === 1 && s.state.players[0]!.security.length === 0);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("security").instanceId }),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("naturally recovers from zero security after the inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-024", as: "host", under: ["BT25-030"] }],
          deck: [{ card: "BT1-001", as: "recovered" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.length === 1 &&
        s.state.players[0]!.security[0]!.instanceId === s.inst("recovered").instanceId,
    );

    expect(s.state.players[0]!.security).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("recovered").instanceId, faceUp: false }),
    );
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not gain memory when the paid start-of-main security cost is declined", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-030", as: "elecmon" }], security: [{ card: "BT1-001", as: "security" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("cannot pay the main-phase cost with an empty security stack", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-030", as: "elecmon" }] } },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
      },
    );
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("accepts inherited security-to-hand then recovers from one security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-024", as: "host", under: ["BT25-030"] }],
          security: [{ card: "BT1-001", as: "security" }],
          deck: [{ card: "BT1-002", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId));
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("security").instanceId }),
    );
    expect(s.state.players[0]!.security).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("recovered").instanceId }),
    );
  });

  it("declining inherited security-to-hand at one security skips Recovery and keeps the card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-024", as: "host", under: ["BT25-030"] }],
          security: [{ card: "BT1-001", as: "security" }],
          deck: [{ card: "BT1-002", as: "deck" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("shares one inherited use across attacks and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-024", as: "host", under: ["BT25-030"] }],
          security: [
            { card: "BT1-001", as: "firstSecurity" },
            { card: "BT1-002", as: "secondSecurity" },
          ],
          deck: [
            { card: "BT1-005", as: "turnDraw" },
            { card: "BT1-006", as: "nextRecovery" },
          ],
        },
        1: {
          security: ["BT1-007", "BT1-008", "BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length >= 1);
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(2);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length >= 2);
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length >= 3);
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(3);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(s.inst("nextRecovery").instanceId);
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("firstSecurity").instanceId }),
    );
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("secondSecurity").instanceId }),
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });
});
