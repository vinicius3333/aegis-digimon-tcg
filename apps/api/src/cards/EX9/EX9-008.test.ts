import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-008.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-008", () => {
  it.each([true, false])("resolves inherited Raid with explicit redirect choice %s", async (redirect) => {
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

  it("has Training and inherits Raid", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Raid",
      raw: "＜Raid＞",
    });
  });

  it("uses Training to suspend itself and place the deck top face-down at the bottom of its stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-008", as: "source", under: ["EX9-001"] }], deck: ["BT1-001", "BT1-002"] },
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
    expect(source.stack.map((card) => card.cardId)).toEqual(["BT1-001", "EX9-001"]);
    expect(source.stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-002"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
