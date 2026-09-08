import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-002.js";
import "../index.js";

describe("BT24-002 Bukamon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-002")).toMatchObject({
      cardId: "BT24-002",
      nameEn: "Bukamon",
      colors: ["Blue"],
      kinds: ["DigiEgg"],
      level: 2,
      types: ["Lesser", "Iliad", "TS"],
    });
  });

  it("unsuspends this Digimon, not an arbitrary blue TS Digimon", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    const action = inherited.actions[0];
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(action).toMatchObject({
      kind: "Unsuspend",
      target: {
        filter: {
          isSelfRef: true,
          colors: ["Blue"],
          nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
        },
        isSelf: true,
      },
      cost: { kind: "payMemory", memory: 1 },
      optional: true,
      abortOnDecline: true,
    });
  });

  it("pays 1 to unsuspend its blue TS host at the end of the turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-022", as: "host", under: ["BT24-002", "BT24-020"], suspended: true }] },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 2;

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("enters a legal host through public egg evolution and then unsuspends it", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-002", as: "egg" },
          hand: [{ card: "BT24-020", as: "host" }],
          deck: [{ card: "BT1-009", as: "evolutionDraw" }, "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011", "BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("host").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolutionDraw").instanceId)).toBe(true);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toContain("BT24-002");
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    // Keep the Lv.3 host alive through the security check; inert Lv.3 fixtures need 20,000 DP.
    s.perm("egg").baseDP = 20_000;
    s.perm("egg").currentDP = 20_000;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("egg").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").isSuspended);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT24-002"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.perm("egg").isSuspended).toBe(false);
    expect(s.state.memory).toBe(-4);
  });

  it("does not offer the effect to a blue non-TS or red TS host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "blueNonTs", under: ["BT24-002"], suspended: true },
            { card: "BT24-011", as: "redTs", under: ["BT24-002"], suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 2;

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("blueNonTs"));
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("redTs"));

    expect(s.perm("blueNonTs").isSuspended).toBe(true);
    expect(s.perm("redTs").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("keeps the host suspended and does not pay when the optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-022", as: "host", under: ["BT24-002", "BT24-020"] }],
          deck: ["BT1-013", "BT1-013"],
        },
        1: {
          security: [{ card: "BT1-009", as: "checked" }],
          battleArea: [{ card: "BT1-014", as: "target", dp: 10000 }],
          deck: ["BT1-013", "BT1-013"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-3);
  });

  it("naturally triggers at the public end of turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-022", as: "host", under: ["BT24-002", "BT24-020"], suspended: true }] },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(-4);
  });

  it("can resolve before the simultaneous Dan Yuki end-turn attack (Q5575)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-022", as: "host", under: ["BT24-002", "BT24-020"], suspended: true },
            { card: "BT24-085", as: "dan" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-014", "BT1-009"],
        },
        1: {
          security: [
            { card: "BT1-009", as: "firstSecurity" },
            { card: "BT1-010", as: "secondSecurity" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstSecurity").instanceId),
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstSecurity").instanceId)).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderTriggers"));
    const ordering = s.decisions.find(({ req }) => req.kind === "orderTriggers")!.req as any;
    expect(ordering.options.triggerKeys.length).toBeGreaterThanOrEqual(2);
    const bukamonKey = ordering.options.triggerKeys.find((key: string) => key.includes("BT24-002"));
    const danKey = ordering.options.triggerKeys.find((key: string) => key.includes("BT24-085"));
    expect(bukamonKey).toBeDefined();
    expect(danKey).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderTriggers", order: [bukamonKey] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    // Bukamon resolves first, then Dan's effect makes that same host attack,
    // leaving it suspended again.
    expect(s.perm("host").isSuspended).toBe(true);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("host"))).toBe(true);
    expect(s.perm("dan").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("secondSecurity").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(-4);
    await turn;
  });

  it("resets the inherited once-per-turn effect on the next real owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-022", as: "host", under: ["BT24-002", "BT24-020"] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009", "BT1-010", "BT1-014", "BT1-009"],
        },
        1: {
          security: ["BT1-009", "BT1-010", "BT1-014"],
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: [{ card: "BT1-010", as: "spareOpponent" }],
          deck: ["BT1-009", "BT1-010", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(-4);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(-4);
  });
});
