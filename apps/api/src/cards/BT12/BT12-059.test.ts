import { describe, expect, it } from "vitest";
import {
  drainMicrotasks,
  setupEngine,
  settle,
  type CardSpec,
  type EngineSetup,
  type SetupEngineOptions,
} from "../../engine/testkit/harness.js";
import "./BT12-059.js";

describe("BT12-059 Agumon", () => {
  it("digivolves for 0 from Koromon and rejects another level 2", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT12-003", as: "koromon" }],
        hand: [{ card: "BT12-059", as: "agumon" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("koromon").permanentId,
        instanceId: valid.inst("agumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("koromon").topCard.cardId === "BT12-059");
    expect(valid.state.memory).toBe(0);
    expect(valid.perm("koromon").stack.map(({ cardId }) => cardId)).toEqual(["BT12-003"]);
    expect(valid.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT12-001", as: "gigimon" }], hand: [{ card: "BT12-059", as: "agumon" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("gigimon").permanentId,
        instanceId: invalid.inst("agumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("adds a Greymon Digimon and Tai Kamiya Tamer from the reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-059", as: "agumon" }],
          deck: ["BT1-015", "BT1-085", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT1-015", "BT1-085"]);
  });

  it.each(["BT1-015", "BT1-084"])("gives a Greymon or Omnimon host %s +1000 DP", async (host) => {
    const s = setupEngine({
      0: { battleArea: [{ card: host, as: "host", under: ["BT12-059"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give an unrelated host +1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-059"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("adds the eligible Greymon even when no Tai Kamiya is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-059", as: "agumon" }],
          deck: ["BT1-015", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-015"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-015");
  });

  it("adds a compound-name Tai Kamiya Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-059", as: "agumon" }],
          deck: ["BT5-093", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT5-093"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT5-093"]);
  });
});

describe("BT12-059 Agumon — KB Q&A rulings", () => {
  function revealFixture(deck: CardSpec[], opts: SetupEngineOptions): EngineSetup {
    const s = setupEngine({ 0: { hand: [{ card: "BT12-059", as: "agumon" }], deck } }, opts);
    s.state.memory = 5;
    return s;
  }

  const handIds = (s: EngineSetup): string[] => s.state.players[0]!.hand.map(({ cardId }) => cardId);

  async function playAndAutoResolve(deck: CardSpec[]): Promise<EngineSetup> {
    const s = revealFixture(deck, { autoSelectCards: true, autoOrderTriggers: true, autoOrderCards: true });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await drainMicrotasks();
    expect(s.state.pendingDecision).toBeUndefined();
    return s;
  }

  it("adds the only matching card when just one of the two kinds is revealed (Q2187)", async () => {
    const onlyTamer = await playAndAutoResolve(["BT1-085", "BT1-010", "BT1-009", "BT1-086"]);
    expect(handIds(onlyTamer)).toEqual(["BT1-085"]);

    const onlyDigimon = await playAndAutoResolve(["BT1-084", "BT1-010", "BT1-009", "BT1-086"]);
    expect(handIds(onlyDigimon)).toEqual(["BT1-084"]);

    const neither = await playAndAutoResolve(["BT1-010", "BT1-009", "BT1-086", "BT1-011"]);
    expect(handIds(neither)).toEqual([]);
  });

  it("must add both the Greymon Digimon and the Tai Kamiya Tamer when both are revealed (Q2188)", async () => {
    const s = revealFixture(
      [{ card: "BT1-015", as: "greymon" }, { card: "BT1-085", as: "tai" }, "BT1-009", "BT1-010"],
      { autoOrderTriggers: true, autoOrderCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => s.decisions.length === 1);
    const digimonPick = s.decisions[0]!.req;
    expect(digimonPick.options).toMatchObject({ min: 1, max: 1, candidateInstanceIds: [s.inst("greymon").instanceId] });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: digimonPick.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: digimonPick.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("greymon").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.decisions.length === 2);
    const tamerPick = s.decisions[1]!.req;
    expect(tamerPick.options).toMatchObject({ min: 1, max: 1, candidateInstanceIds: [s.inst("tai").instanceId] });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: tamerPick.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: tamerPick.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("tai").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(handIds(s).sort()).toEqual(["BT1-015", "BT1-085"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
  });

  it("treats Tai Kamiya & Matt Ishida, Tai Kamiya & Kari Kamiya and Tai Kamiya (V-Tamer) as Tai Kamiya Tamers (Q2189)", async () => {
    const s = revealFixture(
      [
        { card: "BT5-093", as: "taiMatt" },
        { card: "BT9-084", as: "taiKari" },
        { card: "P-012", as: "vTamer" },
        { card: "BT1-086", as: "matt" },
      ],
      { autoOrderTriggers: true, autoOrderCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => s.decisions.length === 1);
    const tamerPick = s.decisions[0]!.req;
    expect([...(tamerPick.options?.candidateInstanceIds ?? [])].sort()).toEqual(
      [s.inst("taiMatt").instanceId, s.inst("taiKari").instanceId, s.inst("vTamer").instanceId].sort(),
    );
    expect(tamerPick.options?.candidateInstanceIds).not.toContain(s.inst("matt").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: tamerPick.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("vTamer").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(handIds(s)).toEqual(["P-012"]);
  });
});
