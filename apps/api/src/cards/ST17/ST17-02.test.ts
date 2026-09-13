import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-02 Terriermon", () => {
  it("plays a green Tamer from hand with its play cost reduced by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-02", as: "terriermon" }],
          hand: [{ card: "ST17-10", as: "henry" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effects = JSON.parse(s.perm("terriermon").activatableEffectsJson) as Array<{
      effectKey: string;
      timing: string;
    }>;
    const key = effects[0]!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("terriermon").topCard.instanceId,
        effectKey: key,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-10"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-10")).toBe(true);
    expect(s.state.memory).toBe(9);
  });

  it("gives its suspended host +1000 DP through the inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-04", as: "host", suspended: true, under: ["ST17-02"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("accepts the public Gummymon alternate evolution for 0 memory and preserves the stack", async () => {
    const s = setupEngine({
      0: { breeding: { card: "ST17-01", as: "base" }, hand: [{ card: "ST17-02", as: "terriermon" }] },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("terriermon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST17-02");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["ST17-01"]);

    const invalid = setupEngine({
      0: { breeding: { card: "BT1-001", as: "wrongBase" }, hand: [{ card: "ST17-02", as: "terriermon" }] },
    });
    invalid.state.memory = 0;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("wrongBase").permanentId,
        instanceId: invalid.inst("terriermon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });

  it("offers only green Tamers and level-3 Lopmon-name Digimon, and allows declining the Main effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-02", as: "terriermon" }],
          hand: [
            { card: "ST17-10", as: "greenTamer" },
            { card: "ST17-03", as: "lopmon" },
            { card: "BT1-009", as: "wrongName" },
            { card: "BT1-085", as: "wrongColorTamer" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;
    await s.ready();
    const effects = JSON.parse(s.perm("terriermon").activatableEffectsJson) as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("terriermon").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["ST17-10", "ST17-03", "BT1-009", "BT1-085"]);
    expect(observe(s.engine).hasKeyword(s.perm("terriermon").permanentId, "Alliance")).toBe(false);
  });

  it("rejects a second Main activation in one turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-02", as: "terriermon" }],
          hand: [
            { card: "EX4-034", as: "lopmon1" },
            { card: "EX4-034", as: "lopmon2" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { hand: [{ card: "BT1-009" }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const firstKey = (JSON.parse(s.perm("terriermon").activatableEffectsJson) as Array<{ effectKey: string }>)[0]!
      .effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("terriermon").topCard.instanceId,
        effectKey: firstKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "EX4-034"));
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("terriermon").topCard.instanceId,
        effectKey: firstKey,
      }),
    ).toMatchObject({ ok: false });
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.memory = -s.state.memory;
    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.memory = -s.state.memory;
    s.state.turnSeat = 0;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const nextKey = (JSON.parse(s.perm("terriermon").activatableEffectsJson) as Array<{ effectKey: string }>)[0]!
      .effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("terriermon").topCard.instanceId,
        effectKey: nextKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.filter((perm) => perm.topCard.cardId === "EX4-034").length === 2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("filters the accepted Main alternatives by color, level, and Lopmon name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-02", as: "terriermon" }],
          hand: [
            { card: "ST17-10", as: "greenTamer" },
            { card: "ST17-03", as: "lopmon" },
            { card: "BT1-009", as: "wrongName" },
            { card: "BT1-085", as: "wrongColorTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 10;
    await s.ready();
    const effects = JSON.parse(s.perm("terriermon").activatableEffectsJson) as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("terriermon").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const candidates = s.decisions.at(-1)!.req.options?.candidateInstanceIds ?? [];
    expect(candidates).toEqual(expect.arrayContaining([s.inst("greenTamer").instanceId, s.inst("lopmon").instanceId]));
    expect(candidates).not.toContain(s.inst("wrongName").instanceId);
    expect(candidates).not.toContain(s.inst("wrongColorTamer").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("lopmon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-03"),
    );
  });
});
