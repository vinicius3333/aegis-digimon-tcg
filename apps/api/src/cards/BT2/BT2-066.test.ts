import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-066.js";

describe("BT2-066 Machinedramon", () => {
  it("de-digivolves two opposing Digimon by two cards on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT2-066", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-084", as: "targetA", under: ["BT1-010", "BT1-017", "BT1-023"] },
            { card: "BT1-084", as: "targetB", under: ["BT1-029", "BT1-036", "BT1-041"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("targetA").stack.length === 1 && s.perm("targetB").stack.length === 1);

    expect([s.perm("targetA").stack.length, s.perm("targetB").stack.length]).toEqual([1, 1]);
    expect(s.state.players[1]!.trash).toHaveLength(4);
  });

  it("de-digivolves the only opposing Digimon when fewer than two targets exist", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT2-066", as: "source" }] },
        1: { battleArea: [{ card: "BT1-084", as: "target", under: ["BT1-010", "BT1-017", "BT1-023"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("stops de-digivolving when the target becomes level 3", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT2-066", as: "source" }] },
        1: { battleArea: [{ card: "BT1-017", as: "target", under: ["BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.cardId === "BT1-010");

    expect(getCardDefinition(s.perm("target").topCard.cardId)!.level).toBe(3);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("has Blocker and may redirect an opponent's attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT2-066", as: "machinedramon" }],
        security: ["BT1-011"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("machinedramon"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("machinedramon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.perm("machinedramon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
