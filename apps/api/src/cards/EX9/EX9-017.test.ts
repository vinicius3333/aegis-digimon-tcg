import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-017.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX9-017", () => {
  it("has Training and trashes 1 opposing digivolution card by placing a card from hand face-down underneath on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 1,
      scope: "acrossDigimon",
      scaling: { unit: "selfFaceDownDigivolutionCards", per: 1 },
      cost: { kind: "place", destination: "digivolutionStack", faceDown: true },
    });
  });
  it("inherits Jamming", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Jamming",
      raw: "＜Jamming＞",
    }));

  it("uses Training to suspend itself and place the deck top face-down at the bottom of its stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-017", as: "source", under: ["EX9-014"] }], deck: ["BT1-009"] },
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
    await settle(() => source.stack.length === 2 && s.state.players[0]!.deck.length === 0);

    expect(source.isSuspended).toBe(true);
    expect(source.stack.some((card) => card.cardId === "BT1-009" && card.faceUp === false)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("trashes one opposing digivolution card after a real play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-017", as: "source" }, "EX9-072"] },
        1: { battleArea: [{ card: "BT1-009", as: "target", under: ["EX9-070"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea[0]!.stack.length === 0);

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]).toMatchObject({ cardId: "EX9-072", faceUp: false });
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("trashes across opposing Digimon once per face-down source on a real evolution (Q4758)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-014", as: "base", under: [{ card: "EX9-070", faceUp: false }] }],
          hand: [{ card: "EX9-017", as: "source" }, "EX9-072"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target-a", under: ["EX9-070"] },
            { card: "BT1-010", as: "target-b", under: ["EX9-071"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX9-017");

    expect(s.perm("base").stack).toHaveLength(3);
    expect(s.perm("base").stack.filter((card) => card.faceUp !== true)).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.every((permanent) => permanent.stack.length === 0)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits Jamming through a legal EX9-014 to EX9-017 to neutral host stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-014", as: "base" }],
        hand: [
          { card: "EX9-017", as: "source" },
          { card: "BT1-038", as: "host" },
        ],
      },
      1: { security: ["BT1-021"] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX9-017");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-038");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX9-014", "EX9-017"]);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
