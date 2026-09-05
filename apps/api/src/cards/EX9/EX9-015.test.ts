import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-015.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-015", () => {
  it("has Training and inherits once-per-turn trashing 1 digivolution card from an opposing Digimon when attacking", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "TrashDigivolution", amount: 1, target: { count: 1, filter: { digivolutionCards: "hasAny" } } },
      ],
    });
  });

  it("uses Training to place the deck top face-down at the bottom of its stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-015", as: "source", under: ["EX9-002"] }], deck: ["BT1-001", "BT1-002"] },
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
    expect(source.stack.map((card) => card.cardId)).toEqual(["BT1-001", "EX9-002"]);
    expect(source.stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-002"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("trashes only the bottom source and cannot repeat the effect on a second attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-037", as: "source", under: ["EX9-015"] }] },
        1: {
          battleArea: [{ card: "ST1-10", as: "target", under: ["BT1-009", "BT1-015", "BT1-024"] }],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const source = s.perm("source");
    const target = s.perm("target");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(target.stack.map(({ cardId }) => cardId)).toEqual(["BT1-015", "BT1-024"]);
    expect(target.topCard.cardId).toBe("ST1-10");
    expect(s.state.players[1]!.security).toHaveLength(1);
    await advance(s.engine).verb.unsuspend([source.permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(target.stack.map(({ cardId }) => cardId)).toEqual(["BT1-015", "BT1-024"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === source.permanentId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
