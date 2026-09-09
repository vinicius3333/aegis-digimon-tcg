import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-008.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-008", () => {
  it("encodes Training, inherited Raid, and the alternate zero-cost DM evolution", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Raid",
      raw: "＜Raid＞",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]);
  });

  it.each([true, false])("uses inherited Raid to redirect to an opponent's Digimon: redirect=%s", async (redirect) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "host", under: ["EX9-008"] }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "highest" },
          { card: "BT1-010", as: "lower" },
        ],
        security: ["BT1-009"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(decision.kind).toBe("selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: redirect ? [s.perm("highest").topCard.instanceId] : [] },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.security).toHaveLength(redirect ? 1 : 0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      redirect ? ["BT1-010"] : ["BT1-009", "BT1-010"],
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses Training to suspend itself and place the deck top face-down at the bottom of its stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-008", as: "source", under: ["EX9-001"] }], deck: ["BT1-009", "BT1-009"] },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const source = s.perm("source");
    const entry = observe(s.engine)
      .activatableEffects(source)
      .find(({ instanceId }) => instanceId === source.topCard.instanceId);
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.topCard.instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => source.stack.length === 2 && s.state.players[0]!.deck.length === 1);

    expect(source.isSuspended).toBe(true);
    expect(source.stack.map((card) => card.cardId)).toEqual(["BT1-009", "EX9-001"]);
    expect(source.stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not offer Training while suspended or when its deck is empty", async () => {
    const suspended = setupEngine({
      0: { battleArea: [{ card: "EX9-008", as: "source", suspended: true, under: ["EX9-001"] }], deck: ["BT1-009"] },
    });
    await suspended.ready();
    expect(
      observe(suspended.engine)
        .activatableEffects(suspended.perm("source"))
        .some(({ instanceId }) => instanceId === suspended.perm("source").topCard.instanceId),
    ).toBe(false);

    const empty = setupEngine({ 0: { battleArea: [{ card: "EX9-008", as: "source", under: ["EX9-001"] }] } });
    await empty.ready();
    expect(
      observe(empty.engine)
        .activatableEffects(empty.perm("source"))
        .some(({ instanceId }) => instanceId === empty.perm("source").topCard.instanceId),
    ).toBe(false);
  });

  it("digivolves for the alternate zero cost from a level-2 DM host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-003", as: "base" }],
        hand: [{ card: "EX9-008", as: "evo" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX9-008");

    expect(s.perm("base").topCard.cardId).toBe("EX9-008");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX9-003"]);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q4751 does not activate Raid newly inherited after EX9-001 evolves the attacker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-008", as: "attacker", under: ["EX9-001", { card: "BT1-009", faceUp: false }] }],
          hand: ["EX9-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "redirect" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "EX9-009");

    expect(s.perm("attacker").topCard.cardId).toBe("EX9-009");
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
